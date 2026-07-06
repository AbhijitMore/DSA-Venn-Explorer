"""Ensure every question in the sheet has tags defined."""

import sys

from load_data import build_questions
from question_tags import QUESTION_TAGS


def main():
    questions = build_questions()
    missing = [q["name"] for q in questions if q["name"] not in QUESTION_TAGS]
    empty = [q["name"] for q in questions if not QUESTION_TAGS.get(q["name"])]

    print(f"Total questions: {len(questions)}")
    print(f"Tag definitions: {len(QUESTION_TAGS)}")
    print(f"Missing definitions: {len(missing)}")
    print(f"Empty tag lists: {len(empty)}")

    if missing:
        print("\nMissing:")
        for name in missing:
            print(f"  - {name}")
    if empty:
        print("\nEmpty:")
        for name in empty:
            print(f"  - {name}")

    if missing or empty:
        return 1
    print("All questions tagged.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
