from flask import Blueprint, request, jsonify

from app.parsers.chase import parse_chase_csv

upload_bp = Blueprint("upload", __name__)


@upload_bp.route("/api/upload", methods=["POST"])
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

    # Parse the CSV (currently only Chase format)
    transactions = parse_chase_csv(content)

    print(f"Parsed {len(transactions)} transactions from {file.filename}")
    print(transactions)

    return jsonify({
        "success": True,
        "filename": file.filename,
        "count": len(transactions),
        "transactions": transactions,
    }), 200
