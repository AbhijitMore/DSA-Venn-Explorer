"""Canonical category normalization, original-category inference, and tags."""

from question_tags import QUESTION_TAGS

CATEGORY_MERGE_MAP = {
    "Hashmap": "Arrays & Hashing",
    "Arrays & Hashing": "Arrays & Hashing",
    "Kadane's Algorithm": "Dynamic Programming",
    "Array / String": "Arrays & Hashing",
    "String": "Arrays & Hashing",
    "Two Pointers": "Two Pointers",
    "Sliding Window": "Sliding Window",
    "Stack": "Stack",
    "Binary Search": "Binary Search",
    "Linked List": "Linked List",
    "Trees": "Trees",
    "Binary Tree General": "Trees",
    "Binary Tree BFS": "Trees",
    "Binary Search Tree": "Trees",
    "Heap": "Heap / Priority Queue",
    "Heap / Priority Queue": "Heap / Priority Queue",
    "Backtracking": "Backtracking",
    "Trie": "Tries",
    "Graphs": "Graphs",
    "Graph General": "Graphs",
    "Graph BFS": "Graphs",
    "Advanced Graphs": "Graphs",
    "1-D DP": "Dynamic Programming",
    "1D DP": "Dynamic Programming",
    "2-D DP": "Dynamic Programming",
    "Multidimensional DP": "Dynamic Programming",
    "Greedy": "Greedy",
    "Intervals": "Intervals",
    "Math": "Math & Geometry",
    "Math & Geometry": "Math & Geometry",
    "Bit Manipulation": "Bit Manipulation",
    "Matrix": "Matrix",
    "Divide & Conquer": "Divide & Conquer",
}

QUESTION_OVERRIDES = {
    "LRU Cache": "Design",
    "Min Stack": "Design",
    "Design Twitter": "Design",
    "Find Median from Data Stream": "Design",
    "Serialize and Deserialize Binary Tree": "Design",
    "Insert Delete GetRandom O(1)": "Design",
    "Time Based Key-Value Store": "Design",
    "Reverse Integer": "Math & Geometry",
    "Find the Duplicate Number": "Arrays & Hashing",
    "Trapping Rain Water": "Two Pointers",
    "Island Perimeter": "Graphs",
    "Merge k Sorted Lists": "Heap / Priority Queue",
    "Reshape the Matrix": "Matrix",
    "Best Time to Buy and Sell Stock": "Dynamic Programming",
    "Best Time to Buy and Sell Stock II": "Dynamic Programming",
}

CANONICAL_CATEGORIES = sorted(set(CATEGORY_MERGE_MAP.values()) | {"Design"})

KNOWN_SOURCE_LISTS = ["Blind 75", "Grind 75", "LeetCode Top 150", "NeetCode 150"]

BINARY_TREE_BFS = {
    "Average of Levels in Binary Tree",
    "Binary Tree Level Order Traversal",
    "Binary Tree Right Side View",
    "Binary Tree Zigzag Level Order Traversal",
}

BINARY_SEARCH_TREE = {
    "Binary Search Tree Iterator",
    "Kth Smallest Element in a BST",
    "Minimum Absolute Difference in BST",
    "Validate Binary Search Tree",
    "Find Mode in Binary Search Tree",
    "Lowest Common Ancestor of a Binary Search Tree",
    "Two Sum IV - Input is a BST",
}

GRAPH_BFS = {
    "Minimum Genetic Mutation",
    "Snakes and Ladders",
    "Word Ladder",
    "Rotting Oranges",
    "01 Matrix",
    "Walls and Gates",
}

ADVANCED_GRAPH = {
    "Alien Dictionary",
    "Cheapest Flights Within K Stops",
    "Min Cost to Connect All Points",
    "Network Delay Time",
    "Reconstruct Itinerary",
    "Swim in Rising Water",
}

GRAPH_GENERAL = {
    "Clone Graph",
    "Course Schedule",
    "Course Schedule II",
    "Evaluate Division",
    "Number of Islands",
    "Surrounded Regions",
}

ONE_D_DP = {
    "Climbing Stairs",
    "Coin Change",
    "House Robber",
    "Longest Increasing Subsequence",
    "Word Break",
}

TWO_D_DP = {
    "Best Time to Buy and Sell Stock with Cooldown",
    "Burst Balloons",
    "Coin Change II",
    "Distinct Subsequences",
    "Longest Common Subsequence",
    "Longest Increasing Path in a Matrix",
    "Regular Expression Matching",
    "Target Sum",
    "Unique Paths",
}

MULTI_DP = {
    "Best Time to Buy and Sell Stock III",
    "Best Time to Buy and Sell Stock IV",
    "Edit Distance",
    "Interleaving String",
    "Longest Palindromic Substring",
    "Maximal Square",
    "Minimum Path Sum",
    "Triangle",
    "Unique Paths II",
}

KADANE = {"Maximum Subarray", "Maximum Sum Circular Subarray"}

HASHMAP = {
    "Contains Duplicate II",
    "Group Anagrams",
    "Happy Number",
    "Isomorphic Strings",
    "Longest Consecutive Sequence",
    "Ransom Note",
    "Two Sum",
    "Valid Anagram",
    "Word Pattern",
}

ARRAY_STRING = {
    "Best Time to Buy and Sell Stock",
    "Best Time to Buy and Sell Stock II",
    "Candy",
    "Find the Index of the First Occurrence in a String",
    "Gas Station",
    "H-Index",
    "Insert Delete GetRandom O(1)",
    "Integer to Roman",
    "Jump Game",
    "Jump Game II",
    "Length of Last Word",
    "Longest Common Prefix",
    "Majority Element",
    "Merge Sorted Array",
    "Product of Array Except Self",
    "Remove Duplicates from Sorted Array",
    "Remove Duplicates from Sorted Array II",
    "Remove Element",
    "Reverse Words in a String",
    "Roman to Integer",
    "Rotate Array",
    "Text Justification",
    "Trapping Rain Water",
    "Zigzag Conversion",
}

STRING_ONLY = {
    "Detect Capital",
    "License Key Formatting",
    "Longest Uncommon Subsequence I",
    "Number of Segments in a String",
    "Repeated Substring Pattern",
    "Reverse String II",
    "String to Integer (atoi)",
    "Student Attendance Record I",
}


def normalize_category(category, question_name=None):
    if question_name and question_name in QUESTION_OVERRIDES:
        return QUESTION_OVERRIDES[question_name]

    if category is None or str(category).strip() == "" or str(category) == "nan":
        return "Uncategorized"

    normalized = CATEGORY_MERGE_MAP.get(str(category).strip())
    if normalized is None:
        return str(category).strip()

    return normalized


def infer_original_category(question_name, canonical_category, sources):
    """Best-effort original label when the sheet was normalized before preservation."""
    name = str(question_name)
    source_set = {s.strip() for s in sources if s and str(s).strip()}
    only_neetcode = source_set == {"NeetCode 150"}
    only_leetcode = source_set == {"LeetCode Top 150"}

    if name in HASHMAP:
        return "Hashmap"
    if name in KADANE:
        return "Kadane's Algorithm"
    if name in ONE_D_DP:
        return "1D DP"
    if name in TWO_D_DP:
        return "2-D DP"
    if name in MULTI_DP:
        return "Multidimensional DP"
    if name in ARRAY_STRING:
        return "Array / String"
    if name in STRING_ONLY:
        return "String"
    if name in BINARY_TREE_BFS:
        return "Binary Tree BFS"
    if name in BINARY_SEARCH_TREE:
        return "Binary Search Tree"
    if name in GRAPH_BFS:
        return "Graph BFS"
    if name in ADVANCED_GRAPH:
        return "Advanced Graphs"
    if name in GRAPH_GENERAL:
        return "Graph General"

    if canonical_category == "Trees":
        if only_neetcode:
            return "Binary Tree General"
        return "Trees"

    if canonical_category == "Graphs":
        if only_neetcode and name not in GRAPH_BFS and name not in ADVANCED_GRAPH:
            return "Graph General"
        return "Graphs"

    if canonical_category == "Dynamic Programming":
        if name in {"Best Time to Buy and Sell Stock", "Best Time to Buy and Sell Stock II"}:
            return "Array / String"
        return "1-D DP"

    if canonical_category == "Heap / Priority Queue":
        if name == "Design Twitter":
            return "Heap / Priority Queue"
        if name == "Merge k Sorted Lists":
            return "Divide & Conquer"
        if only_neetcode:
            return "Heap / Priority Queue"
        return "Heap"

    if canonical_category == "Arrays & Hashing" and name in {
        "Island Perimeter",
        "Reshape the Matrix",
    }:
        return "Arrays & Hashing"

    if canonical_category == "Design":
        if name == "Find Median from Data Stream":
            return "Heap"
        if name in {"Min Stack", "LRU Cache"}:
            return "Linked List" if name == "LRU Cache" else "Stack"
        if name == "Serialize and Deserialize Binary Tree":
            return "Trees"
        if name == "Time Based Key-Value Store":
            return "Binary Search"
        return "Linked List"

    if canonical_category == "Math & Geometry" and name == "Reverse Integer":
        return "Bit Manipulation"

    if canonical_category == "Two Pointers" and name == "Trapping Rain Water":
        return "Array / String"

    if canonical_category == "Matrix" and name == "Reshape the Matrix":
        return "Arrays & Hashing"

    # Already a legacy label or unchanged canonical name.
    if str(canonical_category) in CATEGORY_MERGE_MAP:
        return str(canonical_category)

    return str(canonical_category)


def resolve_original_category(row, sources):
    """Use stored Original Category when present, otherwise infer."""
    if "Original Category" in row and _is_filled(row["Original Category"]):
        return str(row["Original Category"]).strip()

    canonical = normalize_category(row.get("Category"), row.get("Question Name"))
    return infer_original_category(row.get("Question Name"), canonical, sources)


def get_tags(question_name, category, original_category=None):
    del category, original_category  # tags are authoritative per question name
    return sorted(QUESTION_TAGS.get(str(question_name), []))


def format_tags(tags):
    return ", ".join(tags)


def parse_tags(value):
    if not _is_filled(value):
        return []
    return [t.strip() for t in str(value).split(",") if t.strip()]


def _is_filled(value):
    if value is None:
        return False
    text = str(value).strip()
    return text != "" and text.lower() != "nan"
