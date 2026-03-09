"""
api/posts.py
────────────
All routes under the /posts prefix (registered in main.py).

Endpoints
─────────
  POST   /posts              – create a text (+ optional media) post
  GET    /posts              – list posts (newest first, paginated)
  GET    /posts/<id>         – single post detail
  POST   /posts/<id>/like    – toggle like / unlike
  POST   /posts/media        – upload an image or video file
  GET    /posts/media/<file> – serve an uploaded media file
  DELETE /posts/<id>         – delete own post

All write endpoints require a valid JWT (Authorization: Bearer <token>).
Media files are stored in uploads/posts/ and served publicly.
"""

import os
import json
import time

from flask import (
    Blueprint,
    request,
    jsonify,
    current_app,
    send_from_directory,
)
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from PIL import Image, UnidentifiedImageError
from sqlalchemy.exc import IntegrityError

from models.user import db, User
from models.post import Post, PostLike


# ─── Blueprint ────────────────────────────────────────────────────────────────
posts_bp = Blueprint('posts', __name__)

# ─── Constants ────────────────────────────────────────────────────────────────

# Allowed image extensions and their MIME types
ALLOWED_IMAGE_EXT  = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
# Allowed video extensions (we don't re-encode – just store as-is)
ALLOWED_VIDEO_EXT  = {'mp4', 'mov', 'webm', 'avi', 'mkv'}
ALLOWED_MEDIA_EXT  = ALLOWED_IMAGE_EXT | ALLOWED_VIDEO_EXT

MAX_IMAGE_BYTES = 10 * 1024 * 1024   # 10 MB for images
MAX_VIDEO_BYTES = 50 * 1024 * 1024   # 50 MB for videos
MAX_CONTENT_LEN = 3000               # characters in post body

# Image will be resized to fit within this square (preserves aspect ratio)
MAX_IMAGE_DIM = 1200


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _ext(filename: str) -> str:
    """Return the lowercased extension of filename, without the dot."""
    return filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''


def _allowed(filename: str) -> bool:
    return _ext(filename) in ALLOWED_MEDIA_EXT


def _is_image(filename: str) -> bool:
    return _ext(filename) in ALLOWED_IMAGE_EXT


def _posts_upload_folder() -> str:
    """Absolute path to uploads/posts/ directory."""
    base = current_app.config['UPLOAD_FOLDER']          # e.g. /app/backend/uploads
    folder = os.path.join(base, 'posts')
    os.makedirs(folder, exist_ok=True)
    return folder


def _process_image(stream, save_path: str) -> None:
    """
    Open image, convert to RGB, resize to fit within MAX_IMAGE_DIM × MAX_IMAGE_DIM,
    then save as JPEG (quality 85, optimised).

    Same logic as the profile image processor – see api/profile.py for detailed
    comments on each step.
    """
    img = Image.open(stream)
    if img.mode in ('RGBA', 'LA'):
        bg = Image.new('RGB', img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[-1])
        img = bg
    elif img.mode == 'P':
        img = img.convert('RGBA').convert('RGB')
    elif img.mode != 'RGB':
        img = img.convert('RGB')

    img.thumbnail((MAX_IMAGE_DIM, MAX_IMAGE_DIM), Image.LANCZOS)
    img.save(save_path, format='JPEG', quality=85, optimize=True)


def _validate_content(content: str) -> str | None:
    """Return an error string if content is invalid, else None."""
    if not content or not content.strip():
        return 'Post content cannot be empty.'
    if len(content) > MAX_CONTENT_LEN:
        return f'Post content cannot exceed {MAX_CONTENT_LEN} characters.'
    return None


def _user_liked(post_id: int, user_id: int) -> bool:
    """True if user_id has liked post_id."""
    return PostLike.query.filter_by(
        post_id=post_id, user_id=user_id
    ).first() is not None


# ─── Routes ───────────────────────────────────────────────────────────────────


# ── Media upload (must be defined BEFORE /posts/<id> to avoid route conflict) ─

@posts_bp.route('/media', methods=['POST'])
@jwt_required()
def upload_media():
    """
    POST /posts/media
    ─────────────────
    Upload an image or video for use in a post.
    The frontend uploads the file here first, receives the URL,
    then includes the URL in the POST /posts body.

    Request: multipart/form-data with field 'file'.

    Pipeline (images):
      1. Validate extension is in ALLOWED_MEDIA_EXT
      2. Validate size (10 MB images, 50 MB videos)
      3. For images: verify with Pillow, resize, save as JPEG
      4. For videos: save as-is with secure filename
      5. Return { url, media_type }

    Response 200:
      { "url": "http://localhost:5000/posts/media/post_media_1_1700000.jpg",
        "media_type": "image" }
    """
    user_id = int(get_jwt_identity())

    if 'file' not in request.files:
        return jsonify({'error': 'No file field named "file" in request.'}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'No file selected.'}), 400

    if not _allowed(file.filename):
        return jsonify({
            'error': f'Invalid file type. Allowed: {", ".join(sorted(ALLOWED_MEDIA_EXT))}'
        }), 400

    is_image = _is_image(file.filename)
    max_bytes = MAX_IMAGE_BYTES if is_image else MAX_VIDEO_BYTES

    # Size check: seek to end to count bytes, then reset
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    limit_mb = max_bytes // (1024 * 1024)
    if size > max_bytes:
        return jsonify({'error': f'File too large. Max {limit_mb} MB for this type.'}), 400

    # For images: verify it's really an image (Pillow reads the header only)
    if is_image:
        try:
            Image.open(file).verify()
            file.seek(0)
        except (UnidentifiedImageError, Exception):
            return jsonify({'error': 'Invalid or corrupted image file.'}), 400

    # Build a safe, unique filename
    timestamp    = int(time.time())
    ext          = 'jpg' if is_image else _ext(file.filename)
    save_name    = secure_filename(f'post_media_{user_id}_{timestamp}.{ext}')
    folder       = _posts_upload_folder()
    save_path    = os.path.join(folder, save_name)

    try:
        if is_image:
            _process_image(file, save_path)     # resize + convert
        else:
            file.save(save_path)                # video: save as-is
    except Exception as exc:
        return jsonify({'error': f'File processing failed: {exc}'}), 500

    # Build the public URL the frontend can embed in <img> or <video>
    url = f"{request.host_url.rstrip('/')}/posts/media/{save_name}"
    return jsonify({
        'url':        url,
        'media_type': 'image' if is_image else 'video',
        'message':    'Media uploaded successfully.',
    }), 200


@posts_bp.route('/media/<filename>', methods=['GET'])
def serve_media(filename: str):
    """
    GET /posts/media/<filename>
    ───────────────────────────
    Publicly serve an uploaded post media file.
    secure_filename() strips path-traversal characters like '../'.
    """
    safe = secure_filename(filename)
    folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'posts')
    return send_from_directory(folder, safe)


# ── Post CRUD ─────────────────────────────────────────────────────────────────

@posts_bp.route('', methods=['POST'])
@jwt_required()
def create_post():
    """
    POST /posts
    ───────────
    Create a new post.

    Request JSON body:
      {
        "content":    "text of the post (required, max 3000 chars)",
        "media_url":  "http://…/posts/media/filename.jpg" (optional),
        "media_type": "image" | "video"                   (optional),
        "tags":       ["python", "flask"]                  (optional)
      }

    Flow:
      1. Parse + validate JSON body.
      2. Validate content length.
      3. Validate tags (max 10, each max 30 chars).
      4. Insert Post row.
      5. Bump user.posts_count in UserProfile (if it exists).
      6. Return the created post.

    Response 201: { "post": { ...post dict... }, "message": "..." }
    Response 400: { "error": "..." }
    """
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found.'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'JSON body required.'}), 400

    # ── Validate content ──────────────────────────────────────────────────
    content = (data.get('content') or '').strip()
    err     = _validate_content(content)
    if err:
        return jsonify({'error': err}), 400

    # ── Validate optional tags ────────────────────────────────────────────
    raw_tags = data.get('tags', [])
    if not isinstance(raw_tags, list):
        return jsonify({'error': 'tags must be a list of strings.'}), 400
    if len(raw_tags) > 10:
        return jsonify({'error': 'Cannot add more than 10 tags.'}), 400
    tags = [str(t).strip().lstrip('#')[:30] for t in raw_tags if str(t).strip()]

    # ── Validate optional media fields ────────────────────────────────────
    media_url  = data.get('media_url',  '') or ''
    media_type = data.get('media_type', '') or ''
    if media_type and media_type not in ('image', 'video'):
        return jsonify({'error': 'media_type must be "image" or "video".'}), 400

    # ── Create the Post row ───────────────────────────────────────────────
    post = Post(
        user_id    = user_id,
        content    = content,
        media_url  = media_url  or None,
        media_type = media_type or None,
        tags       = json.dumps(tags) if tags else None,
    )
    db.session.add(post)

    # Bump the posts_count on the extended profile (if it exists)
    # Import here to avoid a circular import at module level
    from models.profile import UserProfile
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    if profile:
        profile.posts_count = (profile.posts_count or 0) + 1

    db.session.commit()
    return jsonify({'post': post.to_dict(), 'message': 'Post created successfully.'}), 201


@posts_bp.route('', methods=['GET'])
@jwt_required()
def list_posts():
    """
    GET /posts?page=1&per_page=20
    ──────────────────────────────
    Return a paginated list of posts, newest first.

    Query parameters:
      page     – page number (default 1)
      per_page – results per page (default 20, max 50)

    For each post we also check whether the requesting user has liked it
    so the frontend can render the correct heart state.

    Response 200:
      {
        "posts":    [ ...post dicts... ],
        "total":    123,
        "page":     1,
        "per_page": 20,
        "pages":    7
      }
    """
    user_id  = int(get_jwt_identity())
    page     = max(1, request.args.get('page',     1,  type=int))
    per_page = min(50, request.args.get('per_page', 20, type=int))

    # Paginate: newest posts first
    pagination = (
        Post.query
        .order_by(Post.created_at.desc())   # DESC = newest first
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    # For each post build its dict, passing liked_by_user so the frontend
    # can pre-fill the heart icon state without a second request.
    posts_data = [
        p.to_dict(liked_by_user=_user_liked(p.id, user_id))
        for p in pagination.items
    ]

    return jsonify({
        'posts':    posts_data,
        'total':    pagination.total,
        'page':     pagination.page,
        'per_page': pagination.per_page,
        'pages':    pagination.pages,
    }), 200


@posts_bp.route('/<int:post_id>', methods=['GET'])
@jwt_required()
def get_post(post_id: int):
    """
    GET /posts/<post_id>
    ─────────────────────
    Return a single post by ID. 404 if not found.
    """
    user_id = int(get_jwt_identity())
    post = Post.query.get(post_id)
    if not post:
        return jsonify({'error': 'Post not found.'}), 404
    return jsonify({'post': post.to_dict(liked_by_user=_user_liked(post_id, user_id))}), 200


@posts_bp.route('/<int:post_id>/like', methods=['POST'])
@jwt_required()
def toggle_like(post_id: int):
    """
    POST /posts/<post_id>/like
    ──────────────────────────
    Toggle the like state for the requesting user on a post.

    Logic:
      • If the user has NOT yet liked the post → INSERT a PostLike row
        and increment Post.likes_count.
      • If the user HAS already liked the post → DELETE the PostLike row
        and decrement Post.likes_count (min 0).

    Response 200: { "liked": true/false, "likes_count": 5 }
    """
    user_id = int(get_jwt_identity())
    post    = Post.query.get(post_id)
    if not post:
        return jsonify({'error': 'Post not found.'}), 404

    existing = PostLike.query.filter_by(post_id=post_id, user_id=user_id).first()

    if existing:
        # Already liked → unlike
        db.session.delete(existing)
        post.likes_count = max(0, (post.likes_count or 1) - 1)
        liked = False
    else:
        # Not liked yet → like
        like = PostLike(post_id=post_id, user_id=user_id)
        db.session.add(like)
        post.likes_count = (post.likes_count or 0) + 1
        liked = True

    try:
        db.session.commit()
    except IntegrityError:
        # Race condition: another request liked at the same time – ignore
        db.session.rollback()
        liked = True

    return jsonify({'liked': liked, 'likes_count': post.likes_count}), 200


@posts_bp.route('/<int:post_id>', methods=['DELETE'])
@jwt_required()
def delete_post(post_id: int):
    """
    DELETE /posts/<post_id>
    ───────────────────────
    Delete a post. Only the author can delete their own post.

    Response 200: { "message": "Post deleted." }
    Response 403: { "error": "Not authorised." }
    Response 404: { "error": "Post not found." }
    """
    user_id = int(get_jwt_identity())
    post    = Post.query.get(post_id)

    if not post:
        return jsonify({'error': 'Post not found.'}), 404
    if post.user_id != user_id:
        return jsonify({'error': 'Not authorised to delete this post.'}), 403

    # Delete all likes first (FK constraint) then the post
    PostLike.query.filter_by(post_id=post_id).delete()
    db.session.delete(post)

    # Decrement profile posts_count
    from models.profile import UserProfile
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    if profile:
        profile.posts_count = max(0, (profile.posts_count or 1) - 1)

    db.session.commit()
    return jsonify({'message': 'Post deleted.'}), 200
