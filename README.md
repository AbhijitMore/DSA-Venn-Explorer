# DSA Venn Explorer (source)

Private source for the [DSA Venn Explorer](https://abhijitmore.github.io/DSA-Venn-Explorer/) interactive app.

Explore 300 consolidated LeetCode questions across Blind 75, Grind 75, LeetCode Top 150, and NeetCode 150. Solution links point to write-ups on [Brewing Intelligence](https://abhijitmore.github.io/BrewingIntelligence/).

Built static files are published to the public [AbhijitMore/DSA-Venn-Explorer](https://github.com/AbhijitMore/DSA-Venn-Explorer) repo on the `gh-pages` branch.

## Local development

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install pandas openpyxl

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
3. Builds LeetCode → Brewing Intelligence solution URLs (`solution_links.py`)
4. Generates `data.js` and `venn_data.json`
5. Validates outputs

## Deploy

Push to `main` on this repo. GitHub Actions publishes the static app to the public Pages repo.

## Related

- [Brewing Intelligence](https://abhijitmore.github.io/BrewingIntelligence/) — DSA pattern solutions
- [abhijitmore.github.io](https://abhijitmore.github.io/) — blog and project index
