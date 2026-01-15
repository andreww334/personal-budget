import csv
from datetime import datetime
from io import StringIO

from app.parsers.base import BaseParser, ParsedTransaction


class ChaseParser(BaseParser):
    """Parser for Chase bank CSV exports."""

    source_name = "chase"
    identifying_headers = ["Transaction Date", "Post Date", "Description", "Category", "Type", "Amount"]

    def parse(self, content: str) -> list[ParsedTransaction]:
        """
        Parse a Chase bank CSV export.

        Chase CSV format:
        Transaction Date, Post Date, Description, Category, Type, Amount, Memo
        """
        transactions: list[ParsedTransaction] = []
        reader = csv.DictReader(StringIO(content))

        for row in reader:
            if not row.get("Transaction Date"):
                continue

            # Parse date (MM/DD/YYYY format)
            try:
                date = datetime.strptime(row["Transaction Date"], "%m/%d/%Y").date()
            except ValueError:
                continue

            # Parse amount - Chase uses negative for expenses
            try:
                amount_dollars = float(row.get("Amount", "0").strip())
            except ValueError:
                continue

            amount_cents = abs(int(round(amount_dollars * 100)))
            direction = "income" if amount_dollars > 0 else "expense"

            transactions.append({
                "date": date.isoformat(),
                "vendor": row.get("Description", "").strip(),
                "description": row.get("Memo", "").strip(),
                "amount_cents": amount_cents,
                "direction": direction,
                "source": self.source_name,
                "original_category": row.get("Category", "").strip(),
            })

        return transactions
