"""
Script to create a default user for development.
Run from backend directory: python -m scripts.create_default_user
"""

from app.create_app import create_app
from app.extensions import db
from app.models import User

app = create_app()

with app.app_context():
    # Check if default user exists
    existing = User.query.filter_by(email="default@budget.local").first()

    if existing:
        print(f"Default user already exists:")
        print(f"  ID: {existing.id}")
        print(f"  Email: {existing.email}")
    else:
        user = User(
            name="Default User",
            email="default@budget.local"
        )
        db.session.add(user)
        db.session.commit()

        print(f"Created default user:")
        print(f"  ID: {user.id}")
        print(f"  Email: {user.email}")

    print("\nAdd this to your backend/.env file:")
    user = User.query.filter_by(email="default@budget.local").first()
    print(f"DEFAULT_USER_ID={user.id}")
