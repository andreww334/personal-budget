import csv
from datetime import datetime
from io import StringIO
from typing import TypedDict


class ParsedTransaction(TypedDict):
    date: str
    vendor: str
    description: str
    amount_cents: int
    direction: str
    source: str
    original_category: str


def parse_chase_csv(content: str) -> list[ParsedTransaction]:
    """
    Parse a Chase bank CSV export into transaction dictionaries.

    Chase CSV format:
    Transaction Date, Post Date, Description, Category, Type, Amount, Memo

    Returns list of parsed transactions ready for preview/commit.
    """
    transactions: list[ParsedTransaction] = []

    reader = csv.DictReader(StringIO(content))

    for row in reader:
        # Skip empty rows
        if not row.get("Transaction Date"):
            continue

        # Parse date (MM/DD/YYYY format)
        date_str = row["Transaction Date"]
        try:
            date = datetime.strptime(date_str, "%m/%d/%Y").date()
        except ValueError:
            continue  # Skip invalid dates

        # Parse amount - Chase uses negative for expenses
        amount_str = row.get("Amount", "0").strip()
        try:
            amount_dollars = float(amount_str)
        except ValueError:
            continue  # Skip invalid amounts

        # Convert to cents (absolute value)
        amount_cents = abs(int(round(amount_dollars * 100)))

        # Determine direction based on sign
        direction = "income" if amount_dollars > 0 else "expense"

        # Extract vendor from Description
        vendor = row.get("Description", "").strip()

        # Use Memo as description, or Category if no memo
        memo = row.get("Memo", "").strip()
        description = memo if memo else ""

        # Keep original Chase category for reference
        original_category = row.get("Category", "").strip()

        transactions.append({
            "date": date.isoformat(),
            "vendor": vendor,
            "description": description,
            "amount_cents": amount_cents,
            "direction": direction,
            "source": "chase",
            "original_category": original_category,
        })

    return transactions
