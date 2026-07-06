"""Validate solution_links.json structure without a local BI site build."""

import json
import sys
from pathlib import Path

OUTPUT_PATH = Path(__file__).resolve().parent / "solution_links.json"
SHEET_NAMES = {"Blind 75", "Grind 75", "LeetCode Top 150", "NeetCode 150"}


def main() -> int:
    if not OUTPUT_PATH.exists():
        print(f"Error: missing {OUTPUT_PATH}", file=sys.stderr)
        return 1

    payload = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    errors = []

    for lc_id, record in payload.items():
        if not lc_id.isdigit():
            errors.append(f"{lc_id}: key must be numeric LeetCode ID")
            continue
        if not isinstance(record, dict):
            errors.append(f"{lc_id}: expected object record")
            continue
        if not record.get("default"):
            errors.append(f"{lc_id}: missing default URL")
        if record.get("sheet") and record["sheet"] not in SHEET_NAMES:
            errors.append(f"{lc_id}: invalid sheet {record['sheet']}")
        by_sheet = record.get("by_sheet", {})
        if not isinstance(by_sheet, dict) or not by_sheet:
            errors.append(f"{lc_id}: missing by_sheet map")
        elif record.get("default") not in by_sheet.values():
            errors.append(f"{lc_id}: default URL not present in by_sheet")

    print("Solution record validation")
    print("==========================")
    print(f"Records: {len(payload)}")
    print(f"Errors:  {len(errors)}")

    if errors:
        for error in errors[:20]:
            print(f"  - {error}")
        return 1

    print("All solution records validated.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
