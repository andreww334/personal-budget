import csv
from io import StringIO

from app.parsers.base import BaseParser, ParsedTransaction
from app.parsers.chase import ChaseParser
from app.parsers.capital_one import CapitalOneParser
from app.parsers.schwab import SchwabParser

# Register all available parsers
PARSERS: list[type[BaseParser]] = [
    ChaseParser,
    CapitalOneParser,
    SchwabParser,
]


def detect_bank(content: str) -> type[BaseParser] | None:
    """Detect which bank the CSV is from based on headers."""
    # Read just the header row
    reader = csv.reader(StringIO(content))
    try:
        headers = next(reader)
    except StopIteration:
        return None

    # Try each parser
    for parser_class in PARSERS:
        if parser_class.can_parse(headers):
            return parser_class

    return None


def parse_csv(content: str) -> tuple[list[ParsedTransaction], str | None]:
    """
    Auto-detect bank and parse CSV content.

    Returns:
        Tuple of (transactions list, detected bank name or None if unknown)
    """
    parser_class = detect_bank(content)

    if parser_class is None:
        return [], None

    parser = parser_class()
    transactions = parser.parse(content)

    return transactions, parser.source_name


__all__ = [
    "ParsedTransaction",
    "parse_csv",
    "detect_bank",
    "PARSERS",
]
