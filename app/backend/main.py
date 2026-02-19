from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config.from_object(Config)

CORS(app)
JWTManager(app)

# Use shared db from User model and bind to app
from models.user import db, User  # noqa: E402
db.init_app(app)

from api import auth_bp  # noqa: E402
app.register_blueprint(auth_bp, url_prefix='/auth')


def setup_database():
    with app.app_context():
        db.create_all()
        print("Database tables created successfully!")


def create_app():
    return app


if __name__ == '__main__':
    setup_database()
    app.run(debug=True, port=5000)
