"""Validate committed data.js without the Excel workbook."""

import json
import re
import sys
from pathlib import Path

DATA_JS = Path(__file__).resolve().parent / "data.js"


def load_questions() -> list[dict]:
    text = DATA_JS.read_text(encoding="utf-8")
    match = re.search(r"raw_questions:\s*(\[.*\])\s*\};?\s*$", text, re.DOTALL)
    if not match:
        raise ValueError("Could not parse raw_questions from data.js")
    return json.loads(match.group(1))


def main() -> int:
    if not DATA_JS.exists():
        print(f"Error: missing {DATA_JS}", file=sys.stderr)
        return 1

    questions = load_questions()
    errors = []

    if len(questions) != 300:
        errors.append(f"expected 300 questions, found {len(questions)}")

    for question in questions:
        qid = question.get("id")
        if not question.get("solution_link"):
            errors.append(f"#{qid} {question.get('name')}: missing solution_link")
        if not question.get("solution_links"):
            errors.append(f"#{qid} {question.get('name')}: missing solution_links map")
        elif question["solution_link"] not in question["solution_links"].values():
            errors.append(f"#{qid} {question.get('name')}: default link not in solution_links")

    print("data.js validation")
    print("==================")
    print(f"Questions: {len(questions)}")
    print(f"Errors:    {len(errors)}")

    if errors:
        for error in errors[:20]:
            print(f"  - {error}")
        return 1

    print("data.js validated.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
