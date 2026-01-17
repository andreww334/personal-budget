from uuid import UUID

from flask import Blueprint, request, jsonify, g

from app.extensions import db
from app.models import Category
from app.auth import login_required

categories_bp = Blueprint("categories", __name__)


def serialize_category(c: Category) -> dict:
    """Convert a Category model to JSON-serializable dict."""
    return {
        "id": str(c.id),
        "name": c.name,
        "created_at": c.created_at.isoformat(),
    }


@categories_bp.route("/api/categories", methods=["GET"])
@login_required
def list_categories() -> tuple:
    """List all categories for the current user."""
    categories = Category.query.filter_by(user_id=g.user_id).order_by(Category.name).all()

    return jsonify({
        "categories": [serialize_category(c) for c in categories],
        "count": len(categories),
    }), 200


@categories_bp.route("/api/categories", methods=["POST"])
@login_required
def create_category() -> tuple:
    """Create a new category."""
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "Category name is required"}), 400

    name = data["name"].strip()

    # Check for duplicate
    existing = Category.query.filter_by(user_id=g.user_id, name=name).first()
    if existing:
        return jsonify(serialize_category(existing)), 200

    category = Category(
        user_id=g.user_id,
        name=name,
    )
    db.session.add(category)
    db.session.commit()

    return jsonify(serialize_category(category)), 201


@categories_bp.route("/api/categories/<category_id>", methods=["GET"])
@login_required
def get_category(category_id: str) -> tuple:
    """Get a single category by ID."""
    category = Category.query.filter_by(
        id=UUID(category_id),
        user_id=g.user_id
    ).first()

    if not category:
        return jsonify({"error": "Category not found"}), 404

    return jsonify(serialize_category(category)), 200


@categories_bp.route("/api/categories/<category_id>", methods=["PUT"])
@login_required
def update_category(category_id: str) -> tuple:
    """Update a category."""
    category = Category.query.filter_by(
        id=UUID(category_id),
        user_id=g.user_id
    ).first()

    if not category:
        return jsonify({"error": "Category not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    if "name" in data:
        category.name = data["name"].strip()

    db.session.commit()

    return jsonify(serialize_category(category)), 200


@categories_bp.route("/api/categories/<category_id>", methods=["DELETE"])
@login_required
def delete_category(category_id: str) -> tuple:
    """Delete a category."""
    category = Category.query.filter_by(
        id=UUID(category_id),
        user_id=g.user_id
    ).first()

    if not category:
        return jsonify({"error": "Category not found"}), 404

    db.session.delete(category)
    db.session.commit()

    return jsonify({"success": True, "deleted_id": category_id}), 200
