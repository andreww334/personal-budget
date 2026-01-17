#!/usr/bin/env python3
"""
Script to create a new user.
Run from the backend directory with the virtual environment activated:

    cd backend
    source venv/bin/activate
    python scripts/create_user.py <name> <email> <password>

Or create user interactively:
    python scripts/create_user.py
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


def create_user(name: str, email: str, password: str) -> bool:
    """Create a new user."""
    app = create_app()

    with app.app_context():
        # Check if user already exists
        existing = User.query.filter_by(email=email.lower()).first()
        if existing:
            print(f"Error: User with email '{email}' already exists.")
            return False

        if len(password) < 8:
            print("Error: Password must be at least 8 characters.")
            return False

        if not name.strip():
            print("Error: Name is required.")
            return False

        user = User(name=name.strip(), email=email.lower().strip())
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        print(f"User created successfully!")
        print(f"  ID: {user.id}")
        print(f"  Name: {user.name}")
        print(f"  Email: {user.email}")
        return True


def main() -> None:
    if len(sys.argv) >= 4:
        name = sys.argv[1]
        email = sys.argv[2]
        password = sys.argv[3]
    elif len(sys.argv) == 1:
        # Interactive mode
        print("Create a new user")
        print("-" * 20)
        name = input("Name: ").strip()
        email = input("Email: ").strip()
        password = getpass.getpass("Password: ")
        confirm = getpass.getpass("Confirm password: ")

        if password != confirm:
            print("Error: Passwords do not match.")
            sys.exit(1)
    else:
        print("Usage: python create_user.py [name] [email] [password]")
        print("If no arguments provided, you will be prompted interactively.")
        sys.exit(1)

    success = create_user(name, email, password)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
