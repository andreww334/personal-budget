import csv
from datetime import datetime
from io import StringIO

from app.parsers.base import BaseParser, ParsedTransaction


class SchwabParser(BaseParser):
    """Parser for Charles Schwab CSV exports."""

    source_name = "schwab"
    identifying_headers = ["Date", "Status", "Type", "Description", "Withdrawal", "Deposit", "RunningBalance"]

    def parse(self, content: str) -> list[ParsedTransaction]:
        """
        Parse a Charles Schwab CSV export.

        Schwab CSV format:
        Date, Status, Type, CheckNumber, Description, Withdrawal, Deposit, RunningBalance
        """
        transactions: list[ParsedTransaction] = []
        reader = csv.DictReader(StringIO(content))

        for row in reader:
            if not row.get("Date"):
                continue

            # Parse date (MM/DD/YYYY format)
            try:
                date = datetime.strptime(row["Date"], "%m/%d/%Y").date()
            except ValueError:
                continue

            # Schwab uses separate Withdrawal/Deposit columns with $ prefix
            withdrawal_str = row.get("Withdrawal", "").strip().replace("$", "").replace(",", "")
            deposit_str = row.get("Deposit", "").strip().replace("$", "").replace(",", "")

            try:
                if withdrawal_str:
                    amount_dollars = float(withdrawal_str)
                    direction = "expense"
                elif deposit_str:
                    amount_dollars = float(deposit_str)
                    direction = "income"
                else:
                    continue  # Skip rows with no amount
            except ValueError:
                continue

            amount_cents = abs(int(round(amount_dollars * 100)))

            # Use Type as category for Schwab
            transaction_type = row.get("Type", "").strip()

            transactions.append({
                "date": date.isoformat(),
                "vendor": row.get("Description", "").strip(),
                "description": "",
                "amount_cents": amount_cents,
                "direction": direction,
                "source": self.source_name,
                "original_category": transaction_type,
            })

        return transactions
