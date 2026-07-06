# DSA Venn Explorer

Interactive explorer for 300 consolidated LeetCode questions across Blind 75, Grind 75, LeetCode Top 150, and NeetCode 150. Solution links point to write-ups on [Brewing Intelligence](https://abhijitmore.github.io/BrewingIntelligence/).

**Live app:** [abhijitmore.github.io/DSA-Venn-Explorer](https://abhijitmore.github.io/DSA-Venn-Explorer/)

Deploys automatically on push to `main` via GitHub Actions (`GITHUB_TOKEN` → `gh-pages` branch). No personal access token required.

## Local development

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Serve the app
python3 -m http.server 8080
# Open http://localhost:8080
```

## Refresh data

Requires the consolidated Excel workbook and a built Brewing Intelligence site for solution links:

```bash
export DSA_EXCEL_PATH="/path/to/consolidated_interview_questions.xlsx"
export BREWING_INTELLIGENCE_SITE="/path/to/BrewingIntelligence/site"

make refresh
# or
./refresh.sh
```

This pipeline:

1. Validates question tags
2. Normalizes Excel categories
3. Builds LeetCode → Brewing Intelligence solution URLs (`solution_links.py`), including per-sheet maps for context-aware linking in the UI
4. Generates `data.js` and `venn_data.json`
5. Validates outputs (`validate_data.py`, `validate_solution_links.py`, `validate_data_js.py`)

## Canonical repo

The public [`AbhijitMore/DSA-Venn-Explorer`](https://github.com/AbhijitMore/DSA-Venn-Explorer) repo is the source of truth for the live site. The older private `-source` mirror can be archived.

## Deploy

Push to `main`. GitHub Actions builds and publishes to the `gh-pages` branch automatically.

## Related

- [Brewing Intelligence](https://abhijitmore.github.io/BrewingIntelligence/) — DSA pattern solutions
- [abhijitmore.github.io](https://abhijitmore.github.io/) — blog and project index
