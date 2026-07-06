"""Update Excel sheet: preserve Original Category, compute Tags, normalize Category."""

from pathlib import Path

import pandas as pd

from categories import format_tags, get_tags, infer_original_category, normalize_category, parse_tags
from load_data import FILE_PATH, SHEET_NAME

PROJECT_DIR = Path(__file__).resolve().parent


def _is_filled(value):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return False
    text = str(value).strip()
    return text != "" and text.lower() != "nan"


def main():
    df = pd.read_excel(FILE_PATH, sheet_name=SHEET_NAME)

    if "Original Category" not in df.columns:
        df["Original Category"] = None
    if "Tags" not in df.columns:
        df["Tags"] = None

    category_changes = []
    original_backfills = 0
    tag_updates = 0

    for idx, row in df.iterrows():
        name = row["Question Name"]
        sources = [s.strip() for s in str(row.get("Source Lists", "")).split(",") if s.strip()]
        current_category = row["Category"]

        if not _is_filled(row["Original Category"]):
            # If Category still uses a legacy label, preserve it directly.
            if str(current_category).strip() in {
                "Hashmap",
                "1D DP",
                "1-D DP",
                "2-D DP",
                "Multidimensional DP",
                "Kadane's Algorithm",
                "Array / String",
                "String",
                "Binary Tree General",
                "Binary Tree BFS",
                "Binary Search Tree",
                "Graph General",
                "Graph BFS",
                "Advanced Graphs",
                "Heap",
                "Trie",
            }:
                original = str(current_category).strip()
            else:
                canonical = normalize_category(current_category, name)
                original = infer_original_category(name, canonical, sources)
            df.at[idx, "Original Category"] = original
            original_backfills += 1

        canonical = normalize_category(current_category, name)
        if str(current_category) != canonical:
            category_changes.append((name, current_category, canonical))
        df.at[idx, "Category"] = canonical

        original = str(df.at[idx, "Original Category"]).strip()
        tags = get_tags(name, canonical, original)
        tag_text = format_tags(tags)
        if str(row.get("Tags", "")).strip() != tag_text:
            tag_updates += 1
        df.at[idx, "Tags"] = tag_text if tag_text else ""

    column_order = [
        "LeetCode ID",
        "Question Name",
        "Difficulty",
        "Category",
        "Original Category",
        "Tags",
        "Source Lists",
        "LeetCode Link",
    ]
    df = df[column_order]

    with pd.ExcelWriter(FILE_PATH, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
        df.to_excel(writer, sheet_name=SHEET_NAME, index=False)

    print(f"Updated sheet: {FILE_PATH}")
    print(f"  Original categories backfilled: {original_backfills}")
    print(f"  Category changes: {len(category_changes)}")
    print(f"  Tags written/updated: {tag_updates}")
    print(f"  Unique categories: {df['Category'].nunique()}")
    print(f"  Unique original categories: {df['Original Category'].nunique()}")
    print(f"  Questions with tags: {(df['Tags'].astype(str).str.strip() != '').sum()}")
    print("\nCategory counts:")
    print(df["Category"].value_counts().to_string())

    if category_changes:
        print("\nSample category changes:")
        for name, old, new in category_changes[:10]:
            print(f"  {name}: {old} -> {new}")


if __name__ == "__main__":
    main()
