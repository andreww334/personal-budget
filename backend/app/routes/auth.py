from flask import Blueprint, request, jsonify, current_app, make_response

from app.extensions import db
from app.models import User
from app.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    login_required,
    get_current_user_id,
)

auth_bp = Blueprint("auth", __name__)


def set_auth_cookies(response: any, user_id: str) -> None:
    """Set access and refresh token cookies on the response."""
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)

    # Access token: 1 hour, HTTP-only
    response.set_cookie(
        "access_token",
        access_token,
        httponly=True,
        secure=True,
        samesite="None",
        max_age=current_app.config.get("JWT_ACCESS_TOKEN_EXPIRES", 3600),
    )

    # Refresh token: 7 days, HTTP-only
    response.set_cookie(
        "refresh_token",
        refresh_token,
        httponly=True,
        secure=True,
        samesite="None",
        max_age=current_app.config.get("JWT_REFRESH_TOKEN_EXPIRES", 604800),
    )


def clear_auth_cookies(response: any) -> None:
    """Clear authentication cookies."""
    response.delete_cookie("access_token", samesite="None", secure=True)
    response.delete_cookie("refresh_token", samesite="None", secure=True)


@auth_bp.route("/api/auth/register", methods=["POST"])
def register() -> tuple:
    """Create a new user account."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name:
        return jsonify({"error": "Name is required"}), 400
    if not email:
        return jsonify({"error": "Email is required"}), 400
    if not password or len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    # Check if email already exists
    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"error": "Email already registered"}), 409

    # Create user
    user = User(name=name, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    # Create response with auth cookies
    response = make_response(jsonify({
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
        }
    }), 201)
    set_auth_cookies(response, user.id)

    return response


@auth_bp.route("/api/auth/login", methods=["POST"])
def login() -> tuple:
    """Authenticate user and return JWT tokens in cookies."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # Find user
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    # Create response with auth cookies
    response = make_response(jsonify({
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
        }
    }))
    set_auth_cookies(response, user.id)

    return response


@auth_bp.route("/api/auth/logout", methods=["POST"])
def logout() -> tuple:
    """Clear authentication cookies."""
    response = make_response(jsonify({"success": True}))
    clear_auth_cookies(response)
    return response


@auth_bp.route("/api/auth/refresh", methods=["POST"])
def refresh() -> tuple:
    """Refresh the access token using the refresh token."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        return jsonify({"error": "No refresh token"}), 401

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        response = make_response(jsonify({"error": "Invalid refresh token"}), 401)
        clear_auth_cookies(response)
        return response

    user_id = payload.get("user_id")
    if not user_id:
        return jsonify({"error": "Invalid token payload"}), 401

    # Verify user still exists
    user = User.query.get(user_id)
    if not user:
        response = make_response(jsonify({"error": "User not found"}), 401)
        clear_auth_cookies(response)
        return response

    # Issue new tokens
    response = make_response(jsonify({
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
        }
    }))
    set_auth_cookies(response, user.id)

    return response


@auth_bp.route("/api/auth/me", methods=["GET"])
@login_required
def get_current_user() -> tuple:
    """Get the current authenticated user's info."""
    from flask import g

    user = User.query.get(g.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
        }
    })
