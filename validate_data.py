"""Validate DSA Sheet and generated JSON/JS outputs."""

import json
import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd

from categories import CANONICAL_CATEGORIES, KNOWN_SOURCE_LISTS, normalize_category
from load_data import FILE_PATH, PROJECT_DIR, SHEET_NAME, build_combinations, build_questions

VALID_DIFFICULTIES = {"Easy", "Medium", "Hard"}
LEETCODE_URL = re.compile(r"^https://leetcode\.com/problems/.+/$")


class ValidationReport:
    def __init__(self):
        self.errors = []
        self.warnings = []

    def error(self, message):
        self.errors.append(message)

    def warn(self, message):
        self.warnings.append(message)

    def ok(self):
        return len(self.errors) == 0


def validate_excel(report: ValidationReport):
    df = pd.read_excel(FILE_PATH, sheet_name=SHEET_NAME)
    required = {
        "LeetCode ID",
        "Question Name",
        "Difficulty",
        "Category",
        "Source Lists",
        "LeetCode Link",
    }
    missing_cols = required - set(df.columns)
    if missing_cols:
        report.error(f"Missing Excel columns: {sorted(missing_cols)}")
        return df

    if len(df) == 0:
        report.error("Excel sheet is empty")
        return df

    ids = []
    names = Counter()
    for idx, row in df.iterrows():
        row_num = idx + 2
        qid = row["LeetCode ID"]
        name = row["Question Name"]

        if pd.isna(qid):
            report.error(f"Row {row_num}: missing LeetCode ID")
        else:
            ids.append(int(qid))

        if not isinstance(name, str) or not name.strip():
            report.error(f"Row {row_num}: missing Question Name")
        else:
            names[name.strip()] += 1

        difficulty = str(row["Difficulty"]).strip()
        if difficulty not in VALID_DIFFICULTIES:
            report.error(f"Row {row_num} ({name}): invalid difficulty '{difficulty}'")

        category = normalize_category(row["Category"], name)
        if category not in CANONICAL_CATEGORIES and category != "Uncategorized":
            report.warn(f"Row {row_num} ({name}): non-canonical category '{category}'")

        sources = [s.strip() for s in str(row.get("Source Lists", "")).split(",") if s.strip()]
        if not sources:
            report.error(f"Row {row_num} ({name}): no Source Lists")
        for source in sources:
            if source not in KNOWN_SOURCE_LISTS:
                report.error(f"Row {row_num} ({name}): unknown source list '{source}'")

        link = row.get("LeetCode Link")
        if pd.isna(link) or not str(link).strip():
            report.warn(f"Row {row_num} ({name}): missing LeetCode Link")
        else:
            parsed = urlparse(str(link).strip())
            if parsed.scheme not in {"http", "https"} or not LEETCODE_URL.match(str(link).strip()):
                report.warn(f"Row {row_num} ({name}): unexpected link format '{link}'")

    duplicate_ids = [qid for qid, count in Counter(ids).items() if count > 1]
    if duplicate_ids:
        report.error(f"Duplicate LeetCode IDs: {sorted(duplicate_ids)}")

    duplicate_names = [name for name, count in names.items() if count > 1]
    if duplicate_names:
        report.error(f"Duplicate question names: {duplicate_names[:5]}{'...' if len(duplicate_names) > 5 else ''}")

    return df


def validate_generated_questions(report: ValidationReport, questions):
    if len(questions) != 300:
        report.warn(f"Expected 300 questions, found {len(questions)}")

    for q in questions:
        if "tags" not in q:
            report.error(f"{q['name']}: missing tags field")
        elif not q.get("tags"):
            report.error(f"{q['name']}: empty tags list")
        if not q.get("original_category"):
            report.error(f"{q['name']}: missing original_category")
        if "solution_link" not in q:
            report.error(f"{q['name']}: missing solution_link field")

    with_solutions = sum(1 for q in questions if q.get("solution_link"))
    if with_solutions == 0:
        report.warn("No Brewing Intelligence solution links attached")
    else:
        coverage = with_solutions / len(questions) * 100 if questions else 0
        report.warn(
            f"Brewing Intelligence solution coverage: {with_solutions}/{len(questions)} ({coverage:.1f}%)"
        )

    combinations = build_combinations(questions)
    combo_total = sum(v["count"] for v in combinations.values())
    if combo_total != len(questions):
        report.error(
            f"Combination partition mismatch: {combo_total} slotted vs {len(questions)} questions"
        )


def validate_output_files(report: ValidationReport, questions):
    data_js = PROJECT_DIR / "data.js"
    venn_json = PROJECT_DIR / "venn_data.json"

    if not data_js.exists():
        report.error("Missing data.js")
    if not venn_json.exists():
        report.error("Missing venn_data.json")
    if report.errors:
        return

    js_text = data_js.read_text()
    if "original_category" not in js_text or "tags" not in js_text:
        report.error("data.js missing original_category or tags fields")
    if "solution_link" not in js_text:
        report.error("data.js missing solution_link field")

    with open(venn_json) as f:
        payload = json.load(f)

    json_questions = payload.get("raw_questions", [])
    if len(json_questions) != len(questions):
        report.error(
            f"venn_data.json question count mismatch: {len(json_questions)} vs {len(questions)}"
        )


def main():
    report = ValidationReport()
    validate_excel(report)
    questions = build_questions()
    validate_generated_questions(report, questions)
    validate_output_files(report, questions)

    print("Validation report")
    print("=================")
    print(f"Errors:   {len(report.errors)}")
    print(f"Warnings: {len(report.warnings)}")

    if report.errors:
        print("\nErrors:")
        for item in report.errors:
            print(f"  - {item}")

    if report.warnings:
        print("\nWarnings:")
        for item in report.warnings[:20]:
            print(f"  - {item}")
        if len(report.warnings) > 20:
            print(f"  ... and {len(report.warnings) - 20} more")

    if report.ok():
        print("\nAll validation checks passed.")
        return 0

    print("\nValidation failed.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
