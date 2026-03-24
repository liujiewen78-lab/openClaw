const DEFAULT_CSV = `"identifier","asin","keyword","price","est_margin_pct","monthly_sales","search_volume","review_count","rating","sales_trend_90d","ip_risk","hazmat","demand_score","margin_score","competition_score","stability_score","opportunity_score","passed_filter","rejection_reason"
"B003","B003","dog paw cleaner cup","24.99","35","2400","38000","430","4.2","18","low","false","61.57","35","83.04","100","66.06","True",""
"B001","B001","portable blender","39.99","31","1800","42000","650","4.3","12","low","false","49.82","31","69.26","73.91","53.59","True",""
"B005","B005","magnetic spice jars","29.99","33","1300","22000","120","4.1","6","low","false","17.26","33","100","47.83","46.47","True",""
"B002","B002","silicone air fryer liners","12.99","22","3200","56000","2100","4.6","8","medium","false","100","22","0","56.52","48.98","False","margin<25;price_out_of_range"
"B004","B004","usb heated blanket","49.99","28","900","15000","180","4.4","-5","high","false","0","28","79.88","0","26.97","False","high_ip_risk"`;

const snapshotGrid = document.getElementById("snapshotGrid");
const topBody = document.getElementById("topBody");
const rejectedBody = document.getElementById("rejectedBody");
const priorityCards = document.getElementById("priorityCards");
const csvInput = document.getElementById("csvInput");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const resetBtn = document.getElementById("resetBtn");

const searchInput = document.getElementById("searchInput");
const scopeSelect = document.getElementById("scopeSelect");
const minOppInput = document.getElementById("minOppInput");
const priceMinInput = document.getElementById("priceMinInput");
const priceMaxInput = document.getElementById("priceMaxInput");
const minMarginInput = document.getElementById("minMarginInput");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const filteredCount = document.getElementById("filteredCount");
const topTable = document.getElementById("topTable");

const ALLOWED_SORT_KEYS = new Set([
  "opportunity_score",
  "monthly_sales",
  "price",
  "est_margin_pct",
  "review_count"
]);

const state = {
  allRows: [],
  filters: {
    search: "",
    scope: "all",
    minOpp: "",
    priceMin: "",
    priceMax: "",
    minMargin: ""
  },
  sort: {
    key: "opportunity_score",
    dir: "desc"
  }
};

function parseCSV(text) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i += 1;
      if (current.length > 0 || row.length > 0) {
        row.push(current);
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0].map((h) => h.trim().replace(/^\uFEFF/, ""));
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] || "").trim();
    });
    return obj;
  });
}

function toNumber(v) {
  const n = Number(String(v || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function toOptionalNumber(v) {
  const s = String(v || "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toBool(v) {
  return String(v || "").toLowerCase() === "true";
}

function median(arr) {
  const nums = [...arr].sort((a, b) => a - b);
  if (!nums.length) return 0;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function formatNum(n) {
  return new Intl.NumberFormat("zh-CN").format(Math.round(n));
}

function escapeHTML(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function riskLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "低";
  const lower = raw.toLowerCase();
  if (lower === "low" || raw === "低") return "低";
  if (lower === "medium" || raw === "中") return "中";
  if (lower === "high" || raw === "高") return "高";
  return raw;
}

function isHighRisk(value) {
  const lower = String(value || "").trim().toLowerCase();
  return lower === "high" || lower === "高";
}

function normalizeRows(records) {
  return records.map((r) => ({
    ...r,
    identifier: String(r.identifier || "").trim(),
    asin: String(r.asin || "").trim(),
    keyword: String(r.keyword || "").trim(),
    ip_risk: String(r.ip_risk || "").trim(),
    rejection_reason: String(r.rejection_reason || "").trim(),
    opportunity_score: toNumber(r.opportunity_score),
    monthly_sales: toNumber(r.monthly_sales),
    price: toNumber(r.price),
    est_margin_pct: toNumber(r.est_margin_pct),
    review_count: toNumber(r.review_count),
    passed_filter: toBool(r.passed_filter)
  }));
}

function applyFilters(rows) {
  const search = state.filters.search.trim().toLowerCase();
  const scope = state.filters.scope;
  const minOpp = toOptionalNumber(state.filters.minOpp);
  const priceMin = toOptionalNumber(state.filters.priceMin);
  const priceMax = toOptionalNumber(state.filters.priceMax);
  const minMargin = toOptionalNumber(state.filters.minMargin);

  return rows.filter((r) => {
    if (scope === "passed" && !r.passed_filter) return false;
    if (scope === "rejected" && r.passed_filter) return false;

    if (search) {
      const haystack = `${r.identifier} ${r.asin} ${r.keyword}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    if (minOpp !== null && r.opportunity_score < minOpp) return false;
    if (priceMin !== null && r.price < priceMin) return false;
    if (priceMax !== null && r.price > priceMax) return false;
    if (minMargin !== null && r.est_margin_pct < minMargin) return false;

    return true;
  });
}

function sortRows(rows) {
  const key = state.sort.key;
  const dir = state.sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[key] || 0;
    const bv = b[key] || 0;
    if (av === bv) return 0;
    return av > bv ? dir : -dir;
  });
}

function updateFilteredCount(total, filtered, passed, rejected) {
  if (!filteredCount) return;
  filteredCount.textContent = `已筛选：${filtered}/${total}（通过 ${passed}，淘汰 ${rejected}）`;
}

function updateSortIndicators() {
  if (!topTable) return;
  const ths = topTable.querySelectorAll("th[data-sort]");
  ths.forEach((th) => {
    th.classList.remove("sorted-asc", "sorted-desc");
    th.setAttribute("aria-sort", "none");
    if (th.dataset.sort === state.sort.key) {
      th.classList.add(state.sort.dir === "asc" ? "sorted-asc" : "sorted-desc");
      th.setAttribute("aria-sort", state.sort.dir === "asc" ? "ascending" : "descending");
    }
  });
}

function renderFromState() {
  const filteredRows = applyFilters(state.allRows);
  const passedRows = filteredRows.filter((r) => r.passed_filter);
  const rejectedRows = filteredRows.filter((r) => !r.passed_filter);

  updateFilteredCount(state.allRows.length, filteredRows.length, passedRows.length, rejectedRows.length);

  const kpis = [
    ["总候选数", filteredRows.length],
    ["通过过滤", passedRows.length],
    ["中位价格", `¥${median(filteredRows.map((r) => r.price)).toFixed(2)}`],
    ["中位月销", formatNum(median(filteredRows.map((r) => r.monthly_sales)))],
    [
      "平均机会分",
      (filteredRows.reduce((s, r) => s + r.opportunity_score, 0) / Math.max(filteredRows.length, 1)).toFixed(2)
    ]
  ];

  if (snapshotGrid) {
    snapshotGrid.innerHTML = kpis
      .map(
        ([label, value]) =>
          `<article class="kpi"><div class="label">${label}</div><div class="value">${value}</div></article>`
      )
      .join("");
  }

  const topRows = sortRows(passedRows).slice(0, 10);

  if (topBody) {
    if (!topRows.length) {
      topBody.innerHTML = `<tr><td class="empty-row" colspan="7">暂无符合条件的数据</td></tr>`;
    } else {
      topBody.innerHTML = topRows
        .map((r) => {
          const name = escapeHTML(r.identifier || r.asin || r.keyword || "-");
          const riskText = escapeHTML(riskLabel(r.ip_risk));
          const riskClass = isHighRisk(r.ip_risk) ? "bad" : "ok";
          return `<tr>
        <td>${name}</td>
        <td><strong>${r.opportunity_score.toFixed(2)}</strong></td>
        <td>${formatNum(r.monthly_sales)}</td>
        <td>¥${r.price.toFixed(2)}</td>
        <td>${r.est_margin_pct.toFixed(1)}%</td>
        <td>${formatNum(r.review_count)} 条评价</td>
        <td><span class="tag ${riskClass}">${riskText}</span></td>
      </tr>`;
        })
        .join("");
    }
  }

  const top3 = topRows.slice(0, 3);
  if (priorityCards) {
    if (!top3.length) {
      priorityCards.innerHTML = `<div class="empty-block">暂无符合条件的数据</div>`;
    } else {
      priorityCards.innerHTML = top3
        .map((r, idx) => {
          const title = escapeHTML(r.identifier || r.keyword || "-");
          const reason =
            r.monthly_sales > 2000
              ? "需求强，适合优先测试。"
              : r.est_margin_pct >= 30
                ? "利润空间充足，抗广告波动能力更强。"
                : "竞争压力可控，适合做差异化切入。";
          return `<article class="card">
        <p class="eyebrow">优先级 ${idx + 1}</p>
        <h3>${title}</h3>
        <p>机会分 <strong>${r.opportunity_score.toFixed(2)}</strong> | 利润率 <strong>${r.est_margin_pct.toFixed(
            1
          )}%</strong></p>
        <p>${reason}</p>
      </article>`;
        })
        .join("");
    }
  }

  const rejectedTop = [...rejectedRows].sort((a, b) => b.monthly_sales - a.monthly_sales).slice(0, 5);
  if (rejectedBody) {
    if (!rejectedTop.length) {
      rejectedBody.innerHTML = `<tr><td class="empty-row" colspan="4">暂无符合条件的数据</td></tr>`;
    } else {
      rejectedBody.innerHTML = rejectedTop
        .map((r) => {
          const name = escapeHTML(r.identifier || r.asin || r.keyword || "-");
          const reason = escapeHTML(r.rejection_reason || "规则过滤");
          return `<tr>
        <td>${name}</td>
        <td>${r.opportunity_score.toFixed(2)}</td>
        <td>${formatNum(r.monthly_sales)}</td>
        <td><span class="tag bad">${reason}</span></td>
      </tr>`;
        })
        .join("");
    }
  }

  updateSortIndicators();
}

function loadCsvText(text) {
  state.allRows = normalizeRows(parseCSV(String(text || "")));
  renderFromState();
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    state.filters.search = searchInput.value;
    renderFromState();
  });
}

if (scopeSelect) {
  scopeSelect.addEventListener("change", () => {
    state.filters.scope = scopeSelect.value;
    renderFromState();
  });
}

if (minOppInput) {
  minOppInput.addEventListener("input", () => {
    state.filters.minOpp = minOppInput.value;
    renderFromState();
  });
}

if (priceMinInput) {
  priceMinInput.addEventListener("input", () => {
    state.filters.priceMin = priceMinInput.value;
    renderFromState();
  });
}

if (priceMaxInput) {
  priceMaxInput.addEventListener("input", () => {
    state.filters.priceMax = priceMaxInput.value;
    renderFromState();
  });
}

if (minMarginInput) {
  minMarginInput.addEventListener("input", () => {
    state.filters.minMargin = minMarginInput.value;
    renderFromState();
  });
}

if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (scopeSelect) scopeSelect.value = "all";
    if (minOppInput) minOppInput.value = "";
    if (priceMinInput) priceMinInput.value = "";
    if (priceMaxInput) priceMaxInput.value = "";
    if (minMarginInput) minMarginInput.value = "";

    state.filters.search = "";
    state.filters.scope = "all";
    state.filters.minOpp = "";
    state.filters.priceMin = "";
    state.filters.priceMax = "";
    state.filters.minMargin = "";

    renderFromState();
  });
}

if (topTable) {
  const thead = topTable.querySelector("thead");
  if (thead) {
    thead.addEventListener("click", (e) => {
      const th = e.target && e.target.closest ? e.target.closest("th[data-sort]") : null;
      if (!th) return;
      const key = String(th.dataset.sort || "");
      if (!ALLOWED_SORT_KEYS.has(key)) return;

      if (state.sort.key === key) {
        state.sort.dir = state.sort.dir === "desc" ? "asc" : "desc";
      } else {
        state.sort.key = key;
        state.sort.dir = "desc";
      }

      renderFromState();
    });
  }
}

if (csvInput) {
  csvInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      loadCsvText(String(reader.result || ""));
    };
    reader.readAsText(file, "utf-8");
  });
}

if (exportPdfBtn) {
  exportPdfBtn.addEventListener("click", () => {
    window.print();
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    loadCsvText(DEFAULT_CSV);
    if (csvInput) csvInput.value = "";
  });
}

loadCsvText(DEFAULT_CSV);