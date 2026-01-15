from datetime import datetime
from uuid import UUID

from flask import Blueprint, request, jsonify, current_app

from app.extensions import db
from app.models import Transaction

transactions_bp = Blueprint("transactions", __name__)


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
