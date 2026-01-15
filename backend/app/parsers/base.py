from abc import ABC, abstractmethod
from typing import TypedDict


class ParsedTransaction(TypedDict):
    date: str
    vendor: str
    description: str
    amount_cents: int
    direction: str
    source: str
    original_category: str


class BaseParser(ABC):
    """Base class for bank CSV parsers."""

    # Unique identifier for this bank
    source_name: str = "unknown"

    # Headers that identify this bank's CSV format
    identifying_headers: list[str] = []

    @classmethod
    def can_parse(cls, headers: list[str]) -> bool:
        """Check if this parser can handle the given CSV headers."""
        headers_lower = [h.lower().strip() for h in headers]
        return all(
            h.lower() in headers_lower
            for h in cls.identifying_headers
        )

    @abstractmethod
    def parse(self, content: str) -> list[ParsedTransaction]:
        """Parse CSV content and return list of transactions."""
        pass
