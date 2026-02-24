from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from models.user import User, db

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/signup', methods=['POST'])
def signup():
    """Register a new user. Expects JSON: username, email, password."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'JSON body required'}), 400

    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password')

    if not username:
        return jsonify({'error': 'Username is required'}), 400
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    if not password:
        return jsonify({'error': 'Password is required'}), 400
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken'}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'message': 'User created successfully',
        'user': user.to_dict(),
        'access_token': access_token,
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login with email and password. Expects JSON: email, password."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'JSON body required'}), 400

    email = (data.get('email') or data.get('username') or '').strip().lower()
    password = data.get('password')

    if not email:
        return jsonify({'error': 'Email or username is required'}), 400
    if not password:
        return jsonify({'error': 'Password is required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        user = User.query.filter_by(username=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email/username or password'}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(),
        'access_token': access_token,
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """Return current user (requires Authorization: Bearer <token>)."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': user.to_dict()}), 200
