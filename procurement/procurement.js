const toast = document.querySelector('[data-copy-toast]');
const filterPanel = document.querySelector('.filter-panel');
const brandFilter = document.getElementById('brandFilter');
const styleFilter = document.getElementById('styleFilter');
const roleFilter = document.getElementById('roleFilter');
const clearFilterBtn = document.getElementById('clearFilterBtn');
const filterCount = document.getElementById('filterCount');
const cards = Array.from(document.querySelectorAll('[data-offer-card]'));
const sections = Array.from(document.querySelectorAll('.sku-section[data-sku]'));

const sectionEmptyMap = new Map();
const globalEmpty = document.createElement('div');
globalEmpty.className = 'section-empty';
globalEmpty.hidden = true;
globalEmpty.textContent = '当前筛选下没有匹配的供应商卡片，可以先清空筛选再继续看。';
filterPanel?.insertAdjacentElement('afterend', globalEmpty);

sections.forEach((section) => {
  const empty = document.createElement('div');
  empty.className = 'section-empty';
  empty.hidden = true;
  empty.textContent = '这个 SKU 在当前筛选下暂无匹配卡片。';
  section.appendChild(empty);
  sectionEmptyMap.set(section, empty);
});

function getFilters() {
  return {
    brand: brandFilter?.value || 'all',
    style: styleFilter?.value || 'all',
    role: roleFilter?.value || 'all',
  };
}

function syncQuery(filters) {
  const url = new URL(window.location.href);
  ['brand', 'style', 'role'].forEach((key) => url.searchParams.delete(key));

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== 'all') {
      url.searchParams.set(key, value);
    }
  });

  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

function applyFilters() {
  const filters = getFilters();
  let visibleCards = 0;

  cards.forEach((card) => {
    const matchBrand = filters.brand === 'all' || card.dataset.brand === filters.brand;
    const matchStyle = filters.style === 'all' || card.dataset.style === filters.style;
    const matchRole = filters.role === 'all' || card.dataset.role === filters.role;
    const visible = matchBrand && matchStyle && matchRole;
    card.hidden = !visible;
    if (visible) {
      visibleCards += 1;
    }
  });

  let visibleSections = 0;

  sections.forEach((section) => {
    const sectionCards = Array.from(section.querySelectorAll('[data-offer-card]'));
    const hasVisibleCard = sectionCards.some((card) => !card.hidden);
    const empty = sectionEmptyMap.get(section);
    section.hidden = !hasVisibleCard;
    if (empty) {
      empty.hidden = hasVisibleCard;
    }
    if (hasVisibleCard) {
      visibleSections += 1;
    }
  });

  globalEmpty.hidden = visibleCards > 0;

  if (filterCount) {
    filterCount.textContent = `当前显示 ${visibleCards} / ${cards.length} 个供应商卡片，覆盖 ${visibleSections} / ${sections.length} 个 SKU`;
  }

  syncQuery(filters);
}

function hydrateFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const allowed = {
    brand: new Set(['all', 'toyota', 'honda', 'ford']),
    style: new Set(['all', 'gift', 'fitment', 'set', 'functional', 'female']),
    role: new Set(['all', 'main', 'backup', 'comparison']),
  };

  const queryBrand = params.get('brand');
  const queryStyle = params.get('style');
  const queryRole = params.get('role');

  if (brandFilter && queryBrand && allowed.brand.has(queryBrand)) {
    brandFilter.value = queryBrand;
  }
  if (styleFilter && queryStyle && allowed.style.has(queryStyle)) {
    styleFilter.value = queryStyle;
  }
  if (roleFilter && queryRole && allowed.role.has(queryRole)) {
    roleFilter.value = queryRole;
  }
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', 'readonly');
  input.style.position = 'absolute';
  input.style.left = '-9999px';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
}

function showToast(message) {
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 1800);
}

[brandFilter, styleFilter, roleFilter].forEach((field) => {
  field?.addEventListener('change', applyFilters);
});

clearFilterBtn?.addEventListener('click', () => {
  if (brandFilter) {
    brandFilter.value = 'all';
  }
  if (styleFilter) {
    styleFilter.value = 'all';
  }
  if (roleFilter) {
    roleFilter.value = 'all';
  }
  applyFilters();
});

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const target = button.getAttribute('data-copy');
    if (!target) {
      return;
    }

    try {
      await copyText(target);
      showToast('链接已复制，直接粘贴到浏览器即可查看。');
    } catch (error) {
      console.error(error);
      showToast('复制失败，请手动复制下方网址。');
    }
  });
});

hydrateFromQuery();
applyFilters();
