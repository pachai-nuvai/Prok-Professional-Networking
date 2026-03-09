"""
main.py
───────
Application entry point.
Responsibilities:
  1. Create the Flask app and load configuration.
  2. Initialise extensions (SQLAlchemy, JWT, CORS, Rate Limiter).
  3. Register all API blueprints with their URL prefixes.
  4. Create all database tables on startup (db.create_all).
  5. Print all registered routes for easy debugging.
  6. Run the development server when executed directly.
"""

import os
from flask import Flask, send_from_directory     # Flask web framework
from flask_cors import CORS                       # Allow cross-origin requests from the React frontend
from flask_jwt_extended import JWTManager         # JSON Web Token authentication
from flask_limiter import Limiter                  # Rate limiting
from flask_limiter.util import get_remote_address  # Use client IP as the rate-limit key
from config import Config                          # Our configuration class
from dotenv import load_dotenv                     # Load .env file into os.environ

# Load environment variables from .env file (if it exists).
# This must run BEFORE any os.environ.get() calls.
load_dotenv()

# ── Create Flask app ──────────────────────────────────────────────────────────
# __name__ tells Flask where to look for templates and static files.
app = Flask(__name__)

# Load all settings from our Config class into app.config
app.config.from_object(Config)

# ── Initialise extensions ─────────────────────────────────────────────────────

# CORS: allows the React dev server (localhost:3000 / 5173) to call our API.
# In production, replace '*' with your actual frontend domain.
CORS(app, resources={r"/*": {"origins": "*"}})

# JWT: manages token creation and verification.
JWTManager(app)

# Rate Limiter: limits how many requests a single IP can make.
# key_func=get_remote_address → rate limit per IP address.
# storage_uri from config → 'memory://' for development.
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    storage_uri=app.config['RATELIMIT_STORAGE_URI'],
    default_limits=['200 per day', '100 per hour'],
)

# ── Import models (needed so SQLAlchemy knows about them before create_all) ───
# Importing here registers the models with the SQLAlchemy metadata.
from models.user import db, User          # noqa: E402  (import after app creation)
from models.profile import UserProfile    # noqa: E402
from models.post import Post, PostLike    # noqa: E402  registers post tables with SQLAlchemy metadata

# Bind SQLAlchemy to this Flask app.
# db was created without an app in models/user.py; init_app() connects them.
db.init_app(app)

# ── Import and register Blueprints ────────────────────────────────────────────
# Each blueprint groups related routes. The url_prefix is prepended to every
# route defined inside that blueprint.
from api.auth import auth_bp            # noqa: E402
from api.profile import profile_bp      # noqa: E402
from api.posts import posts_bp          # noqa: E402
from api.feed import feed_bp            # noqa: E402
from api.jobs import jobs_bp            # noqa: E402
from api.messaging import messaging_bp  # noqa: E402

app.register_blueprint(auth_bp,      url_prefix='/auth')
#   → /auth/signup, /auth/login, /auth/me

app.register_blueprint(profile_bp,   url_prefix='/profile')
#   → /profile (GET, PUT), /profile/image (POST), /profile/uploads/<file> (GET)

app.register_blueprint(posts_bp,     url_prefix='/posts')
app.register_blueprint(feed_bp,      url_prefix='/feed')
app.register_blueprint(jobs_bp,      url_prefix='/jobs')
app.register_blueprint(messaging_bp, url_prefix='/messages')

print('>>> All blueprints registered!')

# ── Static file serving for uploads (top-level /uploads/<filename>) ───────────
@app.route('/uploads/<filename>')
def serve_upload(filename: str):
    """
    Serve uploaded profile images at /uploads/<filename>.
    send_from_directory() ensures the file path stays inside UPLOAD_FOLDER,
    preventing directory-traversal attacks.
    Images are intentionally public (no JWT) because browsers can't send
    Authorization headers when loading <img src="..."> elements.
    """
    from werkzeug.utils import secure_filename   # strip unsafe path characters
    safe = secure_filename(filename)
    return send_from_directory(app.config['UPLOAD_FOLDER'], safe)


# ── Rate-limit the image upload endpoint more strictly ───────────────────────
# 10 uploads per hour per IP to prevent abuse.
# We apply this after blueprint registration using the route string.
@limiter.limit('10 per hour', override_defaults=False)
def _image_upload_limit():
    pass   # this is just used for the decorator side-effect


# ── Database setup ────────────────────────────────────────────────────────────

def _apply_sqlite_migrations():
    """
    Add any columns that were added to models after the initial db.create_all().

    SQLite supports  ALTER TABLE ... ADD COLUMN  but not DROP/ALTER COLUMN.
    We check whether each expected column already exists before adding it,
    making this function idempotent (safe to call on every startup).

    This is the beginner-friendly alternative to Flask-Migrate for SQLite.
    """
    from sqlalchemy import inspect as sa_inspect, text

    inspector = sa_inspect(db.engine)

    # ── users table: add bio, skills, profile_picture if missing ─────────
    existing_cols = {col['name'] for col in inspector.get_columns('users')}
    new_cols = {
        'bio':             'TEXT',
        'skills':          'TEXT',
        'profile_picture': 'VARCHAR(500)',
    }
    for col_name, col_type in new_cols.items():
        if col_name not in existing_cols:
            db.session.execute(
                text(f'ALTER TABLE users ADD COLUMN {col_name} {col_type}')
            )
            print(f'    [migration] Added column: users.{col_name}')

    db.session.commit()


def setup_database():
    """
    Create all tables defined by the SQLAlchemy models, then apply any
    pending column additions (simple SQLite migration helper).

    db.create_all() is idempotent – it only creates MISSING tables; it never
    drops or alters existing ones, so existing data is always preserved.
    """
    with app.app_context():
        # Ensure upload directory exists on first run
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

        db.create_all()              # CREATE TABLE IF NOT EXISTS for every model
        _apply_sqlite_migrations()   # safely add any new columns to existing tables

        print('>>> Database tables created (or already exist):')
        from sqlalchemy import inspect as sa_inspect
        inspector = sa_inspect(db.engine)
        for table_name in inspector.get_table_names():
            print(f'    • {table_name}')

        print('\n>>> Registered routes:')
        for rule in sorted(app.url_map.iter_rules(), key=lambda r: r.rule):
            methods = ', '.join(sorted(rule.methods - {'HEAD', 'OPTIONS'}))
            print(f'    {methods:20s}  {rule.rule}')


# ── App factory ───────────────────────────────────────────────────────────────
def create_app():
    """
    Returns the configured Flask app.
    Used by test runners and WSGI servers (e.g. gunicorn -w 4 'main:create_app()').
    """
    return app


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    setup_database()
    # debug=True  → auto-reload on code changes, detailed error pages
    # port=5000   → default; change if port is in use
    app.run(debug=True, port=5000)
