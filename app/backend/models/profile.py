"""
models/profile.py
─────────────────
UserProfile model – stores extended profile data for each user.

Why a separate table?
  The User table handles authentication (username, email, password).
  UserProfile holds everything else (title, location, experience, etc.)
  This keeps concerns separated and avoids bloating the users table.
"""

import json                          # built-in JSON encoder/decoder
from models.user import db           # reuse the same SQLAlchemy instance


class UserProfile(db.Model):
    """
    Extended profile information linked 1-to-1 with a User.

    Column overview
    ───────────────
    id              – auto-increment primary key
    user_id         – foreign key → users.id  (unique: one profile per user)
    title           – job title, e.g. "Full Stack Developer"
    location        – city/country, e.g. "Chennai, India"
    phone           – contact number, e.g. "+91 98765 43210"
    social_links    – JSON string: {"github": "...", "linkedin": "...", ...}
    experience      – JSON string: list of experience objects
    education       – JSON string: list of education objects
    connections_count  – how many connections the user has
    mutual_connections – mutual connections count with viewer
    posts_count        – total posts published
    """

    __tablename__ = 'user_profiles'          # the SQL table name

    # ── Columns ──────────────────────────────────────────────────────────────

    id = db.Column(db.Integer, primary_key=True)
    # ForeignKey ties this row to a specific user; unique=True enforces 1-to-1
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id'),    # 'users.id' = table_name.column_name
        unique=True,
        nullable=False
    )

    # Short text fields – String(n) enforces max length at the ORM level
    title    = db.Column(db.String(80),  nullable=True)
    location = db.Column(db.String(100), nullable=True)
    phone    = db.Column(db.String(30),  nullable=True)

    # JSON-serialised fields stored as plain Text in SQLite.
    # SQLite does not have a native JSON column type, so we serialise manually.
    social_links = db.Column(db.Text, nullable=True)   # dict → JSON string
    experience   = db.Column(db.Text, nullable=True)   # list → JSON string
    education    = db.Column(db.Text, nullable=True)   # list → JSON string

    # Numeric stats; default=0 means new rows start at 0 automatically
    connections_count  = db.Column(db.Integer, default=0, nullable=False)
    mutual_connections = db.Column(db.Integer, default=0, nullable=False)
    posts_count        = db.Column(db.Integer, default=0, nullable=False)

    # ── Relationship ──────────────────────────────────────────────────────────
    # backref adds a `.extended_profile` attribute to the User model so we can
    # do  user.extended_profile  to get this UserProfile object.
    # uselist=False means it returns a single object, not a list (1-to-1).
    user = db.relationship(
        'User',
        backref=db.backref('extended_profile', uselist=False)
    )

    # ── Helper ───────────────────────────────────────────────────────────────

    @staticmethod
    def _parse_json(value: str | None, default):
        """
        Safely deserialise a JSON string back to a Python object.
        Returns `default` if the string is empty, None, or malformed.
        """
        if not value:
            return default
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return default

    def to_dict(self) -> dict:
        """
        Serialise the extended profile to a plain Python dict so it can be
        turned into JSON by Flask's jsonify().
        """
        return {
            'title':    self.title    or '',
            'location': self.location or '',
            'phone':    self.phone    or '',
            # Deserialise JSON strings back to Python dicts/lists
            'social_links': self._parse_json(
                self.social_links,
                {'github': '', 'linkedin': '', 'twitter': '', 'website': ''}
            ),
            'experience': self._parse_json(self.experience, []),
            'education':  self._parse_json(self.education,  []),
            # Stats
            'connections_count':  self.connections_count  or 0,
            'mutual_connections': self.mutual_connections or 0,
            'posts_count':        self.posts_count        or 0,
        }
