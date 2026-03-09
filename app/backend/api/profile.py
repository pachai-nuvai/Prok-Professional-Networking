"""
api/profile.py
──────────────
Blueprint that handles all /profile routes:

  GET  /profile           – return the authenticated user's full profile
  PUT  /profile           – update profile fields (JSON body)
  POST /profile/image     – upload a profile photo (multipart/form-data)

Security:
  • Every route requires a valid JWT (Authorization: Bearer <token>).
  • Image uploads are validated for type (Pillow), size (5 MB max), and
    processed/resized before saving to disk.
  • Rate limiting is applied via Flask-Limiter (set up in main.py).
"""

import os                                     # file path operations
import json                                   # encode/decode JSON
import time                                   # timestamp for unique filenames

from flask import (
    Blueprint,            # groups related routes into a reusable module
    request,              # gives access to incoming HTTP request data
    jsonify,              # converts Python dicts to JSON HTTP responses
    current_app,          # proxy to the Flask app (used to read config)
    send_from_directory,  # safely sends a file from a directory
)
from flask_jwt_extended import jwt_required, get_jwt_identity
# jwt_required  → decorator that blocks unauthenticated requests
# get_jwt_identity → extracts the user_id stored inside the JWT token

from werkzeug.utils import secure_filename
# secure_filename strips dangerous characters from user-supplied filenames
# e.g. "../../../etc/passwd" → "etc_passwd"  (prevents path traversal attacks)

from PIL import Image, UnidentifiedImageError
# Pillow is a Python imaging library.
# Image        → open, resize, convert, save images
# UnidentifiedImageError → raised when a file is not a valid image

from models.user import User, db       # User ORM model + SQLAlchemy db instance
from models.profile import UserProfile  # extended profile ORM model


# ─── Blueprint ────────────────────────────────────────────────────────────────
# A Blueprint is Flask's way of grouping related routes.
# url_prefix='/profile' is added in main.py when the blueprint is registered.
profile_bp = Blueprint('profile', __name__)


# ─── Constants ────────────────────────────────────────────────────────────────

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
# Allowed image file extensions; kept as a set for O(1) lookup

MAX_IMAGE_BYTES = 5 * 1024 * 1024   # 5 MB in bytes  (5 × 1024 × 1024)
MAX_IMAGE_DIM   = 800                # max width OR height after resize (pixels)


# ─── Private Helpers ──────────────────────────────────────────────────────────

def _get_or_create_profile(user_id: int) -> UserProfile:
    """
    Return the UserProfile row for user_id.
    If no row exists yet, create a blank one (auto-profile on first access).
    We use db.session.flush() to write the new row to the DB connection without
    committing yet – the calling function decides when to commit.
    """
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    if not profile:                         # first time this user accesses profile
        profile = UserProfile(user_id=user_id)
        db.session.add(profile)             # queue the INSERT
        db.session.flush()                  # send to DB, but don't commit yet
    return profile


def _validate_profile_data(data: dict) -> str | None:
    """
    Validate all incoming profile fields.
    Returns an error message string if something is wrong, or None if all OK.

    Validation rules:
      bio      – optional, max 500 characters
      title    – optional, max 80 characters
      location – optional, max 100 characters
      phone    – optional, max 30 characters
      skills   – optional, must be a list, max 20 items, each item max 50 chars
    """
    bio = data.get('bio')
    if bio is not None and len(str(bio)) > 500:
        return 'Bio cannot exceed 500 characters.'

    title = data.get('title')
    if title is not None and len(str(title)) > 80:
        return 'Title cannot exceed 80 characters.'

    location = data.get('location')
    if location is not None and len(str(location)) > 100:
        return 'Location cannot exceed 100 characters.'

    phone = data.get('phone')
    if phone is not None and len(str(phone)) > 30:
        return 'Phone number cannot exceed 30 characters.'

    skills = data.get('skills')
    if skills is not None:
        if not isinstance(skills, list):
            return 'Skills must be a list.'
        if len(skills) > 20:
            return 'Cannot have more than 20 skills.'
        for skill in skills:
            if len(str(skill)) > 50:
                return 'Each skill cannot exceed 50 characters.'

    return None   # everything is valid


def _allowed_file(filename: str) -> bool:
    """
    Return True only if the filename has an allowed image extension.
    '.' in filename ensures there IS an extension.
    rsplit('.', 1)[1] splits from the right, once → gets the extension part.
    .lower() normalises 'JPG', 'Jpg', etc. to 'jpg'.
    """
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _process_and_save(file_stream, save_path: str) -> None:
    """
    Open the uploaded image with Pillow, optionally resize it so neither
    dimension exceeds MAX_IMAGE_DIM, convert to RGB, and save as JPEG.

    Why convert everything to JPEG?
      • Consistent format on disk (no mixed png/gif/webp).
      • JPEG compression keeps file sizes small.
      • 'quality=85' is a good balance between quality and size.
      • 'optimize=True' runs an extra pass to squeeze a few more bytes out.

    Why convert to RGB first?
      PNG with transparency (RGBA), palette images (P), and grayscale (L)
      can't be saved as JPEG directly – JPEG only supports RGB.
      We composite transparent images onto a white background.
    """
    img = Image.open(file_stream)      # open the uploaded file

    # ── Colour-mode conversion ──────────────────────────────────────────────
    if img.mode in ('RGBA', 'LA'):
        # Image has an alpha (transparency) channel.
        # Create a plain white background the same size as the image.
        background = Image.new('RGB', img.size, (255, 255, 255))
        # Paste the image onto the background, using the alpha channel as mask.
        # img.split()[-1] extracts just the alpha channel.
        background.paste(img, mask=img.split()[-1])
        img = background
    elif img.mode == 'P':
        # Palette-based image (e.g. GIF) – convert to RGBA first, then RGB.
        img = img.convert('RGBA').convert('RGB')
    elif img.mode != 'RGB':
        # Handles 'L' (grayscale), 'CMYK', etc.
        img = img.convert('RGB')

    # ── Resize ──────────────────────────────────────────────────────────────
    # thumbnail() scales the image DOWN to fit within (MAX_IMAGE_DIM, MAX_IMAGE_DIM)
    # while preserving the aspect ratio. It never upscales.
    # Image.LANCZOS is the best-quality downscaling filter.
    img.thumbnail((MAX_IMAGE_DIM, MAX_IMAGE_DIM), Image.LANCZOS)

    # ── Save ────────────────────────────────────────────────────────────────
    img.save(save_path, format='JPEG', quality=85, optimize=True)


# ─── Routes ───────────────────────────────────────────────────────────────────


@profile_bp.route('', methods=['GET'])
@jwt_required()
def get_profile():
    """
    GET /profile
    ────────────
    Returns the full profile of the logged-in user.

    Flow:
      1. Extract user_id from the JWT token.
      2. Look up the User row in the DB.
      3. Auto-create an extended UserProfile row if one doesn't exist yet.
      4. Merge the base dict (username, email, bio, skills, profile_picture)
         with the extended dict (title, location, experience, …).
      5. Return as JSON.

    Response 200:
      { "user": { ...all profile fields... } }
    Response 404:
      { "error": "User not found" }
    """
    user_id = int(get_jwt_identity())      # JWT stores user_id as a string → cast to int
    user = User.query.get(user_id)         # SELECT * FROM users WHERE id = user_id
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Auto-create blank extended profile if this user doesn't have one yet
    ext = _get_or_create_profile(user_id)
    db.session.commit()                    # commit the auto-created row (if any)

    # Merge the two dicts: ext.to_dict() fields override nothing from user.to_dict()
    # They have different keys, so the result has ALL fields from both.
    result = {**user.to_dict(), **ext.to_dict()}
    return jsonify({'user': result}), 200


@profile_bp.route('', methods=['PUT'])
@jwt_required()
def update_profile():
    """
    PUT /profile
    ────────────
    Update the logged-in user's profile fields.

    Accepts a JSON body with any SUBSET of the following fields
    (all are optional – only provided fields are updated):
      bio            – plain text, max 500 chars
      skills         – list of strings, max 20 items
      profile_picture – URL string (for external avatars)
      title          – job title, max 80 chars
      location       – city/country, max 100 chars
      phone          – phone number, max 30 chars
      social_links   – dict: {github, linkedin, twitter, website}
      experience     – list of experience objects
      education      – list of education objects

    Response 200:
      { "user": { ...updated profile... }, "message": "Profile updated successfully" }
    Response 400:
      { "error": "..." }   (validation error or missing JSON body)
    Response 404:
      { "error": "User not found" }
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()       # parse the JSON request body into a Python dict
    if not data:
        return jsonify({'error': 'JSON body required'}), 400

    # Validate first – return early with an error before touching the DB
    error = _validate_profile_data(data)
    if error:
        return jsonify({'error': error}), 400

    # ── Update fields that live on the User table ──────────────────────────
    if 'bio' in data:
        # Truncate to 500 chars as a safety net (validation already caught longer)
        user.bio = str(data['bio'])[:500] if data['bio'] else None

    if 'skills' in data:
        skills = data['skills']
        if isinstance(skills, list):
            # Store as comma-separated string; the to_dict() method will split it back
            user.skills = ','.join(str(s).strip() for s in skills if str(s).strip())
        else:
            user.skills = str(skills)

    if 'profile_picture' in data:
        user.profile_picture = data['profile_picture']   # URL string

    # ── Update fields that live on the UserProfile table ──────────────────
    ext = _get_or_create_profile(user_id)   # fetch or auto-create

    if 'title' in data:
        ext.title = str(data['title'])[:80] if data['title'] else None

    if 'location' in data:
        ext.location = str(data['location'])[:100] if data['location'] else None

    if 'phone' in data:
        ext.phone = str(data['phone'])[:30] if data['phone'] else None

    if 'social_links' in data:
        sl = data['social_links']
        if isinstance(sl, dict):
            # Only store the four known keys; clamp each value to 200 chars
            clean_sl = {
                k: str(sl.get(k, ''))[:200]
                for k in ('github', 'linkedin', 'twitter', 'website')
            }
            ext.social_links = json.dumps(clean_sl)    # serialise dict → JSON string

    if 'experience' in data:
        exp = data['experience']
        if isinstance(exp, list):
            ext.experience = json.dumps(exp)           # serialise list → JSON string

    if 'education' in data:
        edu = data['education']
        if isinstance(edu, list):
            ext.education = json.dumps(edu)            # serialise list → JSON string

    db.session.commit()          # write all changes to the database in one transaction

    result = {**user.to_dict(), **ext.to_dict()}
    return jsonify({'user': result, 'message': 'Profile updated successfully'}), 200


@profile_bp.route('/image', methods=['POST'])
def upload_image():
    """
    POST /profile/image
    ───────────────────
    Upload a new profile photo.

    Request: multipart/form-data with field name 'image'.

    Processing pipeline:
      1. Check the 'image' field exists in the request.
      2. Validate the file extension is in ALLOWED_EXTENSIONS.
      3. Validate the file size is ≤ 5 MB.
      4. Verify it's actually an image by opening it with Pillow.
      5. Resize to MAX_IMAGE_DIM × MAX_IMAGE_DIM (preserving aspect ratio).
      6. Convert to JPEG and save to UPLOAD_FOLDER with a safe, unique filename.
      7. Update user.profile_picture to the URL of the saved file.
      8. Return the image URL.

    Response 200:
      { "url": "http://localhost:5000/uploads/profile_1_1700000000.jpg",
        "message": "Image uploaded successfully" }
    Response 400:
      { "error": "..." }   (missing file, bad type, too large, corrupted)
    Response 500:
      { "error": "Image processing failed: ..." }
    """
    # Note: JWT is required but checked via the Authorization header;
    # we skip @jwt_required() decorator here and use manual token check
    # so we can still return proper JSON errors for image upload context.
    # EDIT: simpler to use the decorator for consistency:
    from flask_jwt_extended import verify_jwt_in_request
    try:
        verify_jwt_in_request()
    except Exception:
        return jsonify({'error': 'Authentication required.'}), 401

    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # ── Step 1: File presence check ────────────────────────────────────────
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided. Use field name "image".'}), 400

    file = request.files['image']    # werkzeug FileStorage object
    if file.filename == '':
        return jsonify({'error': 'No file selected.'}), 400

    # ── Step 2: Extension validation ───────────────────────────────────────
    if not _allowed_file(file.filename):
        return jsonify({
            'error': f'Invalid file type. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
        }), 400

    # ── Step 3: Size validation ────────────────────────────────────────────
    # file.seek(0, 2) moves the read cursor to the END of the file (offset=0 from end=2)
    # file.tell() returns the current cursor position = total bytes in the file
    # file.seek(0) resets the cursor to the beginning so Pillow can read it
    file.seek(0, 2)
    file_size = file.tell()
    file.seek(0)
    if file_size > MAX_IMAGE_BYTES:
        return jsonify({'error': 'File too large. Maximum allowed size is 5 MB.'}), 400

    # ── Step 4: Image integrity check ──────────────────────────────────────
    # Image.open().verify() reads just the header of the file and raises
    # UnidentifiedImageError if it's not a recognised image format.
    # This catches malicious files (e.g. a .exe renamed to .jpg).
    # IMPORTANT: after verify(), the file stream position is undefined,
    # so we seek(0) again before passing to _process_and_save().
    try:
        Image.open(file).verify()
        file.seek(0)
    except (UnidentifiedImageError, Exception):
        return jsonify({'error': 'Invalid or corrupted image file.'}), 400

    # ── Step 5 & 6: Process and save ───────────────────────────────────────
    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)     # create dir if it doesn't exist

    # Build a unique, safe filename: profile_<user_id>_<unix_timestamp>.jpg
    # int(time.time()) gives seconds since 1970-01-01, guaranteeing uniqueness
    timestamp = int(time.time())
    save_filename = secure_filename(f'profile_{user_id}_{timestamp}.jpg')
    save_path = os.path.join(upload_folder, save_filename)

    try:
        _process_and_save(file, save_path)
    except Exception as exc:
        return jsonify({'error': f'Image processing failed: {str(exc)}'}), 500

    # ── Step 7: Update DB record ───────────────────────────────────────────
    # request.host_url gives e.g. "http://localhost:5000/"
    # We build the full public URL that the frontend can use in <img src="...">
    image_url = f"{request.host_url.rstrip('/')}/uploads/{save_filename}"
    user.profile_picture = image_url
    db.session.commit()

    return jsonify({
        'url': image_url,
        'message': 'Image uploaded successfully'
    }), 200


@profile_bp.route('/uploads/<filename>', methods=['GET'])
def serve_uploaded_image(filename: str):
    """
    GET /profile/uploads/<filename>
    ────────────────────────────────
    Serve an uploaded profile image file.

    Why serve from here instead of directly from disk?
      Flask's send_from_directory() ensures the file path stays within
      UPLOAD_FOLDER. If someone requests '/profile/uploads/../../../etc/passwd',
      secure_filename() strips the path traversal characters, preventing the
      attack.

    Note: images are intentionally public (no JWT required) because browsers
    can't send Authorization headers for <img> src attributes.
    """
    # secure_filename removes directory separators and special characters
    safe_name = secure_filename(filename)
    upload_folder = current_app.config['UPLOAD_FOLDER']
    # send_from_directory safely serves a file from the specified folder
    return send_from_directory(upload_folder, safe_name)
