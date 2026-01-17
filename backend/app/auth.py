from datetime import datetime, timedelta, timezone
from functools import wraps
from typing import Callable, Any
from uuid import UUID

import jwt
from flask import request, jsonify, current_app, g

from app.models import User


def create_access_token(user_id: UUID) -> str:
    """Create a JWT access token with 1 hour expiry."""
    expires = datetime.now(timezone.utc) + timedelta(
        seconds=current_app.config.get("JWT_ACCESS_TOKEN_EXPIRES", 3600)
    )
    payload = {
        "user_id": str(user_id),
        "exp": expires,
        "type": "access"
    }
    return jwt.encode(
        payload,
        current_app.config["JWT_SECRET_KEY"],
        algorithm="HS256"
    )


def create_refresh_token(user_id: UUID) -> str:
    """Create a JWT refresh token with 7 days expiry."""
    expires = datetime.now(timezone.utc) + timedelta(
        seconds=current_app.config.get("JWT_REFRESH_TOKEN_EXPIRES", 604800)
    )
    payload = {
        "user_id": str(user_id),
        "exp": expires,
        "type": "refresh"
    }
    return jwt.encode(
        payload,
        current_app.config["JWT_SECRET_KEY"],
        algorithm="HS256"
    )


def decode_token(token: str) -> dict | None:
    """Decode and validate a JWT token. Returns payload or None if invalid."""
    try:
        payload = jwt.decode(
            token,
            current_app.config["JWT_SECRET_KEY"],
            algorithms=["HS256"]
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_current_user_id() -> UUID | None:
    """Extract user ID from the access token cookie."""
    token = request.cookies.get("access_token")
    if not token:
        return None

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None

    try:
        return UUID(payload["user_id"])
    except (KeyError, ValueError):
        return None


def login_required(f: Callable) -> Callable:
    """Decorator to require authentication for a route."""
    @wraps(f)
    def decorated_function(*args: Any, **kwargs: Any) -> Any:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "Authentication required"}), 401

        # Store user_id in Flask's g object for use in route handlers
        g.user_id = user_id
        return f(*args, **kwargs)

    return decorated_function
