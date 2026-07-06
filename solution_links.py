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

# Lower priority number wins when the same problem appears on multiple pages.
SOURCE_DIRS = [
    ("Programming/DSA Patterns", 0),
    ("Programming/DSA Sheets/Blind 75", 1),
]


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


def build_solution_links(site_dir: Path) -> dict[str, str]:
    if not site_dir.is_dir():
        raise FileNotFoundError(f"Brewing Intelligence site directory not found: {site_dir}")

    merged: dict[int, tuple[int, str]] = {}

    for source_subdir, priority in SOURCE_DIRS:
        source_path = site_dir / source_subdir
        if not source_path.is_dir():
            continue

        for html_path in sorted(source_path.rglob("index.html")):
            for lc_id, url in extract_links_from_html(html_path, site_dir).items():
                existing = merged.get(lc_id)
                if existing is None or priority < existing[0]:
                    merged[lc_id] = (priority, url)

    return {str(lc_id): url for lc_id, (_, url) in sorted(merged.items())}


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
