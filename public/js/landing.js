/**
 * Landing Page & Funnel Engine (Vanilla JS)
 * High performance, ultra-fast loading, dynamic blocks, glowing line journey, offers & direct checkout
 */

// Algerian Wilayas list with standard codes
const ALGERIAN_WILAYAS = [
  { code: 1, name: "أدرار", en: "Adrar", home: 1200, desk: 800 },
  { code: 2, name: "الشلف", en: "Chlef", home: 800, desk: 500 },
  { code: 3, name: "الأغواط", en: "Laghouat", home: 1100, desk: 700 },
  { code: 4, name: "أم البواقي", en: "Oum El Bouaghi", home: 800, desk: 500 },
  { code: 5, name: "باتنة", en: "Batna", home: 800, desk: 500 },
  { code: 6, name: "بجاية", en: "Béjaïa", home: 800, desk: 500 },
  { code: 7, name: "بسكرة", en: "Biskra", home: 1100, desk: 700 },
  { code: 8, name: "بشار", en: "Béchar", home: 1200, desk: 800 },
  { code: 9, name: "البليدة", en: "Blida", home: 600, desk: 400 },
  { code: 10, name: "البويرة", en: "Bouira", home: 800, desk: 500 },
  { code: 11, name: "تمنراست", en: "Tamanrasset", home: 1950, desk: 1400 },
  { code: 12, name: "تبسة", en: "Tébessa", home: 1100, desk: 700 },
  { code: 13, name: "تلمسان", en: "Tlemcen", home: 800, desk: 500 },
  { code: 14, name: "تيارت", en: "Tiaret", home: 800, desk: 500 },
  { code: 15, name: "تيزي وزو", en: "Tizi Ouzou", home: 800, desk: 500 },
  { code: 16, name: "الجزائر", en: "Algiers", home: 500, desk: 350 },
  { code: 17, name: "الجلفة", en: "Djelfa", home: 1100, desk: 700 },
  { code: 18, name: "جيجل", en: "Jijel", home: 800, desk: 500 },
  { code: 19, name: "سطيف", en: "Sétif", home: 800, desk: 500 },
  { code: 20, name: "سعيدة", en: "Saïda", home: 900, desk: 600 },
  { code: 21, name: "سكيكدة", en: "Skikda", home: 900, desk: 600 },
  { code: 22, name: "سيدي بلعباس", en: "Sidi Bel Abbès", home: 800, desk: 500 },
  { code: 23, name: "عنابة", en: "Annaba", home: 800, desk: 500 },
  { code: 24, name: "قالمة", en: "Guelma", home: 900, desk: 600 },
  { code: 25, name: "قسنطينة", en: "Constantine", home: 800, desk: 500 },
  { code: 26, name: "المدية", en: "Médéa", home: 800, desk: 500 },
  { code: 27, name: "مستغانم", en: "Mostaganem", home: 800, desk: 500 },
  { code: 28, name: "المسيلة", en: "M'Sila", home: 800, desk: 500 },
  { code: 29, name: "معسكر", en: "Mascara", home: 800, desk: 500 },
  { code: 30, name: "ورقلة", en: "Ouargla", home: 1100, desk: 700 },
  { code: 31, name: "وهران", en: "Oran", home: 800, desk: 500 },
  { code: 32, name: "البيض", en: "El Bayadh", home: 1200, desk: 800 },
  { code: 33, name: "إليزي", en: "Illizi", home: 2000, desk: 1500 },
  { code: 34, name: "برج بوعريريج", en: "Bordj Bou Arréridj", home: 800, desk: 500 },
  { code: 35, name: "بومرداس", en: "Boumerdès", home: 600, desk: 400 },
  { code: 36, name: "الطارف", en: "El Tarf", home: 900, desk: 600 },
  { code: 37, name: "تندوف", en: "Tindouf", home: 1950, desk: 1400 },
  { code: 38, name: "تيسمسيلت", en: "Tissemsilt", home: 900, desk: 600 },
  { code: 39, name: "الوادي", en: "El Oued", home: 1100, desk: 700 },
  { code: 40, name: "خنشلة", en: "Khenchela", home: 900, desk: 600 },
  { code: 41, name: "سوق أهراس", en: "Souk Ahras", home: 900, desk: 600 },
  { code: 42, name: "تيبازة", en: "Tipaza", home: 600, desk: 400 },
  { code: 43, name: "ميلة", en: "Mila", home: 800, desk: 500 },
  { code: 44, name: "عين الدفلى", en: "Aïn Defla", home: 800, desk: 500 },
  { code: 45, name: "النعامة", en: "Naâma", home: 1200, desk: 800 },
  { code: 46, name: "عين تموشنت", en: "Aïn Témouchent", home: 800, desk: 500 },
  { code: 47, name: "غرداية", en: "Ghardaïa", home: 1100, desk: 700 },
  { code: 48, name: "غليزان", en: "Relizane", home: 800, desk: 500 },
  { code: 49, name: "تيميمون", en: "Timimoun", home: 1200, desk: 800 },
  { code: 50, name: "برج باجي مختار", en: "Bordj Badji Mokhtar", home: 1950, desk: 1400 },
  { code: 51, name: "أولاد جلال", en: "Ouled Djellal", home: 1100, desk: 700 },
  { code: 52, name: "بني عباس", en: "Béni Abbès", home: 1200, desk: 800 },
  { code: 53, name: "عين صالح", en: "In Salah", home: 1950, desk: 1400 },
  { code: 54, name: "عين قزام", en: "In Guezzam", home: 1950, desk: 1400 },
  { code: 55, name: "تقرت", en: "Touggourt", home: 1100, desk: 700 },
  { code: 56, name: "جانت", en: "Djanet", home: 2000, desk: 1500 },
  { code: 57, name: "المغير", en: "El M'Ghair", home: 1100, desk: 700 },
  { code: 58, name: "المنيعة", en: "El Menia", home: 1200, desk: 800 }
];

let currentFunnelData = null;
let selectedOffer = null;
let appliedPromo = null;
let csrfToken = null;

function getCurrentSlug() {
  const params = new URLSearchParams(window.location.search);
  let raw = params.get('slug');

  if (!raw) {
    const path = window.location.pathname.replace(/\/$/, '');
    const segments = path.split('/');
    raw = segments[segments.length - 1];
  }

  if (!raw) return 'skin-solutions';

  try {
    while (raw.includes('%')) {
      const decoded = decodeURIComponent(raw);
      if (decoded === raw) break;
      raw = decoded;
    }
  } catch (e) {}

  return raw.trim();
}

// Fetch CSRF token for checkout form
async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  try {
    const res = await fetch('/api/csrf-token');
    if (res.ok) {
      const data = await res.json();
      csrfToken = data.csrfToken;
      return csrfToken;
    }
  } catch (e) {
    console.warn('Could not fetch csrf token:', e);
  }
  return '';
}

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
  const slug = getCurrentSlug();
  await loadFunnelNode(slug);
  await getCsrfToken();
});

// Load node data from backend
async function loadFunnelNode(slug) {
  const root = document.getElementById('landing-page-root');
  if (!root) return;

  try {
    const res = await fetch(`/api/funnels/node/${encodeURIComponent(slug)}`);
    if (!res.ok) {
      if (res.status === 404) {
        root.innerHTML = `
          <div class="container py-5 text-center">
            <i class="bi bi-exclamation-circle text-warning display-3"></i>
            <h2 class="mt-3 fw-bold">عذراً، الصفحة غير موجودة</h2>
            <p class="text-muted">الصفحة التي تبحث عنها قد تم نقلها أو حذفها.</p>
            <a href="/" class="btn btn-outline-success mt-2">العودة للرئيسية</a>
          </div>
        `;
        return;
      }
      throw new Error('فشل جلب بيانات الصفحة');
    }

    currentFunnelData = await res.json();
    renderPage(currentFunnelData);
  } catch (err) {
    console.error('Error loading funnel node:', err);
    root.innerHTML = `
      <div class="container py-5 text-center text-danger">
        <i class="bi bi-wifi-off display-4"></i>
        <h3 class="mt-3">تعذر تحميل المحتوى</h3>
        <p class="text-muted">يرجى التأكد من اتصالك بالإنترنت وإعادة المحاولة.</p>
        <button onclick="location.reload()" class="btn btn-success mt-2">إعادة المحاولة</button>
      </div>
    `;
  }
}

// Render Page (Breadcrumbs, Titles, Content)
function renderPage(data) {
  const { node, breadcrumbs, children, blocks, offers } = data;

  // 1. Meta & Document Title
  if (node.meta_title) {
    document.title = node.meta_title;
  } else if (node.title) {
    document.title = `${node.title} | Omervita`;
  }

  if (node.meta_description) {
    const descMeta = document.getElementById('page-meta-description');
    if (descMeta) descMeta.setAttribute('content', node.meta_description);
  }

  // 2. Breadcrumbs
  renderBreadcrumbs(breadcrumbs, node);

  // Apply page-level custom styling from settings if defined
  const nodeSettings = typeof node.settings === 'object' && node.settings !== null ? node.settings : {};
  if (nodeSettings.page_bg_color && nodeSettings.page_bg_color !== '#ffffff') {
    document.body.style.backgroundColor = nodeSettings.page_bg_color;
  }
  if (nodeSettings.price_color) {
    document.documentElement.style.setProperty('--landing-price-color', nodeSettings.price_color);
  }

  const root = document.getElementById('landing-page-root');

  // 3. Render Section View or Landing Page View
  if (node.type === 'section') {
    renderSectionView(root, node, children);
  } else {
    renderLandingPageView(root, node, blocks, offers);
  }
}

// Render Breadcrumbs
function renderBreadcrumbs(breadcrumbs, currentNode) {
  const bcRoot = document.getElementById('funnel-breadcrumbs-root');
  if (!bcRoot) return;

  let html = `<a href="/"><i class="bi bi-house-door me-1"></i>الرئيسية</a>`;
  if (Array.isArray(breadcrumbs)) {
    breadcrumbs.forEach(bc => {
      html += ` <i class="bi bi-chevron-left mx-2 text-muted small"></i> <a href="/solutions/${bc.slug}">${bc.title}</a>`;
    });
  }
  html += ` <i class="bi bi-chevron-left mx-2 text-muted small"></i> <span class="text-dark fw-bold">${currentNode.title}</span>`;
  bcRoot.innerHTML = html;
}

// --------------------------------------------------------------------------
// SECTION VIEW (Grid of Sub-sections)
// --------------------------------------------------------------------------
function renderSectionView(root, node, children) {
  const bannerImg = node.image_url || '/images/category-banner-oil.jpg';
  const nodeSettings = typeof node.settings === 'object' && node.settings !== null ? node.settings : {};

  // Custom Tag above subsections
  const sectionTag = nodeSettings.section_tag || 'دليلك وحلولك المتكاملة';
  let sectionTagStyle = '';
  if (nodeSettings.tag_color) sectionTagStyle += `color: ${nodeSettings.tag_color} !important; border-color: ${nodeSettings.tag_color}44 !important; `;
  if (nodeSettings.tag_bg_color) sectionTagStyle += `background: ${nodeSettings.tag_bg_color} !important; `;

  // Big Section Title & Subtitle Colors
  const sectionTitle = nodeSettings.section_heading || node.title;
  let sectionTitleStyle = nodeSettings.title_color ? `style="color: ${nodeSettings.title_color} !important;"` : '';
  let sectionTextStyle = nodeSettings.text_color ? `style="color: ${nodeSettings.text_color} !important;"` : '';

  let html = `
    <div class="container subsections-container">
      <!-- Section Header -->
      <div class="text-center max-w-700 mx-auto mb-4">
        <h1 class="h2 fw-bold text-dark mb-2" ${sectionTitleStyle}>${sectionTitle}</h1>
        ${node.subtitle ? `<p class="text-muted small mb-0" ${sectionTextStyle}>${node.subtitle}</p>` : ''}
      </div>

      <!-- Sub-sections Grid -->
      ${(!children || children.length === 0) ? `
        <div class="text-center py-5 bg-white rounded-4 shadow-sm border p-4">
          <i class="bi bi-folder-check text-muted display-4"></i>
          <p class="mt-3 text-muted">لا توجد أقسام فرعية مضافة حالياً في هذا القسم.</p>
          <a href="/" class="btn btn-outline-success mt-2">تصفح الرئيسية</a>
        </div>
      ` : `
        <div class="subsections-grid">
          ${children.map(child => {
            const childImg = child.image_url || bannerImg;
            const btnText = child.button_text || 'اكتشف الحل والعروض ➔';
            const link = `/solutions/${child.slug}`;

            const childSettings = typeof child.settings === 'object' && child.settings !== null ? child.settings : {};

            let titleStyle = childSettings.title_color ? `style="color: ${childSettings.title_color} !important;"` : '';
            let textStyle = childSettings.text_color ? `style="color: ${childSettings.text_color} !important;"` : '';

            let btnStyle = '';
            if (childSettings.button_color) btnStyle += `background: ${childSettings.button_color} !important; `;
            if (childSettings.button_text_color) btnStyle += `color: ${childSettings.button_text_color} !important; `;

            return `
              <div class="subsection-card">
                <div class="subsection-card-img-wrap position-relative" style="aspect-ratio: 1/1;">
                  <img src="${childImg}" alt="${child.title}" class="subsection-card-img" width="400" height="400" style="aspect-ratio: 1/1; object-fit: cover;" loading="lazy">
                </div>
                <div class="subsection-card-body">
                  <h3 class="subsection-card-title" ${titleStyle}>${child.title}</h3>
                  <p class="subsection-card-desc" ${textStyle}>${child.subtitle || 'اكتشف الروتين والمنتجات الطبيعية المصممة خصيصاً للحصول على أفضل النتائج.'}</p>
                  <a href="${link}" class="subsection-card-btn" style="${btnStyle}">
                    <span>${btnText}</span>
                  </a>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;

  root.innerHTML = html;
}

// --------------------------------------------------------------------------
// LANDING PAGE VIEW (Funnel Blocks + Glowing Journey Spine + Direct Checkout)
// --------------------------------------------------------------------------
function renderLandingPageView(root, node, blocks, offers) {
  let html = `<div class="funnel-journey-wrapper">`;

  // Sort blocks
  const sortedBlocks = (blocks || []).slice().sort((a, b) => a.order_index - b.order_index);

  // Default offer selection (prefer is_popular, else first offer)
  if (Array.isArray(offers) && offers.length > 0) {
    selectedOffer = offers.find(o => o.is_popular) || offers[0];
  }

  let stepNumber = 1;

  sortedBlocks.forEach((block, idx) => {
    // Add waypoint dot between blocks
    if (idx > 0) {
      html += `
        <div class="funnel-waypoint">
          <div class="funnel-waypoint-dot">${stepNumber++}</div>
        </div>
      `;
    }

    html += renderBlock(block, offers, node);
  });

  html += `</div>`;
  root.innerHTML = html;

  // Initialize interactive components after DOM injection
  attachOffersEvents();
  initLandingOrderForm();
  initFaqEvents();
}

// Helpers for dynamic typography, colors, symbols, and dimensions
function formatBlockTitle(title, styles, defaultTag = 'h2', defaultClass = '') {
  if (!title) return '';
  let inline = '';
  if (styles.title_size) inline += `font-size: ${styles.title_size} !important; `;
  if (styles.title_color) inline += `color: ${styles.title_color} !important; `;
  if (styles.font_weight) inline += `font-weight: ${styles.font_weight} !important; `;
  if (styles.font_family) inline += `font-family: '${styles.font_family}', sans-serif !important; `;
  if (styles.text_align) inline += `text-align: ${styles.text_align} !important; `;

  let iconHtml = '';
  if (styles.icon_symbol) {
    const sym = styles.icon_symbol.trim();
    if (sym.startsWith('bi ') || sym.startsWith('bi-')) {
      const cls = sym.startsWith('bi ') ? sym : `bi ${sym}`;
      iconHtml = `<i class="${cls} me-2" style="color: ${styles.title_color || 'inherit'};"></i>`;
    } else {
      iconHtml = `<span class="me-2">${sym}</span>`;
    }
  }

  return `<${defaultTag} class="${defaultClass}" style="${inline}">${iconHtml}<span>${title}</span></${defaultTag}>`;
}

function formatBlockText(text, styles, tag = 'p', extraClass = '') {
  if (!text) return '';
  let inline = '';
  if (styles.text_size) inline += `font-size: ${styles.text_size} !important; `;
  if (styles.text_color) inline += `color: ${styles.text_color} !important; `;
  if (styles.font_family) inline += `font-family: '${styles.font_family}', sans-serif !important; `;
  if (styles.text_align) inline += `text-align: ${styles.text_align} !important; `;
  return `<${tag} class="${extraClass}" style="${inline}">${text.replace(/\n/g, '<br>')}</${tag}>`;
}

function getBlockBtnStyle(styles, node) {
  const nodeSettings = typeof node?.settings === 'object' && node.settings !== null ? node.settings : {};
  const bg = styles.btn_bg_color || nodeSettings.button_color || '#5a6344';
  const text = styles.btn_text_color || nodeSettings.button_text_color || '#ffffff';
  return `background: ${bg} !important; color: ${text} !important; border-color: ${bg} !important;`;
}

function getBlockPriceStyle(styles, node) {
  const nodeSettings = typeof node?.settings === 'object' && node.settings !== null ? node.settings : {};
  const color = styles.price_color || nodeSettings.price_color || '#5a6344';
  return `color: ${color} !important;`;
}

function getBlockImageRatioStyle(styles) {
  const ratio = styles.image_aspect_ratio || '1:1';
  const fit = styles.image_fit || 'cover';
  if (ratio === 'auto') {
    return `width: 100%; height: auto; object-fit: ${fit};`;
  }
  const cssRatio = ratio.replace(':', ' / ');
  return `width: 100%; aspect-ratio: ${cssRatio}; object-fit: ${fit};`;
}

// Render individual block by type
function renderBlock(block, offers, node) {
  const content = typeof block.content === 'object' && block.content !== null ? block.content : {};
  const styles = typeof block.styles === 'object' && block.styles !== null ? block.styles : {};

  // Custom Typography & Container Inline Styles
  let customStyle = '';
  if (styles.font_family) customStyle += `font-family: '${styles.font_family}', sans-serif; `;
  if (styles.text_color) customStyle += `color: ${styles.text_color}; `;
  if (styles.text_align) customStyle += `text-align: ${styles.text_align}; `;
  if (styles.bg_color && styles.bg_color !== 'transparent' && styles.bg_color !== '#ffffff') {
    customStyle += `background-color: ${styles.bg_color}; `;
  }

  const imgRatioStyle = getBlockImageRatioStyle(styles);
  const btnStyle = getBlockBtnStyle(styles, node);
  const priceStyle = getBlockPriceStyle(styles, node);

  switch (block.block_type) {
    case 'hero':
      return `
        <div class="funnel-block funnel-hero-block" style="${customStyle}">
          ${formatBlockTitle(block.title || node.title, styles, 'h1', 'funnel-hero-title')}
          ${formatBlockText(content.description, styles, 'p', 'funnel-hero-desc')}
          ${content.image_url ? `
            <div class="funnel-hero-img-wrap" style="${styles.image_aspect_ratio && styles.image_aspect_ratio !== 'auto' ? `aspect-ratio: ${styles.image_aspect_ratio.replace(':', '/')}; height: auto; max-height: none;` : ''}">
              <img src="${content.image_url}" alt="${block.title || ''}" class="funnel-hero-img" style="${imgRatioStyle}" loading="lazy">
            </div>
          ` : ''}
          <div>
            <a href="#orderFormBlock" class="funnel-submit-btn d-inline-flex px-5 py-3 text-decoration-none mt-3" style="max-width:380px; margin: 0 auto; ${btnStyle}">
              <i class="bi bi-lightning-charge-fill"></i>
              <span>${content.cta_text || 'أطلب الآن واستفد من العرض'}</span>
            </a>
          </div>
        </div>
      `;

    case 'heading':
      return `
        <div class="funnel-block funnel-heading-block" style="${customStyle}">
          ${formatBlockTitle(block.title, styles, 'h2', 'funnel-heading-title')}
          ${formatBlockText(content.subtitle, styles, 'p', 'text-muted mt-2')}
        </div>
      `;

    case 'text':
      return `
        <div class="funnel-block" style="${customStyle}">
          ${formatBlockTitle(block.title, styles, 'h3', 'fw-bold mb-3')}
          ${formatBlockText(content.text, styles, 'div', 'lead')}
        </div>
      `;

    case 'image_text':
      const isReverse = Boolean(content.reverse);
      return `
        <div class="funnel-block" style="${customStyle}">
          <div class="funnel-split-row ${isReverse ? 'reverse' : ''}">
            <div class="funnel-split-img-col" style="${styles.image_aspect_ratio && styles.image_aspect_ratio !== 'auto' ? `aspect-ratio: ${styles.image_aspect_ratio.replace(':', '/')}; height: auto;` : ''}">
              <img src="${content.image_url || '/images/hero.jpg'}" alt="${block.title || ''}" class="funnel-split-img" style="${imgRatioStyle}" loading="lazy">
            </div>
            <div class="funnel-split-text-col">
              ${formatBlockTitle(block.title, styles, 'h3', 'fw-bold mb-3')}
              ${formatBlockText(content.text, styles, 'p', 'text-muted mb-4')}
              ${content.cta_text ? `
                <a href="#orderFormBlock" class="btn rounded-pill fw-bold px-4 py-2" style="${btnStyle}">
                  ${content.cta_text} ➔
                </a>
              ` : ''}
            </div>
          </div>
        </div>
      `;

    case 'carousel':
      const carouselImgs = Array.isArray(content.images) && content.images.length > 0 ? content.images : (content.image_url ? [content.image_url] : []);
      return `
        <div class="funnel-block" style="${customStyle}">
          ${formatBlockTitle(block.title, styles, 'h3', 'fw-bold text-center mb-3')}
          <div class="d-flex gap-3 overflow-x-auto pb-2" style="scrollbar-width: thin;">
            ${carouselImgs.map(imgSrc => `
              <div style="flex: 0 0 280px; ${styles.image_aspect_ratio && styles.image_aspect_ratio !== 'auto' ? `aspect-ratio: ${styles.image_aspect_ratio.replace(':', '/')};` : 'aspect-ratio: 1/1;'} overflow: hidden; border-radius: 14px;">
                <img src="${imgSrc}" style="${imgRatioStyle}" loading="lazy" class="shadow-sm">
              </div>
            `).join('')}
          </div>
        </div>
      `;

    case 'features':
      const items = Array.isArray(content.items) ? content.items : [];
      return `
        <div class="funnel-block" style="${customStyle}">
          ${formatBlockTitle(block.title, styles, 'h3', 'fw-bold text-center mb-4')}
          <div class="funnel-features-grid">
            ${items.map(it => `
              <div class="funnel-feature-item">
                <div class="funnel-feature-icon" style="${btnStyle}">
                  <i class="bi bi-check-lg"></i>
                </div>
                <div>
                  <h4 class="funnel-feature-title" style="${styles.title_color ? `color: ${styles.title_color} !important;` : ''}">${it.title}</h4>
                  <p class="funnel-feature-desc" style="${styles.text_color ? `color: ${styles.text_color} !important;` : ''}">${it.text}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

    case 'product_card':
      const prod = block.product_data;
      if (!prod) return '';

      const ratingVal = Number(prod.avg_rating) || 5.0;
      let starsHtml = '';
      for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(ratingVal)) {
          starsHtml += '<i class="bi bi-star-fill text-warning"></i>';
        } else if (i - ratingVal <= 0.5) {
          starsHtml += '<i class="bi bi-star-half text-warning"></i>';
        } else {
          starsHtml += '<i class="bi bi-star text-warning"></i>';
        }
      }

      let stockBadge = '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>متوفر في المخزون</span>';
      if (prod.stock === 0) {
        stockBadge = '<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>نفذت الكمية</span>';
      } else if (prod.stock < 10) {
        stockBadge = '<span class="badge bg-warning text-dark"><i class="bi bi-exclamation-triangle me-1"></i>كمية محدودة</span>';
      }

      return `
        <div class="funnel-block funnel-product-block" style="${customStyle}">
          <div class="funnel-product-card-wrap">
            <div class="funnel-product-img-box position-relative" style="${styles.image_aspect_ratio && styles.image_aspect_ratio !== 'auto' ? `aspect-ratio: ${styles.image_aspect_ratio.replace(':', '/')}; height: auto;` : ''}">
              <img src="${prod.image || '/images/hero.jpg'}" alt="${prod.name}" class="funnel-product-img" style="${imgRatioStyle}" loading="lazy">
              ${prod.is_free_delivery ? '<span class="badge bg-warning text-dark position-absolute top-0 end-0 m-2 shadow-sm"><i class="bi bi-truck me-1"></i>توصيل مجاني</span>' : ''}
            </div>

            <div class="funnel-product-details">
              <div class="d-flex align-items-center gap-2 mb-2 flex-wrap">
                ${stockBadge}
                ${prod.category_names ? `<span class="text-muted small">${prod.category_names}</span>` : ''}
              </div>

              ${formatBlockTitle(prod.name, styles, 'h3', 'funnel-product-name fw-bold mb-2')}

              <div class="d-flex align-items-center gap-1 mb-2">
                <div class="stars-box">${starsHtml}</div>
                <span class="text-warning fw-bold small ms-1">${ratingVal.toFixed(1)}</span>
                <span class="text-muted small">(${prod.review_count || 0} تقييم)</span>
              </div>

              ${prod.description ? `<p class="funnel-product-desc text-muted mb-3">${prod.description.slice(0, 140)}...</p>` : ''}

              <div class="d-flex align-items-center justify-content-between flex-wrap gap-3 mt-auto pt-2 border-top">
                <div class="funnel-product-price">
                  <span class="fs-3 fw-bold" style="${priceStyle}">${prod.price} دج</span>
                </div>
                <div class="d-flex gap-2 flex-wrap">
                  <a href="/products/${prod.id}" class="btn btn-outline-secondary rounded-pill px-3 py-2 btn-sm fw-bold">
                    <i class="bi bi-eye me-1"></i>تفاصيل المنتج
                  </a>
                  <a href="#orderFormBlock" class="btn rounded-pill px-4 py-2 fw-bold d-inline-flex align-items-center gap-1 shadow-sm" style="${btnStyle}">
                    <i class="bi bi-bag-check-fill"></i>
                    <span>أطلب هذا المنتج الآن</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

    case 'offers':
      return renderOffersBlock(block, offers, node);

    case 'order_form':
      return renderOrderFormBlock(block, offers, node);

    case 'faq':
      const faqList = Array.isArray(content.items) ? content.items : [];
      return `
        <div class="funnel-block" style="${customStyle}">
          ${formatBlockTitle(block.title, styles, 'h3', 'fw-bold text-center mb-4')}
          <div class="funnel-faq-list">
            ${faqList.map(item => `
              <div class="funnel-faq-item">
                <div class="funnel-faq-question" style="${styles.title_color ? `color: ${styles.title_color} !important;` : ''}">
                  <span>${item.question}</span>
                  <i class="bi bi-chevron-down"></i>
                </div>
                <div class="funnel-faq-answer" style="${styles.text_color ? `color: ${styles.text_color} !important;` : ''}">${item.answer}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

    default:
      return '';
  }
}

// --------------------------------------------------------------------------
// OFFERS BUNDLE BLOCK
// --------------------------------------------------------------------------
function renderOffersBlock(block, offers, node) {
  if (!offers || offers.length === 0) return '';
  const content = typeof block.content === 'object' && block.content !== null ? block.content : {};
  const styles = typeof block.styles === 'object' && block.styles !== null ? block.styles : {};

  let customStyle = '';
  if (styles.bg_color && styles.bg_color !== 'transparent' && styles.bg_color !== '#ffffff') {
    customStyle += `background-color: ${styles.bg_color}; `;
  }

  const priceStyle = getBlockPriceStyle(styles, node);
  const imgRatioStyle = getBlockImageRatioStyle(styles);

  return `
    <div class="funnel-block" id="funnelOffersBlock" style="${customStyle}">
      <div class="text-center mb-4">
        ${formatBlockTitle(block.title, styles, 'h2', 'fw-bold text-dark')}
        ${formatBlockText(content.subtitle, styles, 'p', 'text-muted')}
      </div>

      <div class="funnel-offers-grid">
        ${offers.map((offer, idx) => {
          const isSelected = selectedOffer && selectedOffer.id === offer.id;
          const isPopular = offer.is_popular;
          return `
            <div class="funnel-offer-card ${isSelected ? 'selected' : ''}" data-offer-id="${offer.id}">
              ${offer.badge ? `
                <div class="funnel-offer-badge ${isPopular ? 'popular' : ''}">
                  <i class="bi bi-fire me-1"></i> ${offer.badge}
                </div>
              ` : ''}

              ${offer.image_url ? `
                <div class="funnel-offer-img-box mb-2" style="${styles.image_aspect_ratio && styles.image_aspect_ratio !== 'auto' ? `aspect-ratio: ${styles.image_aspect_ratio.replace(':', '/')}; height: auto;` : ''}">
                  <img src="${offer.image_url}" alt="${offer.title}" class="funnel-offer-img" style="${imgRatioStyle}" loading="lazy">
                </div>
              ` : ''}

              <h3 class="funnel-offer-title">${offer.title}</h3>
              <div class="funnel-offer-qty">الكمية: ${offer.quantity} قطع</div>
              <div class="funnel-offer-price" style="${priceStyle}">${offer.price} دج</div>
              ${offer.original_price ? `<div class="funnel-offer-orig-price">${offer.original_price} دج</div>` : ''}

              <div class="funnel-offer-delivery-tag ${offer.free_delivery ? 'free' : 'standard'}">
                <i class="bi bi-truck"></i>
                <span>${offer.free_delivery ? 'توصيل مجاني لجميع الولايات' : 'توصيل عادي'}</span>
              </div>

              <div class="funnel-offer-radio-indicator"></div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// Attach Offer Selection Handlers
function attachOffersEvents() {
  const cards = document.querySelectorAll('.funnel-offer-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const offerId = parseInt(card.getAttribute('data-offer-id'), 10);
      if (!currentFunnelData?.offers) return;
      const found = currentFunnelData.offers.find(o => o.id === offerId);
      if (found) {
        selectedOffer = found;
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        updateOrderSummary();
      }
    });
  });
}

// --------------------------------------------------------------------------
// DIRECT ORDER FORM BLOCK
// --------------------------------------------------------------------------
function renderOrderFormBlock(block, offers, node) {
  const content = typeof block.content === 'object' && block.content !== null ? block.content : {};
  const styles = typeof block.styles === 'object' && block.styles !== null ? block.styles : {};

  let customStyle = '';
  if (styles.bg_color && styles.bg_color !== 'transparent' && styles.bg_color !== '#ffffff') {
    customStyle += `background-color: ${styles.bg_color}; `;
  }

  const btnStyle = getBlockBtnStyle(styles, node);
  const priceStyle = getBlockPriceStyle(styles, node);

  return `
    <div class="funnel-block funnel-order-box" id="orderFormBlock" style="${customStyle}">
      ${formatBlockTitle(block.title || 'أكمل معلوماتك لتأكيد الطلب', styles, 'h2', 'funnel-order-box-title')}
      ${formatBlockText(content.subtitle, styles, 'p', 'funnel-order-box-desc')}

      <!-- Selected Deal Bar -->
      <div class="funnel-selected-deal-bar" id="selectedDealSummaryBar">
        <div>
          <span class="text-muted small d-block">الباقة المحددة:</span>
          <strong class="text-success" id="selectedDealTitleText">${selectedOffer ? selectedOffer.title : 'باقة العرض'}</strong>
        </div>
        <div class="text-end">
          <span class="text-muted small d-block">السعر:</span>
          <strong class="fs-5" style="${priceStyle}" id="selectedDealPriceText">${selectedOffer ? selectedOffer.price : '--'} دج</strong>
        </div>
      </div>

      <form id="funnelCheckoutForm" novalidate>
        <div class="row g-3">
          <!-- Full Name -->
          <div class="col-12 col-md-6">
            <label for="funnelFullName" class="form-label fw-bold small">الاسم واللقب <span class="text-danger">*</span></label>
            <div class="input-group">
              <span class="input-group-text bg-light"><i class="bi bi-person"></i></span>
              <input type="text" class="form-control" id="funnelFullName" required placeholder="مثال: محمد بوعلام">
            </div>
          </div>

          <!-- Phone Number -->
          <div class="col-12 col-md-6">
            <label for="funnelPhone" class="form-label fw-bold small">رقم الهاتف <span class="text-danger">*</span></label>
            <div class="input-group">
              <span class="input-group-text bg-light"><i class="bi bi-telephone"></i></span>
              <input type="tel" class="form-control" id="funnelPhone" required placeholder="05 / 06 / 07 XX XX XX" dir="ltr">
            </div>
          </div>

          <!-- Wilaya Dropdown -->
          <div class="col-12">
            <label for="funnelWilaya" class="form-label fw-bold small">الولاية <span class="text-danger">*</span></label>
            <div class="input-group">
              <span class="input-group-text bg-light"><i class="bi bi-geo-alt"></i></span>
              <select class="form-select" id="funnelWilaya" required>
                <option value="">إختر الولاية...</option>
                ${ALGERIAN_WILAYAS.map(w => `
                  <option value="${w.en}">${w.code}- ${w.name} (${w.en})</option>
                `).join('')}
              </select>
            </div>
          </div>

          <!-- Delivery Type (Home or Desk) -->
          <div class="col-12">
            <label class="form-label fw-bold small mb-2">نوع التوصيل</label>
            <div class="d-flex gap-3">
              <div class="form-check p-3 border rounded-3 flex-fill bg-light">
                <input class="form-check-input" type="radio" name="funnelDeliveryType" id="deliveryHome" value="home" checked>
                <label class="form-check-label fw-bold d-flex justify-content-between" for="deliveryHome">
                  <span><i class="bi bi-house-door me-1 text-success"></i>توصيل للمنزل</span>
                  <span class="badge bg-white text-dark border" id="homePriceBadge">-- دج</span>
                </label>
              </div>
              <div class="form-check p-3 border rounded-3 flex-fill bg-light">
                <input class="form-check-input" type="radio" name="funnelDeliveryType" id="deliveryDesk" value="desk">
                <label class="form-check-label fw-bold d-flex justify-content-between" for="deliveryDesk">
                  <span><i class="bi bi-box-seam me-1 text-primary"></i>استلام من المكتب (Stopdesk)</span>
                  <span class="badge bg-white text-dark border" id="deskPriceBadge">-- دج</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Promo Code -->
          <div class="col-12">
            <label class="form-label fw-bold small">هل لديك كود خصم؟ (اختياري)</label>
            <div class="input-group">
              <input type="text" class="form-control" id="funnelPromoCode" placeholder="أدخل كود الخصم...">
              <button class="btn btn-outline-success fw-bold" type="button" id="applyPromoBtn">تطبيق</button>
            </div>
            <div id="promoFeedback" class="small mt-1" style="display:none;"></div>
          </div>
        </div>

        <!-- Total Breakdown Box -->
        <div class="card bg-light border-0 mt-4 p-3 rounded-3">
          <div class="d-flex justify-content-between mb-2">
            <span class="text-muted">سعر الباقة / المنتجات:</span>
            <span class="fw-bold" id="summarySubtotalText">0 دج</span>
          </div>
          <div class="d-flex justify-content-between mb-2">
            <span class="text-muted">تكلفة التوصيل:</span>
            <span class="fw-bold" id="summaryDeliveryText">-- دج</span>
          </div>
          <div class="d-flex justify-content-between mb-2 text-danger" id="summaryDiscountRow" style="display:none !important;">
            <span>خصم الكوبون:</span>
            <span class="fw-bold" id="summaryDiscountText">-0 دج</span>
          </div>
          <hr class="my-2">
          <div class="d-flex justify-content-between align-items-center">
            <span class="fw-bold fs-5 text-dark">المبلغ الإجمالي للدفع:</span>
            <span class="fw-bold fs-3 text-success" id="summaryTotalText">0 دج</span>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="mt-4">
          <button type="submit" class="funnel-submit-btn" id="funnelSubmitBtn">
            <i class="bi bi-check-circle-fill"></i>
            <span>تأكيد الطلب الآن</span>
          </button>
        </div>

        <!-- Trust Badges Under Button -->
        <div class="d-flex justify-content-around text-center text-muted small mt-3 pt-2 border-top">
          <div><i class="bi bi-shield-check text-success me-1"></i>دفع آمن عند الاستلام</div>
          <div><i class="bi bi-box-seam text-warning me-1"></i>فحص الطرد قبل الدفع</div>
          <div><i class="bi bi-headset text-primary me-1"></i>خدمة زبائن ومتابعة</div>
        </div>

        <div id="orderStatusMessage" class="mt-3"></div>
      </form>
    </div>
  `;
}

// Initialize form controls & calculations
function initLandingOrderForm() {
  const wilayaSelect = document.getElementById('funnelWilaya');
  const deliveryRadios = document.querySelectorAll('input[name="funnelDeliveryType"]');
  const promoBtn = document.getElementById('applyPromoBtn');
  const form = document.getElementById('funnelCheckoutForm');

  if (wilayaSelect) {
    wilayaSelect.addEventListener('change', () => {
      updateDeliveryBadges();
      updateOrderSummary();
    });
  }

  deliveryRadios.forEach(r => {
    r.addEventListener('change', () => {
      updateOrderSummary();
    });
  });

  if (promoBtn) {
    promoBtn.addEventListener('click', applyFunnelPromo);
  }

  if (form) {
    form.addEventListener('submit', submitFunnelOrder);
  }

  updateDeliveryBadges();
  updateOrderSummary();
}

// Update Badges on Home/Desk delivery buttons
function updateDeliveryBadges() {
  const wilayaSelect = document.getElementById('funnelWilaya');
  const homeBadge = document.getElementById('homePriceBadge');
  const deskBadge = document.getElementById('deskPriceBadge');

  if (!wilayaSelect || !homeBadge || !deskBadge) return;
  const val = wilayaSelect.value;
  const wilayaObj = ALGERIAN_WILAYAS.find(w => w.en === val);

  if (!wilayaObj) {
    homeBadge.textContent = '-- دج';
    deskBadge.textContent = '-- دج';
    return;
  }

  const isFree = selectedOffer?.free_delivery;
  if (isFree) {
    homeBadge.textContent = 'مجاني';
    deskBadge.textContent = 'مجاني';
  } else {
    homeBadge.textContent = `${wilayaObj.home} دج`;
    deskBadge.textContent = `${wilayaObj.desk} دج`;
  }
}

// Calculate and update order summary box
function updateOrderSummary() {
  const subtotalEl = document.getElementById('summarySubtotalText');
  const deliveryEl = document.getElementById('summaryDeliveryText');
  const totalEl = document.getElementById('summaryTotalText');
  const discountRow = document.getElementById('summaryDiscountRow');
  const discountEl = document.getElementById('summaryDiscountText');

  const dealBarTitle = document.getElementById('selectedDealTitleText');
  const dealBarPrice = document.getElementById('selectedDealPriceText');

  if (!subtotalEl || !deliveryEl || !totalEl) return;

  const basePrice = selectedOffer ? parseFloat(selectedOffer.price) : 0;
  if (dealBarTitle) dealBarTitle.textContent = selectedOffer ? selectedOffer.title : 'باقة العرض';
  if (dealBarPrice) dealBarPrice.textContent = `${basePrice} دج`;

  const wilayaSelect = document.getElementById('funnelWilaya');
  const selectedWilaya = wilayaSelect ? wilayaSelect.value : '';
  const wilayaObj = ALGERIAN_WILAYAS.find(w => w.en === selectedWilaya);

  const deliveryType = document.querySelector('input[name="funnelDeliveryType"]:checked')?.value || 'home';

  let deliveryCost = 0;
  if (wilayaObj) {
    deliveryCost = deliveryType === 'desk' ? wilayaObj.desk : wilayaObj.home;
    if (selectedOffer?.free_delivery || appliedPromo?.discount_type === 'free_delivery') {
      deliveryCost = 0;
    }
  }

  let discountAmount = 0;
  if (appliedPromo) {
    if (appliedPromo.discount_type === 'percentage') {
      discountAmount = Math.round((basePrice * appliedPromo.discount_value) / 100);
    } else if (appliedPromo.discount_type === 'fixed') {
      discountAmount = Math.min(basePrice, parseFloat(appliedPromo.discount_value));
    }
  }

  const finalTotal = Math.max(0, basePrice + (wilayaObj ? deliveryCost : 0) - discountAmount);

  subtotalEl.textContent = `${basePrice} دج`;
  if (!wilayaObj) {
    deliveryEl.textContent = 'يرجى اختيار الولاية';
  } else {
    deliveryEl.textContent = deliveryCost === 0 ? 'توصيل مجاني 🎉' : `${deliveryCost} دج`;
  }

  if (discountAmount > 0) {
    discountRow.style.setProperty('display', 'flex', 'important');
    discountEl.textContent = `-${discountAmount} دج`;
  } else {
    discountRow.style.setProperty('display', 'none', 'important');
  }

  totalEl.textContent = `${finalTotal} دج`;
}

// Validate Promo Code
async function applyFunnelPromo() {
  const input = document.getElementById('funnelPromoCode');
  const btn = document.getElementById('applyPromoBtn');
  const feedback = document.getElementById('promoFeedback');
  const code = (input?.value || '').trim();

  if (!code) {
    if (feedback) {
      feedback.style.display = 'block';
      feedback.className = 'small mt-1 text-danger';
      feedback.textContent = 'يرجى إدخال كود الخصم أولاً';
    }
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

  try {
    const basePrice = selectedOffer ? parseFloat(selectedOffer.price) : 0;
    const res = await fetch('/api/promo-codes/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        items: [{
          id: selectedOffer?.product_id || 1,
          name: selectedOffer?.title || 'باقة العرض',
          price: basePrice,
          quantity: selectedOffer?.quantity || 1
        }],
        cartTotal: basePrice,
        deliveryCost: 600
      })
    });

    const data = await res.json();
    if (!res.ok || !data.valid) {
      appliedPromo = null;
      feedback.style.display = 'block';
      feedback.className = 'small mt-1 text-danger';
      feedback.textContent = data.error || 'كود الخصم غير صالح أو منتهي الصلاحية';
    } else {
      appliedPromo = data;
      feedback.style.display = 'block';
      feedback.className = 'small mt-1 text-success fw-bold';
      feedback.textContent = `✓ ${data.message}`;
      input.disabled = true;
      btn.style.display = 'none';
      updateOrderSummary();
    }
  } catch (err) {
    console.error('Error applying promo:', err);
    feedback.style.display = 'block';
    feedback.className = 'small mt-1 text-danger';
    feedback.textContent = 'حدث خطأ في التحقق من كود الخصم';
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'تطبيق';
  }
}

// Submit Direct Order via /api/guest-orders
async function submitFunnelOrder(e) {
  e.preventDefault();

  const nameInput = document.getElementById('funnelFullName');
  const phoneInput = document.getElementById('funnelPhone');
  const wilayaSelect = document.getElementById('funnelWilaya');
  const statusMsg = document.getElementById('orderStatusMessage');
  const submitBtn = document.getElementById('funnelSubmitBtn');

  const fullName = (nameInput?.value || '').trim();
  const phone = (phoneInput?.value || '').trim();
  const wilaya = wilayaSelect?.value || '';

  if (!fullName || !phone || !wilaya) {
    statusMsg.innerHTML = `
      <div class="alert alert-danger d-flex align-items-center">
        <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
        <span>يرجى ملء جميع الحقول الإلزامية (الاسم، الهاتف، الولاية).</span>
      </div>
    `;
    return;
  }

  // Rate Limiting check
  const lastSubmitTime = localStorage.getItem('last_checkout_submit');
  const now = Date.now();
  if (lastSubmitTime && (now - parseInt(lastSubmitTime, 10)) < 15000) {
    statusMsg.innerHTML = `
      <div class="alert alert-warning">
        الرجاء الانتظار قليلاً قبل إرسال طلب آخر.
      </div>
    `;
    return;
  }

  const wilayaObj = ALGERIAN_WILAYAS.find(w => w.en === wilaya);
  const deliveryType = document.querySelector('input[name="funnelDeliveryType"]:checked')?.value || 'home';
  let deliveryCost = deliveryType === 'desk' ? wilayaObj.desk : wilayaObj.home;
  if (selectedOffer?.free_delivery || appliedPromo?.discount_type === 'free_delivery') {
    deliveryCost = 0;
  }

  const basePrice = selectedOffer ? parseFloat(selectedOffer.price) : 0;
  let discountAmount = 0;
  if (appliedPromo) {
    if (appliedPromo.discount_type === 'percentage') {
      discountAmount = Math.round((basePrice * appliedPromo.discount_value) / 100);
    } else if (appliedPromo.discount_type === 'fixed') {
      discountAmount = Math.min(basePrice, parseFloat(appliedPromo.discount_value));
    }
  }

  const finalTotal = Math.max(0, basePrice + deliveryCost - discountAmount);

  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || fullName;
  const lastName = nameParts.slice(1).join(' ') || '.';

  const payload = {
    firstName: firstName,
    lastName: lastName,
    customerName: fullName,
    shippingName: phone,
    customerPhone: phone,
    phone: phone,
    deliveryType: deliveryType,
    city: wilaya,
    commune: null,
    shippingAddress: wilaya,
    address: null, // Only selecting of willaya as requested
    items: [
      {
        id: selectedOffer?.product_id || null,
        name: selectedOffer ? `${selectedOffer.title} (${currentFunnelData?.node?.title || 'صفحة الهبوط'})` : 'طلب مباشر',
        price: basePrice,
        quantity: selectedOffer?.quantity || 1
      }
    ],
    cartTotal: basePrice,
    deliveryCost: deliveryCost,
    deliveryFee: deliveryCost,
    deliveryCompanyId: 1,
    deliveryCompanyName: 'Yalidine Express',
    finalTotal: finalTotal,
    promoCode: appliedPromo ? appliedPromo.code : null
  };

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> جاري إرسال الطلب...';
  statusMsg.innerHTML = '';

  try {
    const response = await fetch('/api/guest-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'حدث خطأ أثناء معالجة الطلب');
    }

    localStorage.setItem('last_checkout_submit', now.toString());

    statusMsg.innerHTML = `
      <div class="alert alert-success p-4 rounded-4 shadow-sm text-center">
        <i class="bi bi-check-circle-fill text-success display-4 d-block mb-3"></i>
        <h3 class="fw-bold text-dark">تهانينا! تم استلام طلبك بنجاح 🎉</h3>
        <p class="text-muted mb-2">رقم الطلب الخاص بك: <strong class="text-success fs-5">#${result.orderId || ''}</strong></p>
        <p class="mb-0 text-dark">سيتصل بك فريق خدمة العملاء خلال ساعات قليلة لتأكيد العنوان وشحن الطرد فوراً.</p>
      </div>
    `;

    document.getElementById('funnelCheckoutForm').reset();
    submitBtn.style.display = 'none';

  } catch (err) {
    console.error('Order submission error:', err);
    statusMsg.innerHTML = `
      <div class="alert alert-danger d-flex align-items-center">
        <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
        <span>${err.message || 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.'}</span>
      </div>
    `;
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> إعادة المحاولة';
  }
}

// FAQ Accordion Handlers
function initFaqEvents() {
  document.querySelectorAll('.funnel-faq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.parentElement;
      item.classList.toggle('open');
    });
  });
}
