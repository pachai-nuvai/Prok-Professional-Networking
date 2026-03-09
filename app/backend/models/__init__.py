# models/__init__.py
# Export both models so the rest of the app can import from `models` directly.
# Example: from models import User, UserProfile

from models.user import User, db       # authentication model + shared db instance
from models.profile import UserProfile  # extended profile model

__all__ = ['User', 'UserProfile', 'db']
