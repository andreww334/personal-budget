#!/usr/bin/env python3
"""
Script to set a password for an existing user.
Run from the backend directory with the virtual environment activated:

    cd backend
    source venv/bin/activate
    python scripts/set_user_password.py <email> <password>

Or set password interactively:
    python scripts/set_user_password.py <email>
"""

import sys
import getpass
from pathlib import Path

# Add the backend directory to the path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.create_app import create_app
from app.extensions import db
from app.models import User


def set_password(email: str, password: str) -> bool:
    """Set password for a user by email."""
    app = create_app()

    with app.app_context():
        user = User.query.filter_by(email=email.lower()).first()

        if not user:
            print(f"Error: User with email '{email}' not found.")
            return False

        if len(password) < 8:
            print("Error: Password must be at least 8 characters.")
            return False

        user.set_password(password)
        db.session.commit()

        print(f"Password set successfully for user: {user.name} ({user.email})")
        return True


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python set_user_password.py <email> [password]")
        print("If password is not provided, you will be prompted to enter it.")
        sys.exit(1)

    email = sys.argv[1]

    if len(sys.argv) >= 3:
        password = sys.argv[2]
    else:
        password = getpass.getpass("Enter new password: ")
        confirm = getpass.getpass("Confirm password: ")

        if password != confirm:
            print("Error: Passwords do not match.")
            sys.exit(1)

    success = set_password(email, password)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
