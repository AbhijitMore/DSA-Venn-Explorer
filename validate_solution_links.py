"""Validate Brewing Intelligence solution link anchors."""

import sys
from pathlib import Path

from load_data import build_questions
from solution_links import DEFAULT_SITE_DIR, build_solution_links, choose_sheet, load_sheet_link_maps


def validate_solution_links(site_dir: Path | None = None) -> int:
    site_dir = site_dir or DEFAULT_SITE_DIR
    if not site_dir.is_dir():
        print(f"Error: site directory not found: {site_dir}", file=sys.stderr)
        return 1

    sheet_maps = load_sheet_link_maps(site_dir)
    links = build_solution_links(site_dir)
    questions = build_questions(attach_solutions=False)
    errors = []

    for question in questions:
        qid = question["id"]
        expected_sheet = choose_sheet(question["sources"])
        url = links.get(str(qid))

        if not url:
            errors.append(f"#{qid} {question['name']}: missing solution link")
            continue

        if expected_sheet:
            expected_prefix = expected_sheet.replace(" ", "%20")
            if expected_prefix not in url:
                errors.append(
                    f"#{qid} {question['name']}: expected {expected_sheet}, got {url}"
                )

        page_url, _, anchor = url.partition("#")
        rel = page_url.replace("https://abhijitmore.github.io/BrewingIntelligence/", "")
        rel = rel.replace("%20", " ").strip("/")
        html_path = site_dir / rel / "index.html"
        if not html_path.exists():
            errors.append(f"#{qid} {question['name']}: missing page {html_path}")
            continue
        if anchor and f'id="{anchor}"' not in html_path.read_text(encoding="utf-8", errors="ignore"):
            errors.append(f"#{qid} {question['name']}: missing anchor #{anchor}")

    print("Solution link validation")
    print("======================")
    print(f"Questions: {len(questions)}")
    print(f"Links:     {len(links)}")
    print(f"Errors:    {len(errors)}")

    if errors:
        print("\nErrors:")
        for error in errors[:25]:
            print(f"  - {error}")
        if len(errors) > 25:
            print(f"  ... and {len(errors) - 25} more")
        return 1

    print("\nAll solution links validated.")
    return 0


if __name__ == "__main__":
    sys.exit(validate_solution_links())
