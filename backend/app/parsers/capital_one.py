import csv
from datetime import datetime
from io import StringIO

from app.parsers.base import BaseParser, ParsedTransaction


class CapitalOneParser(BaseParser):
    """Parser for Capital One CSV exports."""

    source_name = "capital_one"
    identifying_headers = ["Transaction Date", "Posted Date", "Card No.", "Description", "Debit", "Credit"]

    def parse(self, content: str) -> list[ParsedTransaction]:
        """
        Parse a Capital One CSV export.

        Capital One CSV format:
        Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit
        """
        transactions: list[ParsedTransaction] = []
        reader = csv.DictReader(StringIO(content))

        for row in reader:
            if not row.get("Transaction Date"):
                continue

            # Parse date (YYYY-MM-DD format)
            try:
                date = datetime.strptime(row["Transaction Date"], "%Y-%m-%d").date()
            except ValueError:
                continue

            # Capital One uses separate Debit/Credit columns
            debit_str = row.get("Debit", "").strip()
            credit_str = row.get("Credit", "").strip()

            try:
                if debit_str:
                    amount_dollars = float(debit_str)
                    direction = "expense"
                elif credit_str:
                    amount_dollars = float(credit_str)
                    direction = "income"
                else:
                    continue  # Skip rows with no amount
            except ValueError:
                continue

            amount_cents = abs(int(round(amount_dollars * 100)))

            transactions.append({
                "date": date.isoformat(),
                "vendor": row.get("Description", "").strip(),
                "description": "",
                "amount_cents": amount_cents,
                "direction": direction,
                "source": self.source_name,
                "original_category": row.get("Category", "").strip(),
            })

        return transactions
