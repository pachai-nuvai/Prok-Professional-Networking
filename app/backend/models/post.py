"""
models/post.py
──────────────
Two models that handle posts and their likes:

  Post     – one row per post created by a user
  PostLike – junction table that records WHICH user liked WHICH post.
             The unique constraint prevents a user from liking the same
             post twice (proper toggle semantics).
"""

import json                      # for serialising tags list
from datetime import datetime    # for default timestamp values
from models.user import db       # shared SQLAlchemy instance


# ─── Post ────────────────────────────────────────────────────────────────────

class Post(db.Model):
    """
    Represents a single post in the social feed.

    Columns
    ───────
    id            – auto-increment primary key
    user_id       – FK to users.id; identifies the author
    content       – post body text (up to 3000 chars enforced in the API)
    media_url     – optional URL to an uploaded image or video file
    media_type    – 'image' | 'video' | '' – tells the frontend which player to use
    likes_count   – de-normalised counter kept in sync with PostLike rows
                    (faster to read than COUNT(*) on every GET)
    comments_count – reserved for Day 6; starts at 0
    tags          – optional JSON list of hashtag strings, e.g. '["react","python"]'
    created_at    – UTC timestamp when the post was created
    updated_at    – UTC timestamp auto-updated on every change
    """

    __tablename__ = 'posts'

    id             = db.Column(db.Integer, primary_key=True)
    user_id        = db.Column(
                       db.Integer,
                       db.ForeignKey('users.id'),   # ties every post to an author
                       nullable=False
                   )
    content        = db.Column(db.Text, nullable=False)
    media_url      = db.Column(db.String(500), nullable=True)
    media_type     = db.Column(db.String(20),  nullable=True)   # 'image' | 'video'
    likes_count    = db.Column(db.Integer, default=0, nullable=False)
    comments_count = db.Column(db.Integer, default=0, nullable=False)
    tags           = db.Column(db.Text, nullable=True)          # JSON string

    # server_default uses a DB-level default so it works even on direct SQL inserts.
    # default= uses a Python-level default called by SQLAlchemy.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow   # automatically set on UPDATE
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    # backref adds post.user  →  the User who wrote this post
    user = db.relationship('User', backref=db.backref('posts', lazy='dynamic'))

    # lazy='dynamic' on backref means post.likes returns a Query object, not a list.
    # This lets us do post.likes.count() without loading all rows into memory.

    def get_tags(self) -> list[str]:
        """Deserialise the JSON tags string back to a Python list."""
        if not self.tags:
            return []
        try:
            return json.loads(self.tags)
        except (json.JSONDecodeError, TypeError):
            return []

    def to_dict(self, liked_by_user: bool = False) -> dict:
        """
        Serialise the Post to a plain Python dict for JSON responses.

        liked_by_user – pass True when the requesting user has liked this post
                         so the frontend can render the heart icon filled.
        """
        return {
            'id':             self.id,
            'user_id':        self.user_id,
            'content':        self.content,
            'media_url':      self.media_url  or '',
            'media_type':     self.media_type or '',
            'likes_count':    self.likes_count    or 0,
            'comments_count': self.comments_count or 0,
            'tags':           self.get_tags(),
            'liked_by_user':  liked_by_user,
            'created_at':     self.created_at.isoformat() if self.created_at else '',
            'updated_at':     self.updated_at.isoformat() if self.updated_at else '',
            # Embed the author's display name and avatar so the list can show
            # them without a separate API call.
            'author': {
                'id':              self.user.id,
                'username':        self.user.username,
                'profile_picture': self.user.profile_picture or '',
            },
        }


# ─── PostLike ─────────────────────────────────────────────────────────────────

class PostLike(db.Model):
    """
    Junction table: records that user_id liked post_id.

    The UNIQUE constraint on (post_id, user_id) is the database-level
    guarantee that a user can only like a post once.  If we try to INSERT
    a duplicate, the DB raises an IntegrityError which we catch to toggle
    (unlike) the post.
    """

    __tablename__ = 'post_likes'

    id      = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # UniqueConstraint at the table level enforces one like per (post, user) pair.
    __table_args__ = (
        db.UniqueConstraint('post_id', 'user_id', name='uq_post_like'),
    )
