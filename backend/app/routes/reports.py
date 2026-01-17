from datetime import datetime
from uuid import UUID
from collections import defaultdict

from flask import Blueprint, request, jsonify, g
from sqlalchemy import func, extract

from app.extensions import db
from app.models import Transaction, Category
from app.auth import login_required

reports_bp = Blueprint("reports", __name__)


@reports_bp.route("/api/reports/monthly", methods=["GET"])
@login_required
def get_monthly_report() -> tuple:
    """
    Get monthly aggregation of transactions with category breakdown.
    Refunds are netted against their original transactions.

    Query params:
    - start_date: Filter from this date (YYYY-MM-DD), optional
    - end_date: Filter until this date (YYYY-MM-DD), optional

    Returns:
    {
        "months": [
            {
                "month": "2024-01",
                "total_expenses": 150000,  // cents, net of refunds
                "total_income": 500000,    // cents, excluding linked refunds
                "categories": [
                    {"category_id": "...", "category_name": "Food", "total": 50000},
                    ...
                ]
            },
            ...
        ]
    }
    """
    # Build base query
    query = Transaction.query.filter(Transaction.user_id == g.user_id)

    # Apply date filters
    start_date = request.args.get("start_date")
    if start_date:
        query = query.filter(Transaction.date >= datetime.strptime(start_date, "%Y-%m-%d").date())

    end_date = request.args.get("end_date")
    if end_date:
        query = query.filter(Transaction.date <= datetime.strptime(end_date, "%Y-%m-%d").date())

    transactions = query.all()

    # Get all categories for name lookup
    categories = Category.query.filter_by(user_id=g.user_id).all()
    category_names = {str(c.id): c.name for c in categories}

    # Build a lookup of transaction id -> transaction for refund processing
    tx_by_id = {str(t.id): t for t in transactions}

    # Aggregate by month
    # Structure: {month: {expenses: {category_id: total}, income: total}}
    monthly_data: dict = defaultdict(lambda: {
        "expenses_by_category": defaultdict(int),
        "income": 0
    })

    for t in transactions:
        month_key = t.date.strftime("%Y-%m")

        # Skip linked refunds - they're counted against their original
        if t.refund_of_transaction_id:
            continue

        if t.direction == "expense":
            # Calculate net amount (original - refunds)
            amount_cents = int(t.amount * 100)
            refund_total = sum(int(r.amount * 100) for r in t.refunds)
            net_amount = amount_cents - refund_total

            # Use original transaction's category and month
            category_key = str(t.category_id) if t.category_id else "uncategorized"
            monthly_data[month_key]["expenses_by_category"][category_key] += net_amount

        elif t.direction == "income":
            # Unlinked income (not a refund)
            amount_cents = int(t.amount * 100)
            monthly_data[month_key]["income"] += amount_cents

    # Format response
    months = []
    for month_key in sorted(monthly_data.keys(), reverse=True):
        data = monthly_data[month_key]

        # Build category breakdown
        categories_list = []
        for cat_id, total in data["expenses_by_category"].items():
            if total == 0:
                continue
            categories_list.append({
                "category_id": cat_id if cat_id != "uncategorized" else None,
                "category_name": category_names.get(cat_id, "Uncategorized"),
                "total": total
            })

        # Sort categories by total (highest first)
        categories_list.sort(key=lambda x: x["total"], reverse=True)

        total_expenses = sum(data["expenses_by_category"].values())

        months.append({
            "month": month_key,
            "total_expenses": total_expenses,
            "total_income": data["income"],
            "categories": categories_list
        })

    return jsonify({"months": months}), 200


@reports_bp.route("/api/reports/by-category", methods=["GET"])
@login_required
def get_category_report() -> tuple:
    """
    Get spending aggregated by category.
    Refunds are netted against their original transactions.

    Query params:
    - start_date: Filter from this date (YYYY-MM-DD), optional
    - end_date: Filter until this date (YYYY-MM-DD), optional

    Returns:
    {
        "categories": [
            {
                "category_id": "...",
                "category_name": "Food",
                "total": 150000,  // cents, net of refunds
                "transaction_count": 25
            },
            ...
        ],
        "total_expenses": 500000
    }
    """
    query = Transaction.query.filter(Transaction.user_id == g.user_id)

    start_date = request.args.get("start_date")
    if start_date:
        query = query.filter(Transaction.date >= datetime.strptime(start_date, "%Y-%m-%d").date())

    end_date = request.args.get("end_date")
    if end_date:
        query = query.filter(Transaction.date <= datetime.strptime(end_date, "%Y-%m-%d").date())

    transactions = query.all()

    # Get all categories for name lookup
    categories = Category.query.filter_by(user_id=g.user_id).all()
    category_names = {str(c.id): c.name for c in categories}

    # Aggregate by category
    category_data: dict = defaultdict(lambda: {"total": 0, "count": 0})

    for t in transactions:
        # Skip linked refunds and income
        if t.refund_of_transaction_id or t.direction != "expense":
            continue

        amount_cents = int(t.amount * 100)
        refund_total = sum(int(r.amount * 100) for r in t.refunds)
        net_amount = amount_cents - refund_total

        category_key = str(t.category_id) if t.category_id else "uncategorized"
        category_data[category_key]["total"] += net_amount
        category_data[category_key]["count"] += 1

    # Format response
    categories_list = []
    for cat_id, data in category_data.items():
        if data["total"] == 0:
            continue
        categories_list.append({
            "category_id": cat_id if cat_id != "uncategorized" else None,
            "category_name": category_names.get(cat_id, "Uncategorized"),
            "total": data["total"],
            "transaction_count": data["count"]
        })

    categories_list.sort(key=lambda x: x["total"], reverse=True)
    total_expenses = sum(c["total"] for c in categories_list)

    return jsonify({
        "categories": categories_list,
        "total_expenses": total_expenses
    }), 200


@reports_bp.route("/api/reports/by-vendor", methods=["GET"])
@login_required
def get_vendor_report() -> tuple:
    """
    Get spending aggregated by vendor.
    Refunds are netted against their original transactions.

    Query params:
    - start_date: Filter from this date (YYYY-MM-DD), optional
    - end_date: Filter until this date (YYYY-MM-DD), optional
    - limit: Max vendors to return (default 20)

    Returns:
    {
        "vendors": [
            {
                "vendor": "Amazon",
                "total": 150000,  // cents, net of refunds
                "transaction_count": 25
            },
            ...
        ],
        "total_expenses": 500000,
        "vendor_count": 50
    }
    """
    query = Transaction.query.filter(Transaction.user_id == g.user_id)

    start_date = request.args.get("start_date")
    if start_date:
        query = query.filter(Transaction.date >= datetime.strptime(start_date, "%Y-%m-%d").date())

    end_date = request.args.get("end_date")
    if end_date:
        query = query.filter(Transaction.date <= datetime.strptime(end_date, "%Y-%m-%d").date())

    limit = request.args.get("limit", 20, type=int)

    transactions = query.all()

    # Aggregate by vendor (case-insensitive)
    vendor_data: dict = defaultdict(lambda: {"total": 0, "count": 0, "display_name": ""})

    for t in transactions:
        # Skip linked refunds and income
        if t.refund_of_transaction_id or t.direction != "expense":
            continue

        amount_cents = int(t.amount * 100)
        refund_total = sum(int(r.amount * 100) for r in t.refunds)
        net_amount = amount_cents - refund_total

        vendor_key = t.vendor.lower()
        vendor_data[vendor_key]["total"] += net_amount
        vendor_data[vendor_key]["count"] += 1
        # Keep the most recent display name
        vendor_data[vendor_key]["display_name"] = t.vendor

    # Format response
    vendors_list = []
    for vendor_key, data in vendor_data.items():
        if data["total"] == 0:
            continue
        vendors_list.append({
            "vendor": data["display_name"],
            "total": data["total"],
            "transaction_count": data["count"]
        })

    vendors_list.sort(key=lambda x: x["total"], reverse=True)
    total_expenses = sum(v["total"] for v in vendors_list)
    vendor_count = len(vendors_list)

    # Apply limit
    vendors_list = vendors_list[:limit]

    return jsonify({
        "vendors": vendors_list,
        "total_expenses": total_expenses,
        "vendor_count": vendor_count
    }), 200
