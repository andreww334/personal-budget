from flask import Blueprint, request, jsonify

upload_bp = Blueprint("upload", __name__)


@upload_bp.route("/api/upload", methods=["POST"])
def upload_csv() -> tuple:
    print(f"Received upload request")

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not file.filename.endswith(".csv"):
        return jsonify({"error": "File must be a CSV"}), 400

    # Read the file content
    content = file.read().decode("utf-8")
    lines = content.strip().split("\n")
    print(f"Uploaded: {file.filename} ({len(lines) - 1} rows)")

    # Basic info about the uploaded file
    return jsonify({
        "success": True,
        "filename": file.filename,
        "rows": len(lines) - 1,  # Exclude header row
        "preview": lines[:5]  # First 5 lines for preview
    }), 200
