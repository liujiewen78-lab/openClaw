const asOf = "2026-03-24";

const skills = [
  {
    slug: "linkfoxagent",
    name: "LinkFoxAgent",
    scenario: "跨境电商通用选品/运营助手（多平台）",
    platforms: "Amazon / TikTok / eBay / Walmart / 1688",
    output: "自动化执行与多工具联动（偏 Agent）",
    requires: ["LINKFOXAGENT_API_KEY"],
    version: "v1.0.6",
    updated: "2026-03-07",
    downloads: 115,
    stars: 1,
    termoUrl: "https://termo.ai/skills/linkfoxagent",
    clawhubUrl: "https://clawhub.ai/skills/linkfoxagent",
    installCmd: "npx clawhub@latest install linkfoxagent",
    zipUrl: "https://wry-manatee-359.convex.site/api/v1/download?slug=linkfoxagent",
  },
  {
    slug: "launchfast-full-research-loop",
    name: "LaunchFast Full Research Loop",
    scenario: "从类目发现到最终选品决策的一体化研究流程",
    platforms: "Amazon（含供应链/商标/IP/广告关键词）",
    output: "HTML 报告 + 结构化选品结论",
    requires: [],
    version: "v1.0.0",
    updated: "2026-03-16",
    downloads: 306,
    stars: 0,
    termoUrl: "https://termo.ai/skills/launchfast-full-research-loop",
    clawhubUrl: "https://clawhub.ai/skills/launchfast-full-research-loop",
    installCmd: "npx clawhub@latest install launchfast-full-research-loop",
    zipUrl: "https://wry-manatee-359.convex.site/api/v1/download?slug=launchfast-full-research-loop",
  },
  {
    slug: "amazon-competitor-analyzer",
    name: "Amazon Competitor Analyzer",
    scenario: "竞品拆解：基于 ASIN 批量对标分析",
    platforms: "Amazon",
    output: "PDF 报告（竞品指标、差异点、机会点）",
    requires: ["BROWSERACT_API_KEY（browseract.com）"],
    version: "v0.1.6",
    updated: "2026-02-25",
    downloads: 844,
    stars: 0,
    termoUrl: "https://termo.ai/skills/amazon-competitor-analyzer",
    clawhubUrl: "https://clawhub.ai/skills/amazon-competitor-analyzer",
    installCmd: "npx clawhub@latest install amazon-competitor-analyzer",
    zipUrl: "https://wry-manatee-359.convex.site/api/v1/download?slug=amazon-competitor-analyzer",
  },
  {
    slug: "amazon-etsy-product-research",
    name: "Amazon & Etsy Bestseller Product Research Engine",
    scenario: "跨平台爆款选品灵感：对比 Amazon 与 Etsy 畅销",
    platforms: "Amazon / Etsy（依赖 Apify Actors）",
    output: "HTML 报告（畅销榜与洞察）",
    requires: ["APIFY_TOKEN"],
    version: "v1.0.0",
    updated: "2026-02-28",
    downloads: 14,
    stars: 0,
    termoUrl: "https://termo.ai/skills/amazon-etsy-product-research",
    clawhubUrl: "https://clawhub.ai/skills/amazon-etsy-product-research",
    installCmd: "npx clawhub@latest install amazon-etsy-product-research",
    zipUrl: null,
  },
  {
    slug: "ai-amazon-product-dominator",
    name: "AI Amazon Product Dominator",
    scenario: "从选品到上新素材：抓取评论→利润测算→Listing/视频",
    platforms: "Amazon（含 InVideo AI）",
    output: "选品洞察 + Listing 草稿 + 营销素材（偏自动化）",
    requires: [],
    version: "v1.0.0",
    updated: "2026-03-16",
    downloads: 157,
    stars: 0,
    termoUrl: "https://termo.ai/skills/ai-amazon-product-dominator",
    clawhubUrl: "https://clawhub.ai/skills/ai-amazon-product-dominator",
    installCmd: "npx clawhub@latest install ai-amazon-product-dominator",
    zipUrl: null,
  },
];

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

function formatHotness(skill) {
  const parts = [];
  if (typeof skill.downloads === "number") parts.push(`下载 ${skill.downloads}`);
  if (typeof skill.stars === "number" && skill.stars > 0) parts.push(`收藏 ${skill.stars}`);
  return parts.join(" · ") || "—";
}

function appendTextCell(row, text) {
  const td = document.createElement("td");
  td.textContent = text ?? "";
  row.appendChild(td);
}

function appendLinksCell(row, skill) {
  const td = document.createElement("td");
  td.className = "no-print";

  const wrap = document.createElement("div");
  wrap.className = "links";

  const termo = document.createElement("a");
  termo.className = "btn row-link";
  termo.href = skill.termoUrl;
  termo.target = "_blank";
  termo.rel = "noreferrer";
  termo.textContent = "Termo 页面";

  const clawhub = document.createElement("a");
  clawhub.className = "btn row-link";
  clawhub.href = skill.clawhubUrl;
  clawhub.target = "_blank";
  clawhub.rel = "noreferrer";
  clawhub.textContent = "ClawHub 页面";

  wrap.appendChild(termo);
  wrap.appendChild(clawhub);

  if (skill.zipUrl) {
    const zip = document.createElement("a");
    zip.className = "btn row-link primary";
    zip.href = skill.zipUrl;
    zip.target = "_blank";
    zip.rel = "noreferrer";
    zip.textContent = "ZIP 下载";
    wrap.appendChild(zip);
  }

  const mono = document.createElement("span");
  mono.className = "mono";
  mono.textContent = skill.installCmd;

  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "btn ghost small";
  copy.textContent = "复制安装命令";
  copy.dataset.copy = skill.installCmd;

  wrap.appendChild(mono);
  wrap.appendChild(copy);

  td.appendChild(wrap);
  row.appendChild(td);
}

function render() {
  setText("#asOf", asOf);
  setText("#skillCount", String(skills.length));

  const tbody = document.querySelector("#skillsTbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  for (const skill of skills) {
    const tr = document.createElement("tr");

    appendTextCell(tr, `${skill.name}（${skill.slug}）`);
    appendTextCell(tr, skill.scenario);
    appendTextCell(tr, skill.platforms);
    appendTextCell(tr, skill.output);
    appendTextCell(tr, (skill.requires && skill.requires.length) ? skill.requires.join("，") : "—");
    appendTextCell(tr, `${skill.version} · ${skill.updated}`);
    appendTextCell(tr, formatHotness(skill));
    appendLinksCell(tr, skill);

    tbody.appendChild(tr);
  }
}

async function copyToClipboard(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }
}

document.addEventListener("click", async (e) => {
  const btn = e.target instanceof HTMLElement ? e.target.closest("button[data-copy]") : null;
  if (!btn) return;
  const text = btn.dataset.copy;
  const ok = await copyToClipboard(text);
  const old = btn.textContent;
  btn.textContent = ok ? "已复制" : "复制失败";
  setTimeout(() => {
    btn.textContent = old || "复制安装命令";
  }, 900);
});

render();
