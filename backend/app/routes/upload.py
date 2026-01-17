from flask import Blueprint, request, jsonify

from app.parsers import parse_csv
from app.auth import login_required

upload_bp = Blueprint("upload", __name__)


@upload_bp.route("/api/upload", methods=["POST"])
@login_required
def upload_csv() -> tuple:
    print("Received upload request")

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not file.filename.endswith(".csv"):
        return jsonify({"error": "File must be a CSV"}), 400

    # Read the file content
    content = file.read().decode("utf-8")

    # Auto-detect bank and parse
    transactions, bank = parse_csv(content)

    if bank is None:
        return jsonify({
            "error": "Unrecognized CSV format. Supported banks: Chase, Capital One, Charles Schwab"
        }), 400

    print(f"Detected bank: {bank}")
    print(f"Parsed {len(transactions)} transactions from {file.filename}")

    return jsonify({
        "success": True,
        "filename": file.filename,
        "bank": bank,
        "count": len(transactions),
        "transactions": transactions,
    }), 200
