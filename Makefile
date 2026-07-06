.PHONY: refresh normalize generate validate tags solutions

PYTHON := ./.venv/bin/python

refresh: tags normalize solutions generate validate
	@echo "Done. Refresh the browser to load updated data."

tags:
	$(PYTHON) validate_question_tags.py

normalize:
	$(PYTHON) normalize_categories.py

solutions:
	$(PYTHON) solution_links.py

generate:
	$(PYTHON) generate_data_js.py
	$(PYTHON) compute_overlaps.py

validate:
	$(PYTHON) validate_data.py

venv:
	python3 -m venv .venv
	./.venv/bin/pip install pandas openpyxl
