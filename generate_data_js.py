import json
from pathlib import Path

from load_data import PROJECT_DIR, build_combinations, build_questions, write_data_js

questions = build_questions()
combinations = build_combinations(questions)
output_path = write_data_js(questions, combinations)
print(f"data.js written successfully to {output_path}")
