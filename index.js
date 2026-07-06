// DSA Venn Diagram Explorer

document.addEventListener("DOMContentLoaded", () => {
  if (typeof VENN_DATA === "undefined") {
    console.error("VENN_DATA is not defined. Make sure data.js is loaded.");
    return;
  }

  const TOTAL_UNIQUE = VENN_DATA.raw_questions.length;
  const STORAGE_KEY = "dsa-venn-solved";
  const HINT_KEY = "dsa-venn-hint-dismissed";
  const LIST_CLASSES = ["blind75", "grind75", "leetcode150", "neetcode150"];
  const ELLIPSE_COLORS = ["#a78bfa", "#38bdf8", "#4ade80", "#fbbf24"];
  const ELLIPSE_LABELS = ["Blind 75", "Grind 75", "LC 150", "NC 150"];
  const STORY_LOGICS = new Set(["1111"]);
  const LIST_CONFIG = {
    "Blind 75": { color: "var(--color-blind75)", class: "blind75", short: "B75" },
    "Grind 75": { color: "var(--color-grind75)", class: "grind75", short: "G75" },
    "LeetCode Top 150": { color: "var(--color-leetcode150)", class: "leetcode150", short: "LC" },
    "NeetCode 150": { color: "var(--color-neetcode150)", class: "neetcode150", short: "NC" }
  };

  const SHEET_COUNT_LABELS = {
    4: { title: "Common in All Sheets", desc: "Questions in all 4 curated lists." },
    3: { title: "Exactly 3 Sheets", desc: "Questions in exactly 3 of the 4 lists." },
    2: { title: "Exactly 2 Sheets", desc: "Questions in exactly 2 of the 4 lists." },
    1: { title: "Unique Questions", desc: "Questions in only 1 curated list." }
  };

  // State
  let filterMode = "all";
  let activeFilterValue = null;
  let pendingFilterMode = "none"; // "none" | "source" | "sheet_count"
  const pendingSources = new Set();
  const pendingSheetCounts = new Set();
  let activeDifficulty = "all";
  let activeCategory = null;
  let activeTag = null;
  let searchQuery = "";
  let sortColumn = "id";
  let sortDirection = "asc";
  let solvedSet = loadSolved();
  let isRestoringFromHash = false;
  let currentPage = 1;
  let lastFilterKey = "";
  const PAGE_SIZE = 15;

  function defaultSelectionDesc() {
    return `Browse the full consolidated set of ${TOTAL_UNIQUE} questions.`;
  }

  // Matches Python `venn` library / generate_test_svg.py (1000×1000, y-flipped)
  const VENN_VIEW = "0 0 1000 1000";
  const VENN_SIZE = 1000;
  function vennX(x) { return x * VENN_SIZE; }
  function vennY(y) { return (1 - y) * VENN_SIZE; }
  function vennRx(w) { return (w * VENN_SIZE) / 2; }
  function vennRy(h) { return (h * VENN_SIZE) / 2; }

  const VENN_ELLIPSE_RAW = {
    coords: [[0.350, 0.400], [0.450, 0.500], [0.544, 0.500], [0.644, 0.400]],
    dims: [[0.72, 0.45], [0.72, 0.45], [0.72, 0.45], [0.72, 0.45]],
    angles: [140, 140, 40, 40]
  };

  const VENN_ELLIPSE_STYLE = [
    { fill: "url(#grad-blind75)", stroke: ELLIPSE_COLORS[0] },
    { fill: "url(#grad-grind75)", stroke: ELLIPSE_COLORS[1] },
    { fill: "url(#grad-leetcode150)", stroke: ELLIPSE_COLORS[2] },
    { fill: "url(#grad-neetcode150)", stroke: ELLIPSE_COLORS[3] }
  ];

  // Original petal label positions from the venn library
  const VENN_REGIONS_NORM = {
    "0001": [0.85, 0.42], "0010": [0.68, 0.72], "0011": [0.77, 0.59],
    "0100": [0.32, 0.72], "0101": [0.71, 0.30], "0110": [0.50, 0.66],
    "0111": [0.65, 0.50], "1000": [0.14, 0.42], "1001": [0.50, 0.17],
    "1011": [0.39, 0.24], "1101": [0.61, 0.24], "1111": [0.50, 0.38]
  };

  const VENN_LABEL_FS = 24;
  const VENN_HUB_FS = 26;
  const VENN_HIT_R = 36;
  const VENN_HUB_HIT_R = 40;

  // Elements
  const ellipsesGroup = document.getElementById("ellipses-group");
  const labelsGroup = document.getElementById("labels-group");
  const regionsGroup = document.getElementById("regions-group");
  const sourcesGrid = document.getElementById("sources-summary-grid");
  const tableBody = document.getElementById("questions-table-body");
  const noResultsMsg = document.getElementById("no-results-message");
  const questionsTable = document.getElementById("dsa-questions-table");
  const searchInput = document.getElementById("search-input");
  const difficultyBtns = document.querySelectorAll(".tab-btn");
  const btnReset = document.getElementById("btn-reset-selection");
  const btnClearAll = document.getElementById("btn-clear-all");
  const currentSelectionBadge = document.getElementById("current-selection-badge");
  const currentSelectionTitle = document.getElementById("current-selection-title");
  const currentSelectionDesc = document.getElementById("current-selection-desc");
  const subsetCountEl = document.getElementById("subset-count");
  const subsetSolvedEl = document.getElementById("subset-solved");
  const subsetEasyEl = document.getElementById("subset-easy");
  const subsetMediumEl = document.getElementById("subset-medium");
  const subsetHardEl = document.getElementById("subset-hard");
  const tableContainer = document.getElementById("table-container");
  const categoriesChartContainer = document.getElementById("categories-chart-container");
  const tagsSection = document.getElementById("tags-section");
  const tagsChartContainer = document.getElementById("tags-chart-container");
  const tagsSectionHint = document.getElementById("tags-section-hint");
  const overlapFilterBtns = document.querySelectorAll(".overlap-pill");
  const btnApplyFilters = document.getElementById("btn-apply-filters");
  const btnClearPending = document.getElementById("btn-clear-pending");
  const pendingStatusEl = document.getElementById("pending-status");
  const vennTooltip = document.getElementById("venn-tooltip");
  const vennWrapper = document.querySelector(".venn-wrapper");
  const activeFiltersRow = document.getElementById("active-filters-row");
  const activeFiltersChips = document.getElementById("active-filters-chips");
  const questionsPanel = document.getElementById("questions-panel");
  const sortHeaders = document.querySelectorAll(".questions-table th[data-sort]");
  const exportToast = document.getElementById("export-toast");
  const ariaAnnouncer = document.getElementById("aria-announcer");
  const statTotal = document.getElementById("stat-total-questions");
  const statCommon = document.getElementById("stat-common-all");
  const statUnique = document.getElementById("stat-unique-one");
  const statSolved = document.getElementById("stat-solved");
  const btnPrevPage = document.getElementById("btn-prev-page");
  const btnNextPage = document.getElementById("btn-next-page");
  const pageInfoEl = document.getElementById("page-info");
  const paginationRow = document.getElementById("pagination-row");
  const vennLegend = document.getElementById("venn-legend");
  const vennHint = document.getElementById("venn-hint");
  const btnDismissVennHint = document.getElementById("btn-dismiss-venn-hint");

  // ─── Storage ───────────────────────────────────────────
  function loadSolved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  }

  function saveSolved() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...solvedSet]));
    statSolved.textContent = solvedSet.size;
  }

  function toggleSolved(id) {
    if (solvedSet.has(id)) solvedSet.delete(id);
    else solvedSet.add(id);
    saveSolved();
    initSourceCards();
    updatePendingUI();
    renderQuestions();
  }

  // ─── Filtering helpers ─────────────────────────────────
  function getQuestionsBySheetCount(n) {
    return VENN_DATA.raw_questions.filter(q => q.sources.length === n);
  }

  function getActiveSheetCounts() {
    if (filterMode !== "sheet_count" || activeFilterValue == null) return [];
    return Array.isArray(activeFilterValue) ? activeFilterValue : [activeFilterValue];
  }

  function getActiveSources() {
    if (filterMode !== "source" || activeFilterValue == null) return [];
    return Array.isArray(activeFilterValue) ? activeFilterValue : [activeFilterValue];
  }

  function getQuestionsBySheetCounts(counts) {
    const allowed = new Set(counts);
    return VENN_DATA.raw_questions.filter(q => allowed.has(q.sources.length));
  }

  function getQuestionsBySources(sourceNames) {
    const allowed = new Set(sourceNames);
    return VENN_DATA.raw_questions.filter(q => q.sources.some(name => allowed.has(name)));
  }

  function getSourceShortName(sourceName) {
    return {
      "Blind 75": "Blind 75",
      "Grind 75": "Grind 75",
      "LeetCode Top 150": "LC 150",
      "NeetCode 150": "NC 150"
    }[sourceName] || sourceName;
  }

  function sortSourcesByListOrder(sourceNames) {
    return [...sourceNames].sort((a, b) => VENN_DATA.lists.indexOf(a) - VENN_DATA.lists.indexOf(b));
  }

  function questionTags(question) {
    return Array.isArray(question.tags) ? question.tags : [];
  }

  function questionOriginalCategory(question) {
    return question.original_category || question.category || "";
  }

  function appendSourcePills(container, sources) {
    sortSourcesByListOrder(sources).forEach(name => {
      const cfg = LIST_CONFIG[name];
      if (!cfg) return;
      const pill = document.createElement("span");
      pill.className = `source-pill ${cfg.class}`;
      pill.title = name;
      pill.textContent = cfg.short;
      container.appendChild(pill);
    });
  }

  function appendTagPills(container, tags) {
    if (!tags.length) {
      const empty = document.createElement("span");
      empty.className = "tag-empty";
      empty.textContent = "—";
      container.appendChild(empty);
      return;
    }
    tags.forEach(tag => {
      const pill = document.createElement("span");
      pill.className = "tag-pill";
      pill.textContent = tag;
      container.appendChild(pill);
    });
  }

  function buildQuestionRow(q) {
    const row = document.createElement("tr");
    if (solvedSet.has(q.id)) row.classList.add("row-solved");

    const doneCell = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "solved-checkbox";
    checkbox.checked = solvedSet.has(q.id);
    checkbox.setAttribute("aria-label", `Mark ${q.name} as solved`);
    checkbox.dataset.id = String(q.id);
    checkbox.addEventListener("change", (e) => toggleSolved(Number(e.target.dataset.id)));
    doneCell.appendChild(checkbox);
    row.appendChild(doneCell);

    const idCell = document.createElement("td");
    idCell.style.color = "var(--text-muted)";
    idCell.style.fontWeight = "600";
    idCell.textContent = `#${q.id}`;
    row.appendChild(idCell);

    const nameCell = document.createElement("td");
    const nameLink = document.createElement("a");
    nameLink.href = q.link;
    nameLink.target = "_blank";
    nameLink.rel = "noopener";
    nameLink.className = "question-name-link";
    nameLink.textContent = q.name;
    nameCell.appendChild(nameLink);
    row.appendChild(nameCell);

    const diffCell = document.createElement("td");
    const diffBadge = document.createElement("span");
    diffBadge.className = `badge-difficulty ${q.difficulty.toLowerCase()}`;
    diffBadge.textContent = formatDifficulty(q.difficulty);
    diffCell.appendChild(diffBadge);
    row.appendChild(diffCell);

    const categoryCell = document.createElement("td");
    const categoryTag = document.createElement("span");
    categoryTag.className = "category-tag";
    categoryTag.title = q.category;
    categoryTag.textContent = q.category;
    categoryCell.appendChild(categoryTag);
    row.appendChild(categoryCell);

    const originalCell = document.createElement("td");
    const originalTag = document.createElement("span");
    originalTag.className = "original-category-tag";
    originalTag.title = "Original category before merge";
    originalTag.textContent = questionOriginalCategory(q);
    originalCell.appendChild(originalTag);
    row.appendChild(originalCell);

    const tagsCell = document.createElement("td");
    const tagsWrap = document.createElement("div");
    tagsWrap.className = "tag-pills";
    appendTagPills(tagsWrap, questionTags(q));
    tagsCell.appendChild(tagsWrap);
    row.appendChild(tagsCell);

    const sourcesCell = document.createElement("td");
    const sourcesWrap = document.createElement("div");
    sourcesWrap.className = "source-pills";
    appendSourcePills(sourcesWrap, q.sources);
    sourcesCell.appendChild(sourcesWrap);
    row.appendChild(sourcesCell);

    const solutionCell = document.createElement("td");
    if (q.solution_link) {
      const solutionBtn = document.createElement("a");
      solutionBtn.href = q.solution_link;
      solutionBtn.target = "_blank";
      solutionBtn.rel = "noopener";
      solutionBtn.className = "solution-link-btn";
      solutionBtn.title = "View solution on Brewing Intelligence";
      solutionBtn.textContent = "BI";
      solutionCell.appendChild(solutionBtn);
    } else {
      const empty = document.createElement("span");
      empty.className = "solution-empty";
      empty.textContent = "—";
      solutionCell.appendChild(empty);
    }
    row.appendChild(solutionCell);

    const linkCell = document.createElement("td");
    const linkBtn = document.createElement("a");
    linkBtn.href = q.link;
    linkBtn.target = "_blank";
    linkBtn.rel = "noopener";
    linkBtn.className = "link-icon-btn";
    linkBtn.title = "Open on LeetCode";
    linkBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;
    linkCell.appendChild(linkBtn);
    row.appendChild(linkCell);

    return row;
  }

  function getBaseFilteredQuestions(applyCategory = true, applyTag = true) {
    let questions = VENN_DATA.raw_questions;

    if (filterMode === "intersection" && activeFilterValue) {
      questions = VENN_DATA.combinations[activeFilterValue]?.questions || [];
    } else if (filterMode === "source" && activeFilterValue) {
      questions = getQuestionsBySources(getActiveSources());
    } else if (filterMode === "sheet_count" && activeFilterValue) {
      questions = getQuestionsBySheetCounts(getActiveSheetCounts());
    }

    if (activeDifficulty !== "all") {
      questions = questions.filter(q => q.difficulty === activeDifficulty);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      questions = questions.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        questionOriginalCategory(item).toLowerCase().includes(q) ||
        questionTags(item).some(tag => tag.toLowerCase().includes(q)) ||
        String(item.id).includes(q)
      );
    }

    if (applyCategory && activeCategory) {
      questions = questions.filter(q => q.category === activeCategory);
    }

    if (applyTag && activeTag) {
      questions = questions.filter(q => questionTags(q).includes(activeTag));
    }

    return questions;
  }

  function clearFacetFilters() {
    activeCategory = null;
    activeTag = null;
  }

  /** Drop tag (and fix state) when it doesn't apply to the current category/overlap context. */
  function sanitizeFacetFilters() {
    if (!activeTag) return;

    const pool = getBaseFilteredQuestions(Boolean(activeCategory), false);
    const tagApplies = pool.some(q => questionTags(q).includes(activeTag));
    if (!tagApplies) activeTag = null;
  }

  function getFilteredQuestions() {
    return getBaseFilteredQuestions(true, true);
  }

  function setActiveCategory(category) {
    if (activeCategory !== category) activeTag = null;
    activeCategory = category;
  }

  function sortQuestions(questions) {
    const sorted = [...questions];
    const dir = sortDirection === "asc" ? 1 : -1;
    const diffOrder = { Easy: 1, Medium: 2, Hard: 3 };

    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case "id": cmp = a.id - b.id; break;
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "difficulty": cmp = (diffOrder[a.difficulty] || 0) - (diffOrder[b.difficulty] || 0); break;
        case "category": cmp = a.category.localeCompare(b.category); break;
        case "original_category": cmp = questionOriginalCategory(a).localeCompare(questionOriginalCategory(b)); break;
        case "tags": cmp = questionTags(a).join(",").localeCompare(questionTags(b).join(",")); break;
        case "sources": cmp = a.sources.length - b.sources.length; break;
        case "solution_link": cmp = (a.solution_link || "").localeCompare(b.solution_link || ""); break;
        case "solved": cmp = (solvedSet.has(a.id) ? 1 : 0) - (solvedSet.has(b.id) ? 1 : 0); break;
        default: cmp = 0;
      }
      return cmp * dir;
    });
    return sorted;
  }

  // ─── URL hash state ────────────────────────────────────
  function buildHash() {
    const params = new URLSearchParams();
    if (filterMode !== "all") {
      params.set("mode", filterMode);
      if (activeFilterValue != null) {
        const value = filterMode === "sheet_count"
          ? getActiveSheetCounts().join(",")
          : filterMode === "source"
            ? getActiveSources().join(",")
            : String(activeFilterValue);
        params.set("value", value);
      }
    }
    if (activeDifficulty !== "all") params.set("difficulty", activeDifficulty);
    if (activeCategory) params.set("category", activeCategory);
    if (activeTag) params.set("tag", activeTag);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (sortColumn !== "id") params.set("sort", sortColumn);
    if (sortDirection !== "asc") params.set("dir", sortDirection);
    const str = params.toString();
    return str ? `#${str}` : "";
  }

  function updateUrlHash() {
    if (isRestoringFromHash) return;
    const hash = buildHash();
    history.replaceState(null, "", hash || location.pathname + location.search);
  }

  function restoreFromHash() {
    const hash = location.hash.slice(1);
    if (!hash) return;

    isRestoringFromHash = true;
    const params = new URLSearchParams(hash);

    if (params.has("difficulty")) activeDifficulty = params.get("difficulty");
    if (params.has("category")) activeCategory = params.get("category");
    if (params.has("tag")) activeTag = params.get("tag");
    if (params.has("search")) {
      searchQuery = params.get("search");
      searchInput.value = searchQuery;
    }
    if (params.has("sort")) sortColumn = params.get("sort");
    if (params.has("dir")) sortDirection = params.get("dir");

    const mode = params.get("mode");
    if (mode === "intersection" && params.has("value")) {
      applyIntersectionFilter(params.get("value"), false);
    } else if (mode === "source" && params.has("value")) {
      const sources = params.get("value")
        .split(",")
        .map(name => name.trim())
        .filter(name => VENN_DATA.lists.includes(name));
      if (sources.length) applySourceFilters(sources, false);
    } else if (mode === "sheet_count" && params.has("value")) {
      const counts = params.get("value")
        .split(",")
        .map(n => Number(n.trim()))
        .filter(n => [1, 2, 3, 4].includes(n));
      if (counts.length) applySheetCountFilters(counts, false);
    }

    difficultyBtns.forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-difficulty") === activeDifficulty);
    });

    sanitizeFacetFilters();
    isRestoringFromHash = false;
    syncPendingFromApplied();
  }

  // ─── UI helpers ────────────────────────────────────────
  function announce(msg) {
    if (ariaAnnouncer) ariaAnnouncer.textContent = msg;
  }

  function showToast(msg) {
    exportToast.textContent = msg;
    exportToast.classList.add("visible");
    setTimeout(() => exportToast.classList.remove("visible"), 2000);
  }

  function scrollToQuestions() {
    if (questionsPanel) {
      questionsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function setBadgeStyle(colorVar) {
    const colorMap = {
      "var(--color-blind75)": { color: "#a78bfa", border: "rgba(167,139,250,0.4)", bg: "rgba(167,139,250,0.15)" },
      "var(--color-grind75)": { color: "#38bdf8", border: "rgba(56,189,248,0.4)", bg: "rgba(56,189,248,0.15)" },
      "var(--color-leetcode150)": { color: "#4ade80", border: "rgba(74,222,128,0.4)", bg: "rgba(74,222,128,0.15)" },
      "var(--color-neetcode150)": { color: "#fbbf24", border: "rgba(251,191,36,0.4)", bg: "rgba(251,191,36,0.15)" }
    };
    const s = colorMap[colorVar] || colorMap["var(--color-blind75)"];
    currentSelectionBadge.style.color = s.color;
    currentSelectionBadge.style.borderColor = s.border;
    currentSelectionBadge.style.background = s.bg;
  }

  function updateSourceCardHighlight() {
    const appliedSources = new Set(getActiveSources());
    document.querySelectorAll(".source-card").forEach(c => {
      const src = c.getAttribute("data-source");
      c.classList.toggle("active-card", filterMode === "source" && appliedSources.has(src));
      c.classList.toggle("selected-card", pendingFilterMode === "source" && pendingSources.has(src));
    });
  }

  function clearPendingSelection() {
    syncPendingFromApplied();
  }

  function syncPendingFromApplied() {
    pendingSources.clear();
    pendingSheetCounts.clear();

    if (filterMode === "sheet_count") {
      pendingFilterMode = "sheet_count";
      getActiveSheetCounts().forEach(count => pendingSheetCounts.add(count));
    } else if (filterMode === "source") {
      pendingFilterMode = "source";
      getActiveSources().forEach(source => pendingSources.add(source));
    } else {
      pendingFilterMode = "none";
    }

    updatePendingUI();
  }

  function setsEqual(a, b) {
    if (a.size !== b.size) return false;
    for (const item of a) if (!b.has(item)) return false;
    return true;
  }

  function hasPendingChanges() {
    if (filterMode === "intersection" && pendingFilterMode === "none") return false;

    if (pendingFilterMode === "none") {
      return filterMode === "source" || filterMode === "sheet_count";
    }

    if (pendingFilterMode !== filterMode) return true;

    if (pendingFilterMode === "source") {
      return !setsEqual(pendingSources, new Set(getActiveSources()));
    }

    if (pendingFilterMode === "sheet_count") {
      return !setsEqual(pendingSheetCounts, new Set(getActiveSheetCounts()));
    }

    return false;
  }

  function updateApplyButtonLabel() {
    if (!btnApplyFilters) return;
    const changes = hasPendingChanges();
    btnApplyFilters.disabled = !changes;

    if (!changes) {
      btnApplyFilters.textContent = "Apply filter";
      return;
    }

    if (pendingFilterMode === "none") {
      btnApplyFilters.textContent = "Clear filter";
      return;
    }

    const count = pendingFilterMode === "source"
      ? pendingSources.size
      : pendingSheetCounts.size;
    btnApplyFilters.textContent = count > 0
      ? `Apply filter (${count} selected)`
      : "Apply filter";
  }

  function updatePendingStatus() {
    if (!pendingStatusEl) return;

    if (!hasPendingChanges()) {
      pendingStatusEl.hidden = true;
      pendingStatusEl.textContent = "";
      return;
    }

    pendingStatusEl.hidden = false;

    if (pendingFilterMode === "none") {
      pendingStatusEl.textContent = "Pending: clear active list/count filter on Apply";
      return;
    }

    if (pendingFilterMode === "source") {
      const names = sortSourcesByListOrder([...pendingSources]).map(getSourceShortName);
      pendingStatusEl.textContent = `Pending: ${names.join(" + ")} — not applied yet`;
      return;
    }

    if (pendingFilterMode === "sheet_count") {
      const labels = [...pendingSheetCounts].sort((a, b) => b - a).map(getSheetCountShortTitle);
      pendingStatusEl.textContent = `Pending: ${labels.join(" + ")} — not applied yet`;
    }
  }

  function updatePendingUI() {
    updateSourceCardHighlight();
    updateOverlapFilterButtons();
    updateApplyButtonLabel();
    updatePendingStatus();
    refreshVennVisualState();
  }

  function confirmDiscardPending(continueAction) {
    if (!hasPendingChanges()) {
      continueAction();
      return;
    }

    const message = pendingFilterMode === "none"
      ? "You have a pending filter reset. Discard it and continue?"
      : "You have unapplied list or overlap selections. Discard them and continue?";

    if (window.confirm(message)) {
      syncPendingFromApplied();
      continueAction();
    }
  }

  function highlightSourceCardsForLogic(logic) {
    const listNames = VENN_DATA.lists;
    document.querySelectorAll(".source-card").forEach(card => {
      const index = listNames.indexOf(card.getAttribute("data-source"));
      if (index === -1) return;
      const on = logic[index] === "1";
      card.classList.toggle("venn-hover-on", on);
      card.classList.toggle("venn-hover-off", !on);
    });
  }

  function clearSourceCardHover() {
    document.querySelectorAll(".source-card").forEach(c => {
      c.classList.remove("venn-hover-on", "venn-hover-off");
    });
  }

  function updateOverlapFilterButtons() {
    const appliedCounts = new Set(getActiveSheetCounts());
    overlapFilterBtns.forEach(btn => {
      const count = Number(btn.getAttribute("data-sheet-count"));
      const isPending = pendingFilterMode === "sheet_count" && pendingSheetCounts.has(count);
      const isApplied = filterMode === "sheet_count" && appliedCounts.has(count);
      btn.classList.toggle("selected", isPending);
      btn.classList.toggle("active", isApplied);
      btn.setAttribute("aria-pressed", String(isPending));
    });
  }

  function getSheetCountShortTitle(count) {
    return { 4: "All 4 Lists", 3: "In 3 Lists", 2: "In 2 Lists", 1: "Unique" }[count] || SHEET_COUNT_LABELS[count]?.title;
  }

  function updateSourceSelectionUI(sources) {
    if (sources.length === 1) {
      const source = sources[0];
      currentSelectionTitle.textContent = getSourceShortName(source);
      currentSelectionDesc.textContent = `All questions in ${source}.`;
      return;
    }

    currentSelectionTitle.textContent = sources.map(getSourceShortName).join(" + ");
    const total = getQuestionsBySources(sources).length;
    currentSelectionDesc.textContent = `${total} questions in any of ${sources.length} selected lists.`;
  }

  function updateSheetCountSelectionUI(counts) {
    if (counts.length === 1) {
      const count = counts[0];
      currentSelectionTitle.textContent = getSheetCountShortTitle(count);
      currentSelectionDesc.textContent = SHEET_COUNT_LABELS[count].desc;
      return;
    }

    currentSelectionTitle.textContent = counts.map(getSheetCountShortTitle).join(" + ");
    const total = getQuestionsBySheetCounts(counts).length;
    currentSelectionDesc.textContent = `${total} questions in any of ${counts.length} selected overlap groups.`;
  }

  function renderSourcePills(sources) {
    return sources.map(name => {
      const cfg = LIST_CONFIG[name];
      return `<span class="source-pill ${cfg.class}" title="${name}">${cfg.short}</span>`;
    }).join("");
  }

  function getRegionTooltipText(logic) {
    const combo = VENN_DATA.combinations[logic];
    if (!combo) return "";
    const inPills = combo.in_lists.map(name => {
      const cfg = LIST_CONFIG[name];
      return `<span class="tooltip-pill ${cfg.class}">${cfg.short}</span>`;
    }).join("");
    const excludes = combo.out_lists.length
      ? `<div class="tooltip-excludes">Not in: ${combo.out_lists.map(n => LIST_CONFIG[n].short).join(", ")}</div>`
      : "";
    return `
      <div class="tooltip-title">${combo.count} question${combo.count !== 1 ? "s" : ""}</div>
      <div class="tooltip-pills">${inPills}</div>
      ${excludes}
      <div class="tooltip-action">Click for intersection filter</div>
    `;
  }

  function showVennTooltip(logic, event) {
    const combo = VENN_DATA.combinations[logic];
    if (!combo || combo.count === 0) return;
    vennTooltip.innerHTML = getRegionTooltipText(logic);
    vennTooltip.classList.add("visible");
    vennTooltip.setAttribute("aria-hidden", "false");
    if (event && typeof event.clientX === "number") {
      positionTooltip(event);
    } else {
      const region = document.querySelector(`.venn-region[data-logic="${logic}"] .region-text`);
      if (region && vennWrapper) {
        const wrapRect = vennWrapper.getBoundingClientRect();
        const textRect = region.getBoundingClientRect();
        vennTooltip.style.left = `${Math.min(textRect.left - wrapRect.left, wrapRect.width - 270)}px`;
        vennTooltip.style.top = `${textRect.bottom - wrapRect.top + 8}px`;
      }
    }
  }

  function positionTooltip(event) {
    const rect = vennWrapper.getBoundingClientRect();
    const x = event.clientX - rect.left + 12;
    const y = event.clientY - rect.top - 10;
    vennTooltip.style.left = `${Math.min(x, rect.width - 270)}px`;
    vennTooltip.style.top = `${Math.max(y, 8)}px`;
  }

  function hideVennTooltip() {
    vennTooltip.classList.remove("visible");
    vennTooltip.setAttribute("aria-hidden", "true");
  }

  // ─── Active filter chips ───────────────────────────────
  function renderActiveFilterChips() {
    const chips = [];

    if (filterMode === "intersection" && activeFilterValue) {
      const combo = VENN_DATA.combinations[activeFilterValue];
      chips.push({ label: combo.in_lists.join(" ∩ "), type: "primary", clear: resetSelectionFilter });
    } else if (filterMode === "source" && activeFilterValue) {
      getActiveSources().forEach(source => {
        chips.push({
          label: getSourceShortName(source),
          type: "primary",
          clear: () => {
            const next = getActiveSources().filter(s => s !== source);
            if (next.length === 0) resetSelectionFilter();
            else applySourceFilters(next);
          }
        });
      });
    } else if (filterMode === "sheet_count" && activeFilterValue) {
      getActiveSheetCounts().forEach(count => {
        chips.push({
          label: getSheetCountShortTitle(count),
          type: "primary",
          clear: () => {
            const next = getActiveSheetCounts().filter(c => c !== count);
            if (next.length === 0) resetSelectionFilter();
            else applySheetCountFilters(next);
          }
        });
      });
    }

    if (activeCategory) {
      chips.push({
        label: activeCategory,
        type: "category",
        clear: () => { clearFacetFilters(); renderQuestions(); }
      });
    }
    if (activeTag) {
      chips.push({ label: `Tag: ${activeTag}`, type: "tag", clear: () => { activeTag = null; renderQuestions(); } });
    }
    if (activeDifficulty !== "all") {
      chips.push({ label: activeDifficulty, type: "difficulty", clear: () => {
        activeDifficulty = "all";
        difficultyBtns.forEach(b => b.classList.toggle("active", b.getAttribute("data-difficulty") === "all"));
        renderQuestions();
      }});
    }
    if (searchQuery.trim()) {
      chips.push({ label: `"${searchQuery.trim()}"`, type: "search", clear: () => {
        searchQuery = "";
        searchInput.value = "";
        renderQuestions();
      }});
    }

    if (chips.length === 0) {
      activeFiltersRow.hidden = true;
      activeFiltersChips.innerHTML = "";
      return;
    }

    activeFiltersRow.hidden = false;
    activeFiltersChips.innerHTML = chips.map((chip, i) =>
      `<span class="filter-chip">${chip.label}<button type="button" aria-label="Remove ${chip.label} filter" data-chip="${i}">×</button></span>`
    ).join("");

    activeFiltersChips.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => chips[Number(btn.getAttribute("data-chip"))].clear());
    });
  }

  function resetVennVisuals() {
    for (let j = 0; j < 4; j++) {
      const ellipse = document.getElementById(`venn-ellipse-${j}`);
      if (ellipse) {
        ellipse.setAttribute("fill-opacity", "0.55");
        ellipse.setAttribute("stroke-width", "2.5");
        ellipse.setAttribute("filter", "none");
        ellipse.classList.remove("ellipse-preview", "ellipse-dimmed");
      }
    }
    document.querySelectorAll(".venn-region").forEach(reg => {
      reg.classList.remove("active-region", "preview-region");
      const t = reg.querySelector(".region-text");
      if (t) t.style.opacity = "1";
    });
  }

  function refreshVennVisualState() {
    const showPendingPreview = hasPendingChanges() && pendingFilterMode !== "none";

    if (showPendingPreview) {
      if (pendingFilterMode === "source") {
        applyActiveSourceStyle([...pendingSources], true);
      } else if (pendingFilterMode === "sheet_count") {
        applyActiveSheetCountStyle([...pendingSheetCounts], true);
      }
      return;
    }

    if (filterMode === "intersection" && activeFilterValue) applyActiveIntersectionStyle(activeFilterValue);
    else if (filterMode === "sheet_count" && activeFilterValue) applyActiveSheetCountStyle(getActiveSheetCounts());
    else if (filterMode === "source" && activeFilterValue) applyActiveSourceStyle(getActiveSources());
    else resetVennVisuals();
  }

  function highlightEllipsesForSource(index, on) {
    for (let j = 0; j < 4; j++) {
      const ellipse = document.getElementById(`venn-ellipse-${j}`);
      if (!ellipse) continue;
      ellipse.classList.toggle("ellipse-preview", on && j === index);
      ellipse.classList.toggle("ellipse-dimmed", on && j !== index);
    }
  }

  function applyActiveSourceStyle(sourceNames, preview = false) {
    const sources = Array.isArray(sourceNames) ? sourceNames : [sourceNames];
    const selectedIndexes = new Set(
      sources.map(name => VENN_DATA.lists.indexOf(name)).filter(index => index !== -1)
    );
    const onOpacity = preview ? "0.48" : "0.75";
    const offOpacity = preview ? "0.18" : "0.12";
    const regionOpacity = preview ? "0.55" : "1";
    const regionDim = preview ? "0.22" : "0.3";

    for (let j = 0; j < 4; j++) {
      const ellipse = document.getElementById(`venn-ellipse-${j}`);
      if (!ellipse) continue;
      const on = selectedIndexes.has(j);
      ellipse.setAttribute("fill-opacity", on ? onOpacity : offOpacity);
      ellipse.setAttribute("stroke-width", on ? (preview ? "2.5" : "3.5") : "1.5");
      ellipse.setAttribute("filter", on && !preview ? "url(#glow)" : "none");
      ellipse.classList.toggle("ellipse-preview", preview && on);
      ellipse.classList.remove("ellipse-dimmed");
    }
    document.querySelectorAll(".venn-region").forEach(reg => {
      const logic = reg.getAttribute("data-logic");
      const match = [...selectedIndexes].some(index => logic[index] === "1");
      reg.classList.toggle("active-region", false);
      reg.classList.toggle("preview-region", preview && match);
      const t = reg.querySelector(".region-text");
      if (t) t.style.opacity = match ? regionOpacity : regionDim;
    });
  }

  function bindRegionEvents(regionG, logic) {
    const activate = () => selectIntersection(logic);
    const onEnter = (e) => { hoverRegion(logic); showVennTooltip(logic, e); };
    const onLeave = () => { unhoverRegion(); hideVennTooltip(); };

    regionG.addEventListener("mouseenter", onEnter);
    regionG.addEventListener("mousemove", (e) => positionTooltip(e));
    regionG.addEventListener("mouseleave", onLeave);
    regionG.addEventListener("click", activate);
    regionG.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
    });
    regionG.addEventListener("focus", onEnter);
    regionG.addEventListener("blur", onLeave);
  }

  // ─── Venn diagram ─────────────────────────────────────
  function renderVennDiagram() {
    ellipsesGroup.innerHTML = "";
    labelsGroup.innerHTML = "";
    regionsGroup.innerHTML = "";

    VENN_ELLIPSE_RAW.coords.forEach((coord, i) => {
      const cx = vennX(coord[0]);
      const cy = vennY(coord[1]);
      const rx = vennRx(VENN_ELLIPSE_RAW.dims[i][0]);
      const ry = vennRy(VENN_ELLIPSE_RAW.dims[i][1]);
      const angle = -VENN_ELLIPSE_RAW.angles[i];
      const style = VENN_ELLIPSE_STYLE[i];

      const ellipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
      ellipse.setAttribute("id", `venn-ellipse-${i}`);
      ellipse.setAttribute("class", `venn-ellipse ${LIST_CLASSES[i]}`);
      ellipse.setAttribute("cx", cx);
      ellipse.setAttribute("cy", cy);
      ellipse.setAttribute("rx", rx);
      ellipse.setAttribute("ry", ry);
      ellipse.setAttribute("transform", `rotate(${angle} ${cx} ${cy})`);
      ellipse.setAttribute("fill", style.fill);
      ellipse.setAttribute("stroke", style.stroke);
      ellipse.setAttribute("stroke-width", "2.5");
      ellipse.setAttribute("fill-opacity", "0.55");
      ellipsesGroup.appendChild(ellipse);
    });

    Object.entries(VENN_REGIONS_NORM).forEach(([logic, norm]) => {
      const combo = VENN_DATA.combinations[logic];
      if (!combo || combo.count === 0) return;

      const x = vennX(norm[0]);
      const y = vennY(norm[1]);
      const count = combo.count;
      const isHub = logic === "1111";
      const hitR = isHub ? VENN_HUB_HIT_R : VENN_HIT_R;
      const fontSize = isHub ? VENN_HUB_FS : VENN_LABEL_FS;

      const regionG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      regionG.setAttribute("class", `venn-region${isHub ? " hub-region" : ""}${STORY_LOGICS.has(logic) ? " story-region" : ""}`);
      regionG.setAttribute("data-logic", logic);
      regionG.setAttribute("role", "button");
      regionG.setAttribute("tabindex", "0");
      regionG.setAttribute("aria-label", `${count} questions in ${combo.in_lists.join(", ")}`);

      const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      hit.setAttribute("class", "region-hit");
      hit.setAttribute("cx", x);
      hit.setAttribute("cy", y);
      hit.setAttribute("r", String(hitR));
      regionG.appendChild(hit);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("class", "region-text");
      text.setAttribute("x", x);
      text.setAttribute("y", y);
      text.setAttribute("font-size", String(fontSize));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.textContent = count;
      regionG.appendChild(text);

      bindRegionEvents(regionG, logic);
      regionsGroup.appendChild(regionG);
    });

    const svg = document.getElementById("venn-svg");
    svg.setAttribute("viewBox", VENN_VIEW);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    refreshVennVisualState();
  }

  function hoverRegion(logic) {
    for (let j = 0; j < 4; j++) {
      const ellipse = document.getElementById(`venn-ellipse-${j}`);
      if (!ellipse) continue;
      ellipse.classList.remove("ellipse-preview", "ellipse-dimmed");
      if (logic[j] === "1") {
        ellipse.setAttribute("fill-opacity", "0.75");
        ellipse.setAttribute("stroke-width", "3.5");
        ellipse.setAttribute("filter", "url(#glow)");
      } else {
        ellipse.setAttribute("fill-opacity", "0.1");
        ellipse.setAttribute("stroke-width", "1.5");
        ellipse.setAttribute("filter", "none");
      }
    }

    document.querySelectorAll(".venn-region").forEach(reg => {
      const t = reg.querySelector(".region-text");
      const match = reg.getAttribute("data-logic") === logic;
      if (t) t.style.opacity = match ? "1" : "0.25";
    });

    highlightSourceCardsForLogic(logic);
  }

  function unhoverRegion() {
    clearSourceCardHover();
    refreshVennVisualState();
  }

  function applyActiveIntersectionStyle(logic) {
    for (let j = 0; j < 4; j++) {
      const ellipse = document.getElementById(`venn-ellipse-${j}`);
      if (!ellipse) continue;
      ellipse.classList.remove("ellipse-preview", "ellipse-dimmed");
      ellipse.setAttribute("fill-opacity", logic[j] === "1" ? "0.72" : "0.1");
      ellipse.setAttribute("stroke-width", logic[j] === "1" ? "3.5" : "1.5");
      ellipse.setAttribute("filter", logic[j] === "1" ? "url(#glow)" : "none");
    }
    document.querySelectorAll(".venn-region").forEach(reg => {
      const t = reg.querySelector(".region-text");
      const match = reg.getAttribute("data-logic") === logic;
      reg.classList.remove("preview-region");
      reg.classList.toggle("active-region", match);
      if (t) t.style.opacity = match ? "1" : "0.35";
    });
  }

  function applyActiveSheetCountStyle(sheetCounts, preview = false) {
    const countSet = new Set(Array.isArray(sheetCounts) ? sheetCounts : [sheetCounts]);
    const ellipseOpacity = preview ? "0.38" : "0.5";
    const regionOpacity = preview ? "0.55" : "1";
    const regionDim = preview ? "0.22" : "0.3";

    for (let j = 0; j < 4; j++) {
      const ellipse = document.getElementById(`venn-ellipse-${j}`);
      if (ellipse) {
        ellipse.classList.remove("ellipse-preview", "ellipse-dimmed");
        ellipse.setAttribute("fill-opacity", ellipseOpacity);
        ellipse.setAttribute("stroke-width", preview ? "2" : "2.5");
        ellipse.setAttribute("filter", "none");
      }
    }
    document.querySelectorAll(".venn-region").forEach(reg => {
      const t = reg.querySelector(".region-text");
      const ones = (reg.getAttribute("data-logic").match(/1/g) || []).length;
      const match = countSet.has(ones);
      reg.classList.toggle("active-region", !preview && match);
      reg.classList.toggle("preview-region", preview && match);
      if (t) t.style.opacity = match ? regionOpacity : regionDim;
    });
  }

  // ─── Filter actions ────────────────────────────────────
  function applyIntersectionFilter(logic, scroll = true) {
    const combo = VENN_DATA.combinations[logic];
    if (!combo || combo.count === 0) return;

    filterMode = "intersection";
    activeFilterValue = logic;
    clearFacetFilters();

    currentSelectionBadge.textContent = "Intersection";
    setBadgeStyle("var(--color-blind75)");
    currentSelectionTitle.textContent = combo.in_lists.join(" & ");
    currentSelectionDesc.textContent = `In [${combo.in_lists.join(", ")}], excluded from [${combo.out_lists.join(", ")}].`;

    unhoverRegion();
    applyActiveIntersectionStyle(logic);
    updateSourceCardHighlight();
    updateOverlapFilterButtons();
    syncPendingFromApplied();
    renderQuestions();
    if (scroll) scrollToQuestions();
    updateUrlHash();
    announce(`Showing ${combo.count} questions in ${combo.in_lists.join(" and ")}`);
  }

  function selectIntersection(logic) {
    const apply = () => {
      if (filterMode === "intersection" && activeFilterValue === logic) {
        resetSelectionFilter();
      } else {
        applyIntersectionFilter(logic);
      }
    };
    confirmDiscardPending(apply);
  }

  function applySourceFilters(sourceNames, scroll = true) {
    const sorted = sortSourcesByListOrder(sourceNames);
    filterMode = "source";
    activeFilterValue = sorted;
    clearFacetFilters();

    currentSelectionBadge.textContent = "Source";
    const cfg = LIST_CONFIG[sorted[0]];
    setBadgeStyle(cfg.color);
    updateSourceSelectionUI(sorted);

    applyActiveSourceStyle(sorted);
    updateSourceCardHighlight();
    updateOverlapFilterButtons();
    syncPendingFromApplied();
    renderQuestions();
    if (scroll) scrollToQuestions();
    updateUrlHash();

    const total = getQuestionsBySources(sorted).length;
    const label = sorted.length === 1
      ? sorted[0]
      : `${sorted.map(getSourceShortName).join(" + ")} (${total} questions)`;
    announce(`Showing questions from ${label}`);
  }

  function togglePendingSource(sourceName) {
    if (pendingFilterMode === "sheet_count") {
      pendingSheetCounts.clear();
      pendingSources.clear();
      pendingFilterMode = "source";
    } else if (pendingFilterMode !== "source") {
      pendingFilterMode = "source";
      pendingSources.clear();
    }

    if (pendingSources.has(sourceName)) pendingSources.delete(sourceName);
    else pendingSources.add(sourceName);

    if (pendingSources.size === 0) pendingFilterMode = "none";
    updatePendingUI();
  }

  function applySheetCountFilters(counts, scroll = true) {
    const sorted = [...counts].sort((a, b) => b - a);
    filterMode = "sheet_count";
    activeFilterValue = sorted;
    clearFacetFilters();

    currentSelectionBadge.textContent = "Overlap count";
    setBadgeStyle("var(--color-grind75)");
    updateSheetCountSelectionUI(sorted);

    unhoverRegion();
    applyActiveSheetCountStyle(sorted);
    updateSourceCardHighlight();
    updateOverlapFilterButtons();
    syncPendingFromApplied();
    renderQuestions();
    if (scroll) scrollToQuestions();
    updateUrlHash();

    const total = getQuestionsBySheetCounts(sorted).length;
    const label = sorted.length === 1
      ? SHEET_COUNT_LABELS[sorted[0]].title
      : `${sorted.map(getSheetCountShortTitle).join(" + ")} (${total} questions)`;
    announce(`Showing ${label}`);
  }

  function togglePendingSheetCount(count) {
    if (pendingFilterMode === "source") {
      pendingSources.clear();
      pendingSheetCounts.clear();
      pendingFilterMode = "sheet_count";
    } else if (pendingFilterMode !== "sheet_count") {
      pendingFilterMode = "sheet_count";
      pendingSheetCounts.clear();
    }

    if (pendingSheetCounts.has(count)) pendingSheetCounts.delete(count);
    else pendingSheetCounts.add(count);

    if (pendingSheetCounts.size === 0) pendingFilterMode = "none";
    updatePendingUI();
  }

  function applyPendingFilters(scroll = true) {
    if (pendingFilterMode === "sheet_count" && pendingSheetCounts.size > 0) {
      applySheetCountFilters([...pendingSheetCounts], scroll);
      return;
    }

    if (pendingFilterMode === "source" && pendingSources.size > 0) {
      applySourceFilters([...pendingSources], scroll);
      return;
    }

    resetSelectionFilter();
  }

  function resetSelectionFilter() {
    filterMode = "all";
    activeFilterValue = null;

    currentSelectionBadge.textContent = "All";
    setBadgeStyle("var(--color-blind75)");
    currentSelectionTitle.textContent = "All Questions";
    currentSelectionDesc.textContent = defaultSelectionDesc();

    resetVennVisuals();
    clearSourceCardHover();
    syncPendingFromApplied();
    renderQuestions();
    updateUrlHash();
  }

  function clearAllFilters() {
    activeDifficulty = "all";
    clearFacetFilters();
    searchQuery = "";
    searchInput.value = "";
    difficultyBtns.forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-difficulty") === "all");
    });
    resetSelectionFilter();
  }

  // ─── Init sections ─────────────────────────────────────
  function initHeaderStats() {
    statTotal.textContent = TOTAL_UNIQUE;
    statCommon.textContent = getQuestionsBySheetCount(4).length;
    statUnique.textContent = getQuestionsBySheetCount(1).length;
    statSolved.textContent = solvedSet.size;
  }

  function initSourceCards() {
    sourcesGrid.innerHTML = "";
    const displayNames = {
      "Blind 75": "Blind 75",
      "Grind 75": "Grind 75",
      "LeetCode Top 150": "LC 150",
      "NeetCode 150": "NC 150"
    };

    VENN_DATA.lists.forEach((listName, index) => {
      const total = VENN_DATA.list_totals[listName];
      const questions = VENN_DATA.raw_questions.filter(q => q.sources.includes(listName));
      const exclusive = questions.filter(q => q.sources.length === 1).length;
      const shared = total - exclusive;
      const solvedInList = questions.filter(q => solvedSet.has(q.id)).length;
      const pct = total > 0 ? Math.round((solvedInList / total) * 100) : 0;

      const card = document.createElement("div");
      card.className = `source-card ${LIST_CLASSES[index]}`;
      card.setAttribute("data-source", listName);
      card.setAttribute("data-source-index", String(index));
      card.setAttribute("role", "listitem");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Select ${listName} for filter, ${total} questions, ${solvedInList} solved. Apply to confirm.`);
      card.innerHTML = `
        <div class="source-card-inner">
          <div class="source-info">
            <div class="source-name-row">
              <span class="source-dot" style="background: ${ELLIPSE_COLORS[index]}"></span>
              <h3>${displayNames[listName] || listName}</h3>
            </div>
            <span class="source-meta">${exclusive} unique · ${shared} shared</span>
            <div class="source-progress">
              <div class="source-progress-bar">
                <div class="source-progress-fill" style="width:${pct}%; background:${ELLIPSE_COLORS[index]}"></div>
              </div>
              <span class="source-progress-text">${solvedInList}/${total}</span>
            </div>
          </div>
          <span class="source-count" style="color: ${ELLIPSE_COLORS[index]}">${total}</span>
        </div>
      `;
      const activate = () => togglePendingSource(listName);
      card.addEventListener("click", activate);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
      });
      card.addEventListener("mouseenter", () => {
        if (filterMode === "all" || filterMode === "source" || pendingFilterMode === "source") {
          highlightEllipsesForSource(index, true);
        }
      });
      card.addEventListener("mouseleave", () => refreshVennVisualState());
      sourcesGrid.appendChild(card);
    });
  }

  function initVennLegend() {
    if (!vennLegend) return;
    vennLegend.innerHTML = VENN_DATA.lists.map((name, i) => `
      <span class="venn-legend-item ${LIST_CLASSES[i]}">
        <span class="venn-legend-dot" style="background:${ELLIPSE_COLORS[i]}"></span>
        <span class="venn-legend-name">${ELLIPSE_LABELS[i]}</span>
      </span>
    `).join("");
  }

  function initVennHint() {
    if (!vennHint) return;
    const dismissed = localStorage.getItem(HINT_KEY);
    if (!dismissed) vennHint.hidden = false;
    btnDismissVennHint?.addEventListener("click", () => {
      vennHint.hidden = true;
      localStorage.setItem(HINT_KEY, "1");
    });
  }

  function initOverlapFilterCounts() {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    VENN_DATA.raw_questions.forEach(q => { counts[q.sources.length]++; });
    Object.entries(counts).forEach(([n, total]) => {
      const el = document.getElementById(`overlap-count-${n}`);
      if (el) el.textContent = total;
    });
  }

  function formatDifficulty(difficulty) {
    return difficulty;
  }

  function getFilterKey() {
    return JSON.stringify({
      filterMode,
      activeFilterValue,
      activeDifficulty,
      activeCategory,
      activeTag,
      searchQuery,
      sortColumn,
      sortDirection
    });
  }

  function updatePagination(totalItems) {
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    pageInfoEl.textContent = `Page ${currentPage} of ${totalPages}`;
    btnPrevPage.disabled = currentPage <= 1;
    btnNextPage.disabled = currentPage >= totalPages;
    paginationRow.style.display = totalItems === 0 ? "none" : "flex";
  }

  // ─── Render ────────────────────────────────────────────
  function renderQuestions() {
    sanitizeFacetFilters();

    const filterKey = getFilterKey();
    if (filterKey !== lastFilterKey) {
      currentPage = 1;
      lastFilterKey = filterKey;
    }

    const questions = sortQuestions(getFilteredQuestions());
    const preCategoryFacet = getBaseFilteredQuestions(false, false);
    const preTagFacet = getBaseFilteredQuestions(true, false);

    subsetCountEl.textContent = questions.length;
    subsetSolvedEl.textContent = questions.filter(q => solvedSet.has(q.id)).length;
    subsetEasyEl.textContent = questions.filter(q => q.difficulty === "Easy").length;
    subsetMediumEl.textContent = questions.filter(q => q.difficulty === "Medium").length;
    subsetHardEl.textContent = questions.filter(q => q.difficulty === "Hard").length;

    updatePagination(questions.length);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageQuestions = questions.slice(start, start + PAGE_SIZE);

    tableBody.innerHTML = "";

    if (questions.length === 0) {
      noResultsMsg.style.display = "flex";
      questionsTable.style.display = "none";
    } else {
      noResultsMsg.style.display = "none";
      questionsTable.style.display = "table";

      pageQuestions.forEach(q => {
        tableBody.appendChild(buildQuestionRow(q));
      });
    }

    sortHeaders.forEach(th => {
      th.classList.remove("sort-asc", "sort-desc");
      if (th.getAttribute("data-sort") === sortColumn) {
        th.classList.add(sortDirection === "asc" ? "sort-asc" : "sort-desc");
      }
    });

    renderCategoryDistribution(preCategoryFacet);
    renderTagsDistribution(preTagFacet);
    renderActiveFilterChips();
    updateUrlHash();
  }

  function renderCategoryDistribution(questionsList) {
    const categoryCounts = {};
    questionsList.forEach(q => { categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1; });
    const sorted = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

    categoriesChartContainer.innerHTML = sorted.length === 0
      ? `<span class="category-empty">No categories</span>`
      : "";

    sorted.forEach(([catName, count]) => {
      const block = document.createElement("div");
      block.className = `category-block${activeCategory === catName ? " active" : ""}`;
      block.setAttribute("title", catName);
      block.innerHTML = `
        <div class="category-block-header">
          <span class="category-block-title">${catName}</span>
          <span class="category-block-count">${count}</span>
        </div>
        <div class="category-bar-bg"><div class="category-bar-fill" style="width:${(count / maxCount) * 100}%"></div></div>
      `;
      block.addEventListener("click", () => {
        const nextCategory = activeCategory === catName ? null : catName;
        setActiveCategory(nextCategory);
        renderQuestions();
      });
      categoriesChartContainer.appendChild(block);
    });
  }

  function renderTagsDistribution(questionsList) {
    const tagCounts = {};
    questionsList.forEach(q => {
      questionTags(q).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    if (!tagsSection || !tagsChartContainer) return;

    if (tagsSectionHint) {
      if (activeCategory && activeTag) {
        tagsSectionHint.textContent = `${activeCategory} · tag: ${activeTag}`;
      } else if (activeCategory) {
        tagsSectionHint.textContent = `Tags in ${activeCategory} · click to narrow`;
      } else if (activeTag) {
        tagsSectionHint.textContent = `Filtered by tag: ${activeTag}`;
      } else {
        tagsSectionHint.textContent = "Technique labels · click to filter";
      }
    }

    tagsSection.hidden = false;
    tagsChartContainer.innerHTML = "";

    if (sorted.length === 0) {
      tagsChartContainer.innerHTML = `<span class="tags-empty">${activeCategory ? `No technique tags in ${activeCategory}` : "No technique tags in current selection"}</span>`;
      return;
    }

    sorted.forEach(([tagName, count]) => {
      const block = document.createElement("div");
      block.className = `tag-block${activeTag === tagName ? " active" : ""}`;
      block.setAttribute("role", "button");
      block.setAttribute("tabindex", "0");
      block.setAttribute("title", `${tagName} · ${count} question${count === 1 ? "" : "s"}`);
      block.innerHTML = `
        <span class="tag-block-name">${tagName}</span>
        <span class="tag-block-count">${count}</span>
      `;
      const activate = () => {
        activeTag = activeTag === tagName ? null : tagName;
        renderQuestions();
      };
      block.addEventListener("click", activate);
      block.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      });
      tagsChartContainer.appendChild(block);
    });
  }

  // ─── Export ────────────────────────────────────────────
  function getExportableQuestions() {
    sanitizeFacetFilters();
    return sortQuestions(getFilteredQuestions());
  }

  function exportCSV() {
    const qs = getExportableQuestions();
    const header = "ID,Name,Difficulty,Category,Original Category,Tags,Sources,Solved,LeetCode Link,Solution Link";
    const rows = qs.map(q =>
      [
        q.id,
        `"${q.name.replace(/"/g, '""')}"`,
        q.difficulty,
        `"${q.category}"`,
        `"${questionOriginalCategory(q).replace(/"/g, '""')}"`,
        `"${questionTags(q).join("; ")}"`,
        `"${q.sources.join("; ")}"`,
        solvedSet.has(q.id) ? "Yes" : "No",
        q.link,
        q.solution_link || ""
      ].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "dsa-questions.csv";
    a.click();
    showToast(`Exported ${qs.length} questions as CSV`);
  }

  function exportMarkdown() {
    const qs = getExportableQuestions();
    const md = qs.map((q, i) => {
      const check = solvedSet.has(q.id) ? "x" : " ";
      const tags = questionTags(q);
      const tagText = tags.length ? ` · ${tags.join(", ")}` : "";
      const original = questionOriginalCategory(q);
      const originalText = original !== q.category ? ` · orig: ${original}` : "";
      const solutionText = q.solution_link ? ` · [solution](${q.solution_link})` : "";
      return `- [${check}] [#${q.id} ${q.name}](${q.link}) · ${q.difficulty} · ${q.category}${originalText}${tagText} · ${q.sources.map(s => LIST_CONFIG[s].short).join(", ")}${solutionText}`;
    }).join("\n");
    navigator.clipboard.writeText(`# DSA Questions (${qs.length})\n\n${md}`).then(() => {
      showToast(`Copied ${qs.length} questions as Markdown`);
    });
  }

  function copyList() {
    const qs = getExportableQuestions();
    const text = qs.map(q => `#${q.id} ${q.name} (${q.difficulty})`).join("\n");
    navigator.clipboard.writeText(text).then(() => showToast(`Copied ${qs.length} question names`));
  }

  function copyShareLink() {
    const url = location.origin + location.pathname + buildHash();
    navigator.clipboard.writeText(url).then(() => showToast("Share link copied"));
  }

  // ─── Event listeners ───────────────────────────────────
  let searchDebounce;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      searchQuery = e.target.value;
      renderQuestions();
    }, 200);
  });

  difficultyBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      difficultyBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeDifficulty = btn.getAttribute("data-difficulty");
      renderQuestions();
    });
  });

  btnReset.addEventListener("click", resetSelectionFilter);
  btnClearAll.addEventListener("click", clearAllFilters);

  overlapFilterBtns.forEach(btn => {
    btn.addEventListener("click", () => togglePendingSheetCount(Number(btn.getAttribute("data-sheet-count"))));
  });

  btnApplyFilters?.addEventListener("click", () => applyPendingFilters());
  btnClearPending?.addEventListener("click", clearPendingSelection);

  sortHeaders.forEach(th => {
    th.addEventListener("click", () => {
      const col = th.getAttribute("data-sort");
      if (sortColumn === col) sortDirection = sortDirection === "asc" ? "desc" : "asc";
      else { sortColumn = col; sortDirection = "asc"; }
      renderQuestions();
    });
  });

  document.getElementById("btn-export-csv").addEventListener("click", exportCSV);
  document.getElementById("btn-export-md").addEventListener("click", exportMarkdown);
  document.getElementById("btn-copy-list").addEventListener("click", copyList);
  document.getElementById("btn-copy-url").addEventListener("click", copyShareLink);

  btnPrevPage.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderQuestions();
      tableContainer?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  btnNextPage.addEventListener("click", () => {
    sanitizeFacetFilters();
    const total = getFilteredQuestions().length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage < totalPages) {
      currentPage++;
      renderQuestions();
      tableContainer?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  window.addEventListener("hashchange", () => {
    if (!isRestoringFromHash) restoreFromHash();
    renderQuestions();
  });

  // ─── Init ──────────────────────────────────────────────
  initHeaderStats();
  initSourceCards();
  initOverlapFilterCounts();
  initVennLegend();
  initVennHint();
  renderVennDiagram();

  const tableColumnCount = document.querySelectorAll("#dsa-questions-table thead th").length;
  const colgroupCount = document.querySelectorAll("#dsa-questions-table colgroup col").length;
  if (tableColumnCount !== 10 || colgroupCount !== 10) {
    console.error(`Table schema mismatch: ${tableColumnCount} headers, ${colgroupCount} col widths (expected 10 each).`);
  }

  if (location.hash) {
    restoreFromHash();
    renderQuestions();
  } else {
    resetSelectionFilter();
  }
});
