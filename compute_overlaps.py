from load_data import PROJECT_DIR, build_combinations, build_questions, write_venn_json

questions = build_questions()
combinations = build_combinations(questions)

print("Subset sizes:")
for key, val in combinations.items():
    print(f"Combination {key} ({', '.join(val['in_lists'])}): {val['count']} questions")

output_path = write_venn_json(questions, combinations)
print(f"Data written to {output_path}")
