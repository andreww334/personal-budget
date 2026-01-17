from datetime import datetime
from uuid import UUID

from flask import Blueprint, request, jsonify, current_app

from app.extensions import db
from app.models import Transaction

transactions_bp = Blueprint("transactions", __name__)


def serialize_transaction(t: Transaction, include_refunds: bool = False) -> dict:
    """Convert a Transaction model to JSON-serializable dict."""
    result = {
        "id": str(t.id),
        "vendor": t.vendor,
        "description": t.description or "",
        "amount_cents": int(t.amount * 100),
        "direction": t.direction,
        "date": t.date.isoformat(),
        "source": t.source,
        "category_id": str(t.category_id) if t.category_id else None,
        "created_at": t.created_at.isoformat(),
        "refund_of_transaction_id": str(t.refund_of_transaction_id) if t.refund_of_transaction_id else None,
    }

    # Include linked refunds for original transactions (when requested)
    if include_refunds and t.refunds:
        result["refunds"] = [
            {
                "id": str(r.id),
                "amount_cents": int(r.amount * 100),
                "date": r.date.isoformat(),
            }
            for r in t.refunds
        ]

    # Include original transaction summary if this is a refund
    if t.original_transaction:
        result["original_transaction"] = {
            "id": str(t.original_transaction.id),
            "vendor": t.original_transaction.vendor,
            "amount_cents": int(t.original_transaction.amount * 100),
            "date": t.original_transaction.date.isoformat(),
            "category_id": str(t.original_transaction.category_id) if t.original_transaction.category_id else None,
        }

    return result


@transactions_bp.route("/api/transactions", methods=["GET"])
def list_transactions() -> tuple:
    """
    List transactions for the current user with pagination.

    Query params:
    - start_date: Filter transactions from this date (YYYY-MM-DD)
    - end_date: Filter transactions until this date (YYYY-MM-DD)
    - direction: Filter by 'income' or 'expense'
    - source: Filter by source (e.g., 'chase', 'capital_one')
    - limit: Number of transactions to return (default 50)
    - offset: Pagination offset (default 0)
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

    # Get total count before pagination
    total_count = query.count()

    # Pagination
    limit = request.args.get("limit", 50, type=int)
    offset = request.args.get("offset", 0, type=int)

    # Order by date descending (most recent first) and apply pagination
    transactions = query.order_by(Transaction.date.desc()).offset(offset).limit(limit).all()

    return jsonify({
        "transactions": [serialize_transaction(t, include_refunds=True) for t in transactions],
        "count": len(transactions),
        "total_count": total_count,
        "limit": limit,
        "offset": offset,
        "has_more": offset + limit < total_count,
    }), 200


@transactions_bp.route("/api/transactions/<transaction_id>", methods=["GET"])
def get_transaction(transaction_id: str) -> tuple:
    """Get a single transaction by ID, including linked refunds."""
    user_id = current_app.config.get("DEFAULT_USER_ID")
    if not user_id:
        return jsonify({"error": "DEFAULT_USER_ID not configured"}), 500

    transaction = Transaction.query.filter_by(
        id=UUID(transaction_id),
        user_id=UUID(user_id)
    ).first()

    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    return jsonify(serialize_transaction(transaction, include_refunds=True)), 200


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
                category_id=UUID(t["category_id"]) if t.get("category_id") else None,
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


@transactions_bp.route("/api/transactions/<transaction_id>/potential-originals", methods=["GET"])
def get_potential_originals(transaction_id: str) -> tuple:
    """
    Get potential original transactions that this refund could be linked to.
    Returns transactions from the same vendor (case-insensitive) that are:
    - Expenses (direction = 'expense')
    - Dated BEFORE the refund transaction
    - Belong to the same user

    Query params:
    - limit: Number of transactions to return (default 10)
    - offset: Pagination offset (default 0)
    """
    user_id = current_app.config.get("DEFAULT_USER_ID")
    if not user_id:
        return jsonify({"error": "DEFAULT_USER_ID not configured"}), 500

    # Get the refund transaction
    refund = Transaction.query.filter_by(
        id=UUID(transaction_id),
        user_id=UUID(user_id)
    ).first()

    if not refund:
        return jsonify({"error": "Transaction not found"}), 404

    # Only income transactions can be refunds
    if refund.direction != "income":
        return jsonify({"error": "Only income transactions can be marked as refunds"}), 400

    limit = request.args.get("limit", 10, type=int)
    offset = request.args.get("offset", 0, type=int)

    # Find potential original transactions (case-insensitive vendor match)
    query = Transaction.query.filter(
        Transaction.user_id == UUID(user_id),
        Transaction.direction == "expense",
        Transaction.date < refund.date,
        db.func.lower(Transaction.vendor) == refund.vendor.lower()
    ).order_by(Transaction.date.desc())

    total_count = query.count()
    transactions = query.offset(offset).limit(limit).all()

    return jsonify({
        "transactions": [serialize_transaction(t, include_refunds=True) for t in transactions],
        "total_count": total_count,
        "limit": limit,
        "offset": offset,
        "has_more": offset + limit < total_count,
    }), 200


@transactions_bp.route("/api/transactions/<transaction_id>/link-refund", methods=["POST"])
def link_refund(transaction_id: str) -> tuple:
    """
    Link a refund transaction to an original transaction.
    The refund inherits the original transaction's category.

    Request body:
    - original_transaction_id: UUID of the original transaction
    """
    user_id = current_app.config.get("DEFAULT_USER_ID")
    if not user_id:
        return jsonify({"error": "DEFAULT_USER_ID not configured"}), 500

    data = request.get_json()
    if not data or not data.get("original_transaction_id"):
        return jsonify({"error": "original_transaction_id is required"}), 400

    # Get the refund transaction
    refund = Transaction.query.filter_by(
        id=UUID(transaction_id),
        user_id=UUID(user_id)
    ).first()

    if not refund:
        return jsonify({"error": "Refund transaction not found"}), 404

    # Validate: only income transactions can be refunds
    if refund.direction != "income":
        return jsonify({"error": "Only income transactions can be marked as refunds"}), 400

    # Get the original transaction
    original = Transaction.query.filter_by(
        id=UUID(data["original_transaction_id"]),
        user_id=UUID(user_id)
    ).first()

    if not original:
        return jsonify({"error": "Original transaction not found"}), 404

    # Validate: original must be an expense
    if original.direction != "expense":
        return jsonify({"error": "Original transaction must be an expense"}), 400

    # Validate: refund date must be after original date
    if refund.date <= original.date:
        return jsonify({"error": "Refund date must be after original transaction date"}), 400

    # Link the refund and inherit category
    refund.refund_of_transaction_id = original.id
    refund.category_id = original.category_id

    db.session.commit()

    return jsonify(serialize_transaction(refund, include_refunds=True)), 200


@transactions_bp.route("/api/transactions/<transaction_id>/unlink-refund", methods=["POST"])
def unlink_refund(transaction_id: str) -> tuple:
    """
    Unlink a refund from its original transaction.
    Sets refund_of_transaction_id back to null.
    Note: Category is NOT automatically cleared (user may want to keep it).
    """
    user_id = current_app.config.get("DEFAULT_USER_ID")
    if not user_id:
        return jsonify({"error": "DEFAULT_USER_ID not configured"}), 500

    # Get the refund transaction
    refund = Transaction.query.filter_by(
        id=UUID(transaction_id),
        user_id=UUID(user_id)
    ).first()

    if not refund:
        return jsonify({"error": "Transaction not found"}), 404

    if not refund.refund_of_transaction_id:
        return jsonify({"error": "Transaction is not linked as a refund"}), 400

    refund.refund_of_transaction_id = None
    db.session.commit()

    return jsonify(serialize_transaction(refund, include_refunds=True)), 200
