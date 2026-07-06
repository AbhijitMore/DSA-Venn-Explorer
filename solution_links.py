"""Build LeetCode ID -> Brewing Intelligence solution URL mapping."""

import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import quote

PROJECT_DIR = Path(__file__).resolve().parent
DEFAULT_SITE_DIR = Path(
    os.environ.get(
        "BREWING_INTELLIGENCE_SITE",
        "/Users/abhijit/Desktop/Git Repos/BrewingIntelligence/site",
    )
)
OUTPUT_PATH = PROJECT_DIR / "solution_links.json"
BASE_URL = "https://abhijitmore.github.io/BrewingIntelligence"

HEADING_ID_RE = re.compile(r'id="([^"]*leetcode\d+[^"]*)"', re.IGNORECASE)
LEETCODE_ID_RE = re.compile(r"leetcode(\d+)$", re.IGNORECASE)

SHEET_DIRS = [
    ("Blind 75", "Programming/DSA Sheets/Blind 75"),
    ("NeetCode 150", "Programming/DSA Sheets/NeetCode 150"),
    ("LeetCode Top 150", "Programming/DSA Sheets/LeetCode Top 150"),
    ("Grind 75", "Programming/DSA Sheets/Grind 75"),
]

SHEET_PRIORITY = [name for name, _ in SHEET_DIRS]


def path_to_page_url(relative_html: Path) -> str:
    page_dir = relative_html.parent.as_posix()
    encoded = "/".join(quote(part, safe="") for part in page_dir.split("/"))
    return f"{BASE_URL}/{encoded}/"


def extract_links_from_html(html_path: Path, site_dir: Path) -> dict[int, str]:
    text = html_path.read_text(encoding="utf-8", errors="ignore")
    rel = html_path.relative_to(site_dir)
    page_url = path_to_page_url(rel)
    links: dict[int, str] = {}

    for match in HEADING_ID_RE.finditer(text):
        anchor_id = match.group(1)
        id_match = LEETCODE_ID_RE.search(anchor_id)
        if not id_match:
            continue
        lc_id = int(id_match.group(1))
        links[lc_id] = f"{page_url}#{anchor_id}"

    return links


def load_sheet_link_maps(site_dir: Path) -> dict[str, dict[int, str]]:
    maps: dict[str, dict[int, str]] = {}
    for sheet_name, subdir in SHEET_DIRS:
        sheet_path = site_dir / subdir
        if not sheet_path.is_dir():
            maps[sheet_name] = {}
            continue
        merged: dict[int, str] = {}
        for html_path in sorted(sheet_path.rglob("index.html")):
            merged.update(extract_links_from_html(html_path, site_dir))
        maps[sheet_name] = merged
    return maps


def load_question_sources() -> dict[int, list[str]]:
    try:
        from load_data import build_questions
    except ImportError:
        return {}

    sources_by_id: dict[int, list[str]] = {}
    for question in build_questions(attach_solutions=False):
        sources_by_id[question["id"]] = question.get("sources", [])
    return sources_by_id


def choose_sheet(sources: list[str]) -> str | None:
    for sheet_name in SHEET_PRIORITY:
        if sheet_name in sources:
            return sheet_name
    return None


def build_solution_links(site_dir: Path) -> dict[str, str]:
    if not site_dir.is_dir():
        raise FileNotFoundError(f"Brewing Intelligence site directory not found: {site_dir}")

    sheet_maps = load_sheet_link_maps(site_dir)
    sources_by_id = load_question_sources()
    merged: dict[int, str] = {}

    for lc_id, sources in sources_by_id.items():
        sheet_name = choose_sheet(sources)
        if not sheet_name:
            continue
        url = sheet_maps.get(sheet_name, {}).get(lc_id)
        if url:
            merged[lc_id] = url

    for sheet_name in SHEET_PRIORITY:
        for lc_id, url in sheet_maps.get(sheet_name, {}).items():
            merged.setdefault(lc_id, url)

    return {str(lc_id): url for lc_id, url in sorted(merged.items())}


def load_solution_links() -> dict[str, str]:
    if not OUTPUT_PATH.exists():
        return {}
    with open(OUTPUT_PATH, encoding="utf-8") as f:
        return json.load(f)


def write_solution_links(links: dict[str, str], output_path: Path | None = None) -> Path:
    path = output_path or OUTPUT_PATH
    with open(path, "w", encoding="utf-8") as f:
        json.dump(links, f, indent=2, sort_keys=True)
        f.write("\n")
    return path


def main() -> int:
    site_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SITE_DIR
    try:
        links = build_solution_links(site_dir)
    except FileNotFoundError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    output_path = write_solution_links(links)
    print(f"Mapped {len(links)} LeetCode problems to Brewing Intelligence solutions.")
    print(f"Written to {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
