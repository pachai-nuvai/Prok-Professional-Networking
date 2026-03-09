"""
config.py
─────────
Central configuration for the Flask app.
All settings are read from environment variables with safe defaults for
development. In production, set these via a .env file or your hosting platform.
"""

import os
from datetime import timedelta


class Config:
    """
    Application configuration class.
    Flask reads this with app.config.from_object(Config).
    """

    # ── Flask core ────────────────────────────────────────────────────────────
    # SECRET_KEY is used to sign session cookies.
    # os.environ.get('KEY', 'default') reads the env var; falls back to 'default'.
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

    # ── Database ──────────────────────────────────────────────────────────────
    # SQLite file stored in the instance/ folder (auto-created by Flask).
    # Set DATABASE_URL env var to switch to PostgreSQL or MySQL in production.
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'sqlite:///prok.db'
    )
    # Disable modification tracking (saves memory; we don't need it)
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ── JWT ───────────────────────────────────────────────────────────────────
    # JWT_SECRET_KEY signs the JSON Web Tokens. Must be long and random in prod.
    JWT_SECRET_KEY = os.environ.get(
        'JWT_SECRET_KEY',
        'prok-jwt-secret-key-change-in-production-32bytes'
    )
    # Tokens expire after 1 hour; users need to log in again after that.
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_HEADERS = 'Content-Type'

    # ── File Uploads ──────────────────────────────────────────────────────────
    # Absolute path to the directory where uploaded images are stored.
    # os.path.dirname(__file__)  → directory containing this config.py file
    # os.path.join(...)          → joins path components with the OS separator
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')

    # MAX_CONTENT_LENGTH tells Flask to reject requests larger than this.
    # Set to 6 MB (slightly above our 5 MB image limit) so Flask doesn't
    # truncate the request before our own size-check code runs.
    MAX_CONTENT_LENGTH = 6 * 1024 * 1024   # 6 MB in bytes

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    # Flask-Limiter default limits (applied to all routes unless overridden).
    # "memory://" stores counters in-process RAM (fine for development).
    # Use Redis ("redis://localhost:6379") in production for multi-process support.
    RATELIMIT_STORAGE_URI   = os.environ.get('RATELIMIT_STORAGE_URI', 'memory://')
    RATELIMIT_DEFAULT       = '200 per day;100 per hour'
    RATELIMIT_HEADERS_ENABLED = True    # include X-RateLimit-* headers in responses
