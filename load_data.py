"""Shared Excel loader and Venn combination builder."""

import json
import os
from pathlib import Path

import pandas as pd

from solution_links import load_solution_links

from categories import (
    KNOWN_SOURCE_LISTS,
    format_tags,
    get_tags,
    normalize_category,
    parse_tags,
    resolve_original_category,
)

PROJECT_DIR = Path(__file__).resolve().parent
FILE_PATH = Path(
    os.environ.get(
        "DSA_EXCEL_PATH",
        "/Users/abhijit/Downloads/consolidated_interview_questions.xlsx",
    )
)
SHEET_NAME = "DSA Sheet"


def load_dataframe():
    df = pd.read_excel(FILE_PATH, sheet_name=SHEET_NAME)
    df["Source Lists"] = df["Source Lists"].fillna("").astype(str)
    return df


def row_to_question(row):
    name = row["Question Name"]
    sources = [s.strip() for s in row["Source Lists"].split(",") if s.strip()]
    category = normalize_category(row["Category"], name)
    original_category = resolve_original_category(row, sources)
    tags = parse_tags(row["Tags"]) if "Tags" in row and _is_filled(row["Tags"]) else get_tags(
        name, category, original_category
    )
    link = (
        row["LeetCode Link"]
        if "LeetCode Link" in row and pd.notna(row["LeetCode Link"])
        else f"https://leetcode.com/problems/{name.lower().replace(' ', '-')}/"
    )

    return {
        "id": int(row["LeetCode ID"]) if pd.notna(row["LeetCode ID"]) else 0,
        "name": str(name),
        "difficulty": str(row["Difficulty"]),
        "category": str(category),
        "original_category": str(original_category),
        "tags": tags,
        "link": str(link),
        "sources": sources,
    }


def attach_solution_links(questions, solution_links=None):
    if solution_links is None:
        solution_links = load_solution_links()

    for question in questions:
        question["solution_link"] = solution_links.get(str(question["id"]), "")
    return questions


def build_questions(df=None, attach_solutions=True):
    if df is None:
        df = load_dataframe()
    questions = [row_to_question(row) for _, row in df.iterrows()]
    if attach_solutions:
        attach_solution_links(questions)
    return questions


def build_combinations(questions, lists=None):
    if lists is None:
        lists = KNOWN_SOURCE_LISTS

    combinations_data = {}
    for i in range(1, 16):
        bin_str = format(i, "04b")
        in_lists = [lists[j] for j in range(4) if bin_str[j] == "1"]
        out_lists = [lists[j] for j in range(4) if bin_str[j] == "0"]

        matched = [
            q
            for q in questions
            if all(src in q["sources"] for src in in_lists)
            and all(src not in q["sources"] for src in out_lists)
        ]

        combinations_data[bin_str] = {
            "in_lists": in_lists,
            "out_lists": out_lists,
            "count": len(matched),
            "questions": matched,
        }

    return combinations_data


def write_data_js(questions, combinations_data, lists=None, output_path=None):
    if lists is None:
        lists = KNOWN_SOURCE_LISTS
    if output_path is None:
        output_path = PROJECT_DIR / "data.js"

    list_totals = {lst: sum(1 for q in questions if lst in q["sources"]) for lst in lists}
    content = f"""// Auto-generated data for Venn Diagram Web App
const VENN_DATA = {{
  lists: {json.dumps(lists)},
  list_totals: {json.dumps(list_totals)},
  combinations: {json.dumps(combinations_data)},
  raw_questions: {json.dumps(questions)}
}};
"""
    Path(output_path).write_text(content)
    return output_path


def write_venn_json(questions, combinations_data, lists=None, output_path=None):
    if lists is None:
        lists = KNOWN_SOURCE_LISTS
    if output_path is None:
        output_path = PROJECT_DIR / "venn_data.json"

    payload = {
        "lists": lists,
        "combinations": combinations_data,
        "raw_questions": questions,
    }
    with open(output_path, "w") as f:
        json.dump(payload, f, indent=2)
    return output_path


def _is_filled(value):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return False
    text = str(value).strip()
    return text != "" and text.lower() != "nan"
