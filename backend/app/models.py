import uuid
from datetime import datetime

from sqlalchemy.dialects.postgresql import UUID
from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    categories = db.relationship("Category", backref="user", lazy=True)
    transactions = db.relationship("Transaction", backref="user", lazy=True)

    def __repr__(self):
        return f"<User {self.email}>"


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(255), nullable=False)

    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    transactions = db.relationship("Transaction", backref="category", lazy=True)

    def __repr__(self):
        return f"<Category {self.name}>"


class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"), nullable=False, index=True)
    category_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("categories.id"),
        nullable=True,
        index=True
    )

    description = db.Column(db.Text, nullable=True)
    vendor = db.Column(db.String(255), nullable=False, index=True)

    amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(3), nullable=False, default="USD")

    direction = db.Column(
        db.Enum("income", "expense", name="transaction_direction"),
        nullable=False
    )

    date = db.Column(db.Date, nullable=False, index=True)

    source = db.Column(db.String(50), nullable=False)

    refund_of_transaction_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("transactions.id"),
        nullable=True
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Self-referential relationship for refunds
    refunds = db.relationship(
        "Transaction",
        backref=db.backref("original_transaction", remote_side=[id]),
        lazy=True
    )

    def __repr__(self):
        return f"<Transaction {self.vendor} {self.amount}>"