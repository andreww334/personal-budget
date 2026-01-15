from datetime import datetime
from uuid import UUID

from flask import Blueprint, request, jsonify, current_app

from app.extensions import db
from app.models import Transaction

transactions_bp = Blueprint("transactions", __name__)


def serialize_transaction(t: Transaction) -> dict:
    """Convert a Transaction model to JSON-serializable dict."""
    return {
        "id": str(t.id),
        "vendor": t.vendor,
        "description": t.description or "",
        "amount_cents": int(t.amount * 100),
        "direction": t.direction,
        "date": t.date.isoformat(),
        "source": t.source,
        "category_id": str(t.category_id) if t.category_id else None,
        "created_at": t.created_at.isoformat(),
    }


@transactions_bp.route("/api/transactions", methods=["GET"])
def list_transactions() -> tuple:
    """
    List all transactions for the current user.

    Query params:
    - start_date: Filter transactions from this date (YYYY-MM-DD)
    - end_date: Filter transactions until this date (YYYY-MM-DD)
    - direction: Filter by 'income' or 'expense'
    - source: Filter by source (e.g., 'chase', 'capital_one')
    """
    user_id = current_app.config.get("DEFAULT_USER_ID")
    if not user_id:
        return jsonify({"error": "DEFAULT_USER_ID not configured"}), 500

    query = Transaction.query.filter_by(user_id=UUID(user_id))

    # Apply filters
    start_date = request.args.get("start_date")
    if start_date:
        query = query.filter(Transaction.date >= datetime.strptime(start_date, "%Y-%m-%d").date())

    end_date = request.args.get("end_date")
    if end_date:
        query = query.filter(Transaction.date <= datetime.strptime(end_date, "%Y-%m-%d").date())

    direction = request.args.get("direction")
    if direction in ("income", "expense"):
        query = query.filter_by(direction=direction)

    source = request.args.get("source")
    if source:
        query = query.filter_by(source=source)

    # Order by date descending (most recent first)
    transactions = query.order_by(Transaction.date.desc()).all()

    return jsonify({
        "transactions": [serialize_transaction(t) for t in transactions],
        "count": len(transactions),
    }), 200


@transactions_bp.route("/api/transactions/<transaction_id>", methods=["GET"])
def get_transaction(transaction_id: str) -> tuple:
    """Get a single transaction by ID."""
    user_id = current_app.config.get("DEFAULT_USER_ID")
    if not user_id:
        return jsonify({"error": "DEFAULT_USER_ID not configured"}), 500

    transaction = Transaction.query.filter_by(
        id=UUID(transaction_id),
        user_id=UUID(user_id)
    ).first()

    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    return jsonify(serialize_transaction(transaction)), 200


@transactions_bp.route("/api/transactions/<transaction_id>", methods=["PUT"])
def update_transaction(transaction_id: str) -> tuple:
    """Update a transaction."""
    user_id = current_app.config.get("DEFAULT_USER_ID")
    if not user_id:
        return jsonify({"error": "DEFAULT_USER_ID not configured"}), 500

    transaction = Transaction.query.filter_by(
        id=UUID(transaction_id),
        user_id=UUID(user_id)
    ).first()

    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Update allowed fields
    if "vendor" in data:
        transaction.vendor = data["vendor"]
    if "description" in data:
        transaction.description = data["description"]
    if "amount_cents" in data:
        transaction.amount = data["amount_cents"] / 100
    if "direction" in data and data["direction"] in ("income", "expense"):
        transaction.direction = data["direction"]
    if "date" in data:
        transaction.date = datetime.strptime(data["date"], "%Y-%m-%d").date()
    if "category_id" in data:
        transaction.category_id = UUID(data["category_id"]) if data["category_id"] else None

    db.session.commit()

    return jsonify(serialize_transaction(transaction)), 200


@transactions_bp.route("/api/transactions/<transaction_id>", methods=["DELETE"])
def delete_transaction(transaction_id: str) -> tuple:
    """Delete a transaction."""
    user_id = current_app.config.get("DEFAULT_USER_ID")
    if not user_id:
        return jsonify({"error": "DEFAULT_USER_ID not configured"}), 500

    transaction = Transaction.query.filter_by(
        id=UUID(transaction_id),
        user_id=UUID(user_id)
    ).first()

    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    db.session.delete(transaction)
    db.session.commit()

    return jsonify({"success": True, "deleted_id": transaction_id}), 200


@transactions_bp.route("/api/transactions/commit", methods=["POST"])
def commit_transactions() -> tuple:
    """
    Commit parsed transactions to the database.
    Expects JSON body with list of transactions.
    """
    data = request.get_json()

    if not data or "transactions" not in data:
        return jsonify({"error": "No transactions provided"}), 400

    user_id = current_app.config.get("DEFAULT_USER_ID")
    if not user_id:
        return jsonify({"error": "DEFAULT_USER_ID not configured"}), 500

    transactions_data = data["transactions"]
    created_count = 0
    errors = []

    for i, t in enumerate(transactions_data):
        try:
            transaction = Transaction(
                user_id=UUID(user_id),
                vendor=t["vendor"],
                description=t.get("description", ""),
                amount=t["amount_cents"] / 100,  # Convert cents back to dollars for DB
                direction=t["direction"],
                date=datetime.strptime(t["date"], "%Y-%m-%d").date(),
                source=t.get("source", "import"),
            )
            db.session.add(transaction)
            created_count += 1
        except Exception as e:
            errors.append({"index": i, "error": str(e)})

    if created_count > 0:
        db.session.commit()
        print(f"Committed {created_count} transactions to database")

    return jsonify({
        "success": True,
        "created": created_count,
        "errors": errors,
    }), 201
