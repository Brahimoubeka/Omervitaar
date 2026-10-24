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
let selectedCustomOptions = {}; // Keyed by offerId: Array of chosen option objects

// Delivery Companies & Dynamic Rates state
let availableDeliveryCompanies = [];
let selectedDeliveryCompanyId = 1;
let selectedDeliveryCompanyName = 'Yalidine Express';
let activeDeliveryRates = {}; // wilayaCode/name -> { home, desk }

// Universal International WhatsApp Number Formatter
function formatWhatsAppTargetNumber(rawStr) {
  if (!rawStr) return '213770000000';
  let s = String(rawStr).trim();
  if (s.startsWith('http://') || s.startsWith('https://')) {
    const digits = s.replace(/\D/g, '');
    return digits || '213770000000';
  }
  let digits = s.replace(/\D/g, '');
  if (!digits) return '213770000000';
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  // Algerian mobile local format: 05, 06, 07 (10 digits)
  if (digits.startsWith('0') && digits.length === 10) {
    return '213' + digits.slice(1);
  }
  // If already international (e.g. 90..., 213..., 33..., 966...), preserve as-is
  return digits;
}

// HTML Escaping Helper
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Helper: Extract YouTube Embed URL from any valid format
function getYouTubeEmbedUrl(url, autoplay = false, loop = false, controls = true) {
  if (!url) return '';
  let videoId = '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    videoId = match[2];
  } else {
    const trimmed = url.trim();
    if (trimmed.length === 11 && !trimmed.includes('/')) {
      videoId = trimmed;
    } else {
      return url;
    }
  }

  const params = new URLSearchParams();
  params.set('rel', '0');
  params.set('modestbranding', '1');
  if (autoplay) {
    params.set('autoplay', '1');
    params.set('mute', '1');
  }
  if (loop) {
    params.set('loop', '1');
    params.set('playlist', videoId);
  }
  if (!controls) {
    params.set('controls', '0');
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

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
  initStickyScrollToTop();
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
  initOffersVisibilityHint();
  initOrderFormScrollObserver();
  initStickyScrollToTop();
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

    case 'video':
      const isLocal = content.video_source === 'local';
      const ratio = (content.aspect_ratio || '16:9').replace(':', '/');
      const maxWidth = content.max_width || '760px';
      const autoplay = Boolean(content.autoplay);
      const loop = Boolean(content.loop);
      const controls = content.controls !== false;

      let playerHtml = '';
      if (isLocal) {
        playerHtml = `
          <video src="${content.local_url || ''}" class="funnel-video-player" playsinline ${controls ? 'controls' : ''} ${autoplay ? 'autoplay muted' : ''} ${loop ? 'loop' : ''} style="width: 100%; height: 100%; object-fit: cover; border-radius: 16px;"></video>
        `;
      } else {
        const embedUrl = getYouTubeEmbedUrl(content.youtube_url || '', autoplay, loop, controls);
        playerHtml = `
          <iframe src="${embedUrl}" class="funnel-video-iframe" title="${block.title || 'فيديو صفحة الهبوط'}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="width: 100%; height: 100%; border: 0; border-radius: 16px;"></iframe>
        `;
      }

      return `
        <div class="funnel-block funnel-video-block" style="${customStyle}">
          ${block.title ? formatBlockTitle(block.title, styles, 'h3', 'fw-bold text-center mb-3') : ''}
          <div class="funnel-video-container" style="max-width: ${maxWidth}; margin: 0 auto;">
            <div class="funnel-video-wrapper shadow-lg position-relative overflow-hidden" style="aspect-ratio: ${ratio}; border-radius: 16px; background-color: #000;">
              ${playerHtml}
            </div>
            ${content.caption ? `<div class="funnel-video-caption text-center text-muted small mt-2">${content.caption}</div>` : ''}
          </div>
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
// --------------------------------------------------------------------------
// OFFERS BUNDLE BLOCK WITH MULTI-IMAGE, RICH FEATURES & SELECTABLE OPTIONS
// --------------------------------------------------------------------------

function switchOfferActiveImage(offerId, newSrc, thumbEl) {
  const mainImg = document.getElementById(`offer-active-img-${offerId}`);
  if (mainImg) {
    mainImg.src = newSrc;
  }
  if (thumbEl && thumbEl.parentElement) {
    thumbEl.parentElement.querySelectorAll('.funnel-offer-thumb').forEach(t => t.classList.remove('active'));
    thumbEl.classList.add('active');
  }
}

function getOfferSelectedOptions(offer) {
  if (!offer || !offer.settings?.has_custom_options || !Array.isArray(offer.settings.options)) {
    return [];
  }
  if (!selectedCustomOptions[offer.id]) {
    const isSingle = offer.settings.options_mode === 'single';
    if (isSingle) {
      const def = offer.settings.options.find(o => o.default_selected);
      selectedCustomOptions[offer.id] = def ? [def] : [];
    } else {
      selectedCustomOptions[offer.id] = offer.settings.options.filter(o => o.default_selected);
    }
  }
  return selectedCustomOptions[offer.id];
}

function isOptionSelected(offerId, opt) {
  const offer = currentFunnelData?.offers?.find(o => o.id === offerId);
  const selected = getOfferSelectedOptions(offer);
  return selected.some(o => o.id === opt.id);
}

// Droplist handler for single option selection
function onOfferOptionDropdownChanged(offerId, selectedOptId, isSingle) {
  const offer = currentFunnelData?.offers?.find(o => o.id === offerId);
  if (!offer || !offer.settings?.options) return;

  const allOpts = offer.settings.options;
  if (!selectedOptId) {
    selectedCustomOptions[offerId] = [];
  } else {
    const targetOpt = allOpts.find(o => String(o.id) === String(selectedOptId));
    selectedCustomOptions[offerId] = targetOpt ? [targetOpt] : [];
  }

  // Update offer price on card
  const priceEl = document.getElementById(`offer-price-display-${offerId}`);
  if (priceEl) {
    priceEl.textContent = `${getComputedOfferPrice(offer)} دج`;
  }

  // Update order summary if this offer is active
  if (selectedOffer && selectedOffer.id === offerId) {
    updateOrderSummary();
  }
}

// Droplist handler for adding an option in multi-select mode
function onOfferOptionAddFromDropdown(offerId, selectEl) {
  const optId = selectEl.value;
  if (!optId) return;
  const offer = currentFunnelData?.offers?.find(o => o.id === offerId);
  if (!offer || !offer.settings?.options) return;

  const targetOpt = offer.settings.options.find(o => String(o.id) === String(optId));
  if (!targetOpt) return;

  let currentList = getOfferSelectedOptions(offer);
  if (!currentList.some(o => String(o.id) === String(optId))) {
    currentList.push(targetOpt);
    selectedCustomOptions[offerId] = currentList;
  }
  selectEl.value = ''; // Reset dropdown selection

  renderOfferSelectedPills(offerId);

  const priceEl = document.getElementById(`offer-price-display-${offerId}`);
  if (priceEl) {
    priceEl.textContent = `${getComputedOfferPrice(offer)} دج`;
  }

  if (selectedOffer && selectedOffer.id === offerId) {
    updateOrderSummary();
  }
}

// Remove option pill in multi-select mode
function removeOfferOption(offerId, optId) {
  const offer = currentFunnelData?.offers?.find(o => o.id === offerId);
  if (!offer) return;

  let currentList = getOfferSelectedOptions(offer);
  selectedCustomOptions[offerId] = currentList.filter(o => String(o.id) !== String(optId));

  renderOfferSelectedPills(offerId);

  const priceEl = document.getElementById(`offer-price-display-${offerId}`);
  if (priceEl) {
    priceEl.textContent = `${getComputedOfferPrice(offer)} دج`;
  }

  if (selectedOffer && selectedOffer.id === offerId) {
    updateOrderSummary();
  }
}

function renderOfferSelectedPills(offerId) {
  const container = document.getElementById(`offer-selected-pills-${offerId}`);
  if (!container) return;
  const offer = currentFunnelData?.offers?.find(o => o.id === offerId);
  const selected = getOfferSelectedOptions(offer);

  if (selected.length === 0) {
    container.innerHTML = '<span class="text-muted small">لم يتم اختيار أي خيار إضافي بعد</span>';
    return;
  }

  container.innerHTML = selected.map(opt => `
    <span class="funnel-offer-pill">
      <span>${escapeHtml(opt.name)} (+${opt.price} دج)</span>
      <i class="bi bi-x-circle-fill funnel-offer-pill-remove" onclick="event.stopPropagation(); removeOfferOption(${offerId}, '${opt.id}')" title="إزالة"></i>
    </span>
  `).join('');
}

function getComputedOfferPrice(offer) {
  if (!offer) return 0;
  const base = parseFloat(offer.price) || 0;
  const selectedOpts = getOfferSelectedOptions(offer);
  const addOnsTotal = selectedOpts.reduce((sum, opt) => sum + (parseFloat(opt.price) || 0), 0);
  return base + addOnsTotal;
}

// Smooth slow scroll to order form and highlight the first input field
function smoothScrollToOrderForm() {
  const target = document.getElementById('orderFormBlock') || document.getElementById('funnelCheckoutForm');
  if (!target) return;

  const targetY = target.getBoundingClientRect().top + window.pageYOffset - 85;
  const startY = window.pageYOffset;
  const distance = targetY - startY;
  const duration = 1200; // Very slow and gentle scroll (1.2 seconds)
  let startTime = null;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function step(currentTime) {
    if (!startTime) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);
    const ease = easeInOutCubic(progress);

    window.scrollTo(0, startY + (distance * ease));

    if (timeElapsed < duration) {
      window.requestAnimationFrame(step);
    } else {
      highlightFirstOrderField();
    }
  }

  window.requestAnimationFrame(step);
}

function highlightFirstOrderField() {
  const firstInput = document.getElementById('funnelFullName');
  if (!firstInput) return;

  firstInput.focus();
  firstInput.classList.add('funnel-input-highlight');
  setTimeout(() => {
    firstInput.classList.remove('funnel-input-highlight');
  }, 3600);
}

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
          const settings = typeof offer.settings === 'object' && offer.settings !== null ? offer.settings : {};

          // Image Gallery Handling
          const offerImages = Array.isArray(offer.images) && offer.images.length > 0
            ? offer.images
            : (offer.image_url ? [offer.image_url] : []);
          const primaryImg = offerImages[0] || offer.image_url;

          // Custom Typography & Colors
          let titleStyle = '';
          if (settings.title_color) titleStyle += `color: ${settings.title_color} !important; `;
          if (settings.title_size) titleStyle += `font-size: ${settings.title_size} !important; `;

          let offerPriceStyle = priceStyle;
          if (settings.price_color) offerPriceStyle += `color: ${settings.price_color} !important; `;
          if (settings.price_size) offerPriceStyle += `font-size: ${settings.price_size} !important; `;

          const computedPrice = getComputedOfferPrice(offer);
          const chosenOpts = getOfferSelectedOptions(offer);

          return `
            <div class="funnel-offer-card ${isSelected ? 'selected' : ''}" data-offer-id="${offer.id}">
              ${offer.badge ? `
                <div class="funnel-offer-badge ${isPopular ? 'popular' : ''}">
                  <i class="bi bi-fire me-1"></i> ${escapeHtml(offer.badge)}
                </div>
              ` : ''}

              ${primaryImg ? `
                <div class="funnel-offer-img-box mb-2" style="${styles.image_aspect_ratio && styles.image_aspect_ratio !== 'auto' ? `aspect-ratio: ${styles.image_aspect_ratio.replace(':', '/')}; height: auto;` : ''}">
                  <img src="${primaryImg}" id="offer-active-img-${offer.id}" alt="${escapeHtml(offer.title)}" class="funnel-offer-img" style="${imgRatioStyle}" loading="lazy">
                </div>
                ${offerImages.length > 1 ? `
                  <div class="funnel-offer-thumbs-strip d-flex gap-1 justify-content-center overflow-x-auto pb-1 mb-2" onclick="event.stopPropagation()">
                    ${offerImages.map((u, imgI) => `
                      <img src="${u}" class="funnel-offer-thumb ${imgI === 0 ? 'active' : ''}" onclick="switchOfferActiveImage(${offer.id}, '${u}', this)" alt="صورة ${imgI + 1}">
                    `).join('')}
                  </div>
                ` : ''}
              ` : ''}

              <h3 class="funnel-offer-title" style="${titleStyle}">${escapeHtml(offer.title)}</h3>
              <div class="funnel-offer-qty">الكمية: ${offer.quantity} قطع</div>
              <div class="funnel-offer-price" id="offer-price-display-${offer.id}" style="${offerPriceStyle}">${computedPrice} دج</div>
              ${offer.original_price ? `<div class="funnel-offer-orig-price">${offer.original_price} دج</div>` : ''}

              <!-- Description Paragraph -->
              ${settings.description ? `
                <p class="funnel-offer-desc text-muted mt-2 mb-2">${escapeHtml(settings.description)}</p>
              ` : ''}

              <!-- Features List with Custom Icons -->
              ${Array.isArray(settings.features) && settings.features.length > 0 ? `
                <ul class="funnel-offer-features-list p-0 my-2 list-unstyled">
                  ${settings.features.map(f => `
                    <li class="d-flex align-items-center mb-1 text-end" style="color: ${f.text_color || '#333333'}; font-size: ${f.text_size || '0.9rem'};">
                      <i class="bi ${f.icon || 'bi-check2-circle'} ms-2" style="color: ${f.icon_color || '#5a6344'}; font-size: ${f.icon_size || '1.1rem'}; flex-shrink: 0;"></i>
                      <span>${escapeHtml(f.text)}</span>
                    </li>
                  `).join('')}
                </ul>
              ` : ''}

              <!-- Delivery Tag -->
              <div class="funnel-offer-delivery-tag ${offer.free_delivery ? 'free' : 'standard'} my-2">
                <i class="bi bi-truck ms-1"></i>
                <span>${offer.free_delivery ? 'توصيل مجاني لجميع الولايات' : 'توصيل عادي'}</span>
              </div>

              <!-- Customizable / Selectable Options Section with Droplist -->
              ${settings.has_custom_options ? `
                <div class="funnel-offer-options-wrap border-top pt-2 mt-2 w-100 text-end" onclick="event.stopPropagation()">
                  ${settings.fixed_option ? `
                    <div class="funnel-offer-fixed-item-box p-2 bg-success-subtle rounded-3 text-success-emphasis border border-success-subtle small fw-bold mb-2">
                      <i class="bi bi-pin-angle-fill ms-1 text-success"></i>
                      <span><strong>يشمل أساسياً:</strong> ${escapeHtml(settings.fixed_option)}</span>
                    </div>
                  ` : ''}

                  ${Array.isArray(settings.options) && settings.options.length > 0 ? `
                    <div class="small fw-bold text-secondary mb-1">
                      <i class="bi bi-list-check ms-1"></i>حدد الخيارات الإضافية من القائمة:
                    </div>
                    
                    ${settings.options_mode === 'single' ? `
                      <!-- Single Selection Droplist -->
                      <select class="form-select form-select-sm funnel-offer-select-dropdown" onchange="onOfferOptionDropdownChanged(${offer.id}, this.value, true)" dir="rtl">
                        <option value="">-- اختر خياراً إضافياً (اختياري) --</option>
                        ${settings.options.map(opt => {
                          const isChecked = isOptionSelected(offer.id, opt);
                          return `<option value="${opt.id}" ${isChecked ? 'selected' : ''}>${escapeHtml(opt.name)} (+${opt.price} دج)</option>`;
                        }).join('')}
                      </select>
                    ` : `
                      <!-- Multi-Selection Droplist with interactive Selected Badges -->
                      <select class="form-select form-select-sm funnel-offer-select-dropdown" onchange="onOfferOptionAddFromDropdown(${offer.id}, this)" dir="rtl">
                        <option value="">+ انقر لاختيار وإضافة خيار من القائمة...</option>
                        ${settings.options.map(opt => `
                          <option value="${opt.id}">${escapeHtml(opt.name)} (+${opt.price} دج)</option>
                        `).join('')}
                      </select>
                      <div class="d-flex flex-wrap gap-1 mt-2" id="offer-selected-pills-${offer.id}">
                        ${chosenOpts.length === 0 ? '<span class="text-muted small">لم يتم اختيار أي خيار إضافي بعد</span>' : chosenOpts.map(opt => `
                          <span class="funnel-offer-pill">
                            <span>${escapeHtml(opt.name)} (+${opt.price} دج)</span>
                            <i class="bi bi-x-circle-fill funnel-offer-pill-remove" onclick="event.stopPropagation(); removeOfferOption(${offer.id}, '${opt.id}')" title="إزالة"></i>
                          </span>
                        `).join('')}
                      </div>
                    `}
                  ` : ''}
                </div>
              ` : ''}

              <div class="funnel-offer-radio-indicator mt-2"></div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// Smoothly scroll down to order form and immediately hide the prompt bar
function smoothScrollToOrderForm() {
  const bar = document.getElementById('funnelOrderPromptBar');
  if (bar) bar.classList.remove('show');

  const orderForm = document.getElementById('orderFormBlock') || document.getElementById('funnelCheckoutForm');
  if (orderForm) {
    orderForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      const firstInput = document.getElementById('funnelFullName') || orderForm.querySelector('input');
      if (firstInput) {
        firstInput.focus({ preventScroll: true });
        firstInput.classList.add('funnel-highlight-input');
        setTimeout(() => firstInput.classList.remove('funnel-highlight-input'), 2200);
      }
    }, 600);
  }
}
window.smoothScrollToOrderForm = smoothScrollToOrderForm;

// Hide the arrow prompt bar when reaching the order form
function initOrderFormScrollObserver() {
  const orderForm = document.getElementById('orderFormBlock');
  if (!orderForm) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const bar = document.getElementById('funnelOrderPromptBar');
          if (bar) bar.classList.remove('show');
        }
      });
    }, { threshold: 0.1 });
    observer.observe(orderForm);
  }

  // Also check during scroll to guarantee prompt hides as soon as order form comes into view
  window.addEventListener('scroll', () => {
    const formEl = document.getElementById('orderFormBlock');
    const bar = document.getElementById('funnelOrderPromptBar');
    if (formEl && bar && bar.classList.contains('show')) {
      const rect = formEl.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.82 && rect.bottom >= 0) {
        bar.classList.remove('show');
      }
    }
  }, { passive: true });
}

// Show attractive transparent hint message for 5 seconds when reaching the offers cards
let offersHintShown = false;
let offersHintTimer = null;

function initOffersVisibilityHint() {
  const offersBlock = document.getElementById('funnelOffersBlock');
  if (!offersBlock || offersHintShown) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !offersHintShown) {
          offersHintShown = true;
          showOffersHintToast();
          observer.disconnect();
        }
      });
    }, { threshold: 0.15 });
    observer.observe(offersBlock);
  } else {
    // Fallback if IntersectionObserver is unsupported
    const onScrollCheck = () => {
      if (offersHintShown) return;
      const rect = offersBlock.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.75 && rect.bottom >= 0) {
        offersHintShown = true;
        showOffersHintToast();
        window.removeEventListener('scroll', onScrollCheck);
      }
    };
    window.addEventListener('scroll', onScrollCheck, { passive: true });
  }
}

function showOffersHintToast() {
  let toast = document.getElementById('funnelOffersHintToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'funnelOffersHintToast';
    toast.className = 'funnel-offers-hint-toast';
    toast.setAttribute('dir', 'rtl');
    toast.innerHTML = `
      <i class="bi bi-hand-index-thumb-fill text-warning fs-5"></i>
      <span>اضغط لاختيار هذا العرض ✨</span>
    `;
    document.body.appendChild(toast);
  }

  requestAnimationFrame(() => {
    toast.classList.remove('fade-out');
    toast.classList.add('show');
  });

  if (offersHintTimer) clearTimeout(offersHintTimer);
  offersHintTimer = setTimeout(() => {
    if (toast) {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
      }, 550);
    }
  }, 5000);
}

// Sticky "Back to Top" Button
function initStickyScrollToTop() {
  let btn = document.getElementById('funnelScrollToTopBtn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'funnelScrollToTopBtn';
    btn.type = 'button';
    btn.className = 'funnel-back-to-top-btn';
    btn.setAttribute('aria-label', 'الرجوع لأعلى الصفحة');
    btn.setAttribute('title', 'الرجوع للأعلى');
    btn.innerHTML = `<i class="bi bi-chevron-up"></i>`;
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.body.appendChild(btn);
  }

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });
}

// Show animated floating prompt with bouncing arrow guiding user to order form
function showOfferSelectedPrompt(offer) {
  // If the initial offers hint toast is still visible, fade it out immediately
  const hintToast = document.getElementById('funnelOffersHintToast');
  if (hintToast) {
    hintToast.classList.add('fade-out');
    setTimeout(() => {
      if (hintToast && hintToast.parentNode) hintToast.parentNode.removeChild(hintToast);
    }, 400);
  }

  // Do not show the prompt bar if user is already at the order form
  const orderForm = document.getElementById('orderFormBlock');
  if (orderForm) {
    const rect = orderForm.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.82 && rect.bottom >= 0) {
      return;
    }
  }

  let bar = document.getElementById('funnelOrderPromptBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'funnelOrderPromptBar';
    bar.className = 'funnel-order-prompt-bar';
    bar.addEventListener('click', (e) => {
      smoothScrollToOrderForm();
    });
    document.body.appendChild(bar);
  }

  const offerTitle = offer ? escapeHtml(offer.title) : 'العرض المختار';
  const price = offer ? getComputedOfferPrice(offer) : '';

  bar.innerHTML = `
    <div class="d-flex align-items-center justify-content-between gap-3 w-100">
      <div class="d-flex align-items-center gap-2">
        <span class="funnel-prompt-arrow-bounce">
          <i class="bi bi-arrow-down-circle-fill text-warning fs-3"></i>
        </span>
        <div>
          <div class="fw-bold text-white small">تم اختيار: <span class="text-warning">${offerTitle}</span> ${price ? `(${price} دج)` : ''}</div>
          <div class="text-white-50 extra-small" style="font-size: 0.78rem;">املأ النموذج بالأسفل لإتمام طلبك 👇</div>
        </div>
      </div>
      <button type="button" class="btn btn-warning btn-sm rounded-pill px-3 fw-bold shadow-sm d-inline-flex align-items-center gap-1" onclick="smoothScrollToOrderForm()">
        <span>إلى النموذج</span>
        <i class="bi bi-chevron-down"></i>
      </button>
    </div>
  `;

  bar.classList.add('show');
}

// Attach Offer Selection Handlers (pops up guide prompt without jarring auto-scroll)
function attachOffersEvents() {
  const cards = document.querySelectorAll('.funnel-offer-card');
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      // Do not trigger card selection if clicking within options droplist or thumbnail strip
      if (e.target.closest('.funnel-offer-options-wrap') || e.target.closest('.funnel-offer-thumbs-strip')) {
        return;
      }
      const offerId = parseInt(card.getAttribute('data-offer-id'), 10);
      if (!currentFunnelData?.offers) return;
      const found = currentFunnelData.offers.find(o => o.id === offerId);
      if (found) {
        selectedOffer = found;
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        // Sync with order form offer switcher
        const offerSelect = document.getElementById('orderFormOfferSelect');
        if (offerSelect) offerSelect.value = String(found.id);
        const dealBadge = document.getElementById('selectedDealBadge');
        if (dealBadge) dealBadge.textContent = found.title;
        const basePriceDisplay = document.getElementById('selectedDealBasePriceDisplay');
        if (basePriceDisplay) basePriceDisplay.textContent = `${found.price} دج`;

        updateDeliveryBadges();
        updateOrderSummary();

        // Show floating guide prompt with bouncing arrow
        showOfferSelectedPrompt(found);
      }
    });
  });
}

// Switch offer directly from inside the order form
function onOrderFormOfferChanged(newOfferId) {
  const offerId = parseInt(newOfferId, 10);
  const found = currentFunnelData?.offers?.find(o => o.id === offerId);
  if (!found) return;

  selectedOffer = found;

  // Sync offer cards above
  const cards = document.querySelectorAll('.funnel-offer-card');
  cards.forEach(card => {
    if (parseInt(card.getAttribute('data-offer-id'), 10) === offerId) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  const dealBadge = document.getElementById('selectedDealBadge');
  if (dealBadge) dealBadge.textContent = found.title;

  const basePriceDisplay = document.getElementById('selectedDealBasePriceDisplay');
  if (basePriceDisplay) basePriceDisplay.textContent = `${found.price} دج`;

  updateDeliveryBadges();
  updateOrderSummary();
}

// Load available delivery companies and dynamic rates for funnel
async function initFunnelDeliveryCompanies() {
  const compSelect = document.getElementById('funnelDeliveryCompany');
  try {
    const res = await fetch('/api/delivery-companies');
    if (res.ok) {
      const companies = await res.json();
      if (Array.isArray(companies) && companies.length > 0) {
        availableDeliveryCompanies = companies;
        if (compSelect) {
          compSelect.innerHTML = '';
          companies.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name + (c.is_default ? ' (الافتراضية)' : '');
            if (c.is_default) opt.selected = true;
            compSelect.appendChild(opt);
          });

          const defaultComp = companies.find(c => c.is_default) || companies[0];
          selectedDeliveryCompanyId = defaultComp ? defaultComp.id : companies[0].id;
          selectedDeliveryCompanyName = defaultComp ? defaultComp.name : companies[0].name;
          compSelect.value = selectedDeliveryCompanyId;
        }
      }
    }
  } catch (err) {
    console.warn('Could not load delivery companies for funnel:', err);
  }

  await fetchFunnelRatesForCompany(selectedDeliveryCompanyId);
}

async function fetchFunnelRatesForCompany(companyId) {
  try {
    const url = companyId ? `/api/delivery-costs?company_id=${companyId}` : '/api/delivery-costs';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.ratesMap && Object.keys(data.ratesMap).length > 0) {
        activeDeliveryRates = data.ratesMap;
      }
    }
  } catch (err) {
    console.warn('Could not fetch rates for company:', err);
  }

  updateDeliveryBadges();
  updateOrderSummary();
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

  return `
    <div class="funnel-block funnel-order-box" id="orderFormBlock" style="${customStyle}">
      ${formatBlockTitle(block.title || 'أكمل معلوماتك لتأكيد الطلب', styles, 'h2', 'funnel-order-box-title')}
      ${formatBlockText(content.subtitle, styles, 'p', 'funnel-order-box-desc')}

      <!-- Selected Deal Bar with Direct Offer Selector -->
      <div class="funnel-selected-deal-bar p-3 mb-3 rounded-3 bg-light border border-success-subtle shadow-sm" id="selectedDealSummaryBar">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
          <label for="orderFormOfferSelect" class="form-label mb-0 fw-bold text-success small d-flex align-items-center gap-1">
            <i class="bi bi-tag-fill"></i>
            <span>الباقة / العرض المختار:</span>
          </label>
          <span class="badge bg-success-subtle text-success border border-success-subtle small fw-bold" id="selectedDealBadge">
            ${selectedOffer ? escapeHtml(selectedOffer.title) : 'باقة العرض'}
          </span>
        </div>
        ${Array.isArray(offers) && offers.length > 1 ? `
          <select class="form-select form-select-sm funnel-order-form-offer-select mb-2" id="orderFormOfferSelect" dir="rtl" onchange="onOrderFormOfferChanged(this.value)">
            ${offers.map(o => `
              <option value="${o.id}" ${selectedOffer && selectedOffer.id === o.id ? 'selected' : ''}>
                ${escapeHtml(o.title)} (${o.price} دج) ${o.badge ? ' - ' + escapeHtml(o.badge) : ''}
              </option>
            `).join('')}
          </select>
        ` : `
          <div class="fw-bold text-dark fs-5 mb-1" id="selectedDealTitleText">${selectedOffer ? escapeHtml(selectedOffer.title) : 'باقة العرض'}</div>
        `}
        <div class="d-flex justify-content-between align-items-center pt-2 border-top border-light-subtle small">
          <span class="text-muted">سعر الباقة الأساسية:</span>
          <strong class="text-success fs-6" id="selectedDealBasePriceDisplay">${selectedOffer ? selectedOffer.price : '--'} دج</strong>
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
          <div class="col-12 col-md-6">
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

          <!-- Delivery Company Dropdown -->
          <div class="col-12 col-md-6" id="funnelDeliveryCompanyCol">
            <label for="funnelDeliveryCompany" class="form-label fw-bold small">شركة التوصيل <span class="text-danger">*</span></label>
            <div class="input-group">
              <span class="input-group-text bg-light"><i class="bi bi-truck"></i></span>
              <select class="form-select" id="funnelDeliveryCompany" required>
                <option value="">جاري تحميل شركات التوصيل...</option>
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

        <!-- Detailed Total Breakdown Box -->
        <div class="card bg-light border-0 mt-4 p-3 rounded-3">
          <!-- 1. Offer Base Price -->
          <div class="d-flex justify-content-between mb-2">
            <span class="text-muted">سعر الباقة الأساسية:</span>
            <span class="fw-bold" id="summaryOfferBaseText">0 دج</span>
          </div>

          <!-- 2. Add-ons Total -->
          <div class="d-flex justify-content-between mb-2" id="summaryAddonsRow" style="display:none !important;">
            <span class="text-muted">مجموع الخيارات الإضافية:</span>
            <span class="fw-bold text-success" id="summaryAddonsText">+0 دج</span>
          </div>

          <!-- 3. Delivery Cost -->
          <div class="d-flex justify-content-between mb-2">
            <span class="text-muted">تكلفة التوصيل:</span>
            <span class="fw-bold" id="summaryDeliveryText">-- دج</span>
          </div>

          <!-- 4. Coupon Discount -->
          <div class="d-flex justify-content-between mb-2 text-danger" id="summaryDiscountRow" style="display:none !important;">
            <span>خصم الكوبون:</span>
            <span class="fw-bold" id="summaryDiscountText">-0 دج</span>
          </div>

          <hr class="my-2">
          <!-- 5. Final Total -->
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
  const compSelect = document.getElementById('funnelDeliveryCompany');

  if (wilayaSelect) {
    wilayaSelect.addEventListener('change', () => {
      updateDeliveryBadges();
      updateOrderSummary();
    });
  }

  if (compSelect) {
    compSelect.addEventListener('change', async function () {
      selectedDeliveryCompanyId = parseInt(this.value, 10);
      const selectedOpt = this.options[this.selectedIndex];
      selectedDeliveryCompanyName = selectedOpt ? selectedOpt.textContent.replace(' (الافتراضية)', '').trim() : '';
      await fetchFunnelRatesForCompany(selectedDeliveryCompanyId);
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

  // Load delivery companies dynamically
  initFunnelDeliveryCompanies();

  updateDeliveryBadges();
  updateOrderSummary();
}

// Update Badges on Home/Desk delivery buttons based on selected company & wilaya
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
    return;
  }

  let homePrice = wilayaObj.home;
  let deskPrice = wilayaObj.desk;

  if (activeDeliveryRates) {
    const rate = activeDeliveryRates[wilayaObj.en] || activeDeliveryRates[wilayaObj.name] || activeDeliveryRates[wilayaObj.code];
    if (rate) {
      if (rate.home !== undefined) homePrice = rate.home;
      else if (rate.home_price !== undefined) homePrice = rate.home_price;
      if (rate.desk !== undefined) deskPrice = rate.desk;
      else if (rate.desk_price !== undefined) deskPrice = rate.desk_price;
    }
  }

  homeBadge.textContent = `${homePrice} دج`;
  deskBadge.textContent = `${deskPrice} دج`;
}

// Calculate and update order summary box with detailed items
function updateOrderSummary() {
  const basePriceEl = document.getElementById('summaryOfferBaseText');
  const addonsRow = document.getElementById('summaryAddonsRow');
  const addonsText = document.getElementById('summaryAddonsText');
  const deliveryEl = document.getElementById('summaryDeliveryText');
  const totalEl = document.getElementById('summaryTotalText');
  const discountRow = document.getElementById('summaryDiscountRow');
  const discountEl = document.getElementById('summaryDiscountText');

  const dealBadge = document.getElementById('selectedDealBadge');
  const basePriceDisplay = document.getElementById('selectedDealBasePriceDisplay');

  if (!deliveryEl || !totalEl) return;

  const baseOfferPrice = selectedOffer ? (parseFloat(selectedOffer.price) || 0) : 0;
  const selectedOpts = selectedOffer ? getOfferSelectedOptions(selectedOffer) : [];
  const addOnsTotal = selectedOpts.reduce((sum, opt) => sum + (parseFloat(opt.price) || 0), 0);
  const subtotal = baseOfferPrice + addOnsTotal;

  if (dealBadge && selectedOffer) dealBadge.textContent = selectedOffer.title;
  if (basePriceDisplay && selectedOffer) basePriceDisplay.textContent = `${selectedOffer.price} دج`;
  if (basePriceEl) basePriceEl.textContent = `${baseOfferPrice} دج`;

  if (addonsRow && addonsText) {
    if (addOnsTotal > 0) {
      addonsRow.style.setProperty('display', 'flex', 'important');
      addonsText.textContent = `+${addOnsTotal} دج`;
    } else {
      addonsRow.style.setProperty('display', 'none', 'important');
    }
  }

  const wilayaSelect = document.getElementById('funnelWilaya');
  const selectedWilaya = wilayaSelect ? wilayaSelect.value : '';
  const wilayaObj = ALGERIAN_WILAYAS.find(w => w.en === selectedWilaya);

  const deliveryType = document.querySelector('input[name="funnelDeliveryType"]:checked')?.value || 'home';

  let deliveryCost = 0;
  if (wilayaObj) {
    let homePrice = wilayaObj.home;
    let deskPrice = wilayaObj.desk;
    if (activeDeliveryRates) {
      const rate = activeDeliveryRates[wilayaObj.en] || activeDeliveryRates[wilayaObj.name] || activeDeliveryRates[wilayaObj.code];
      if (rate) {
        if (rate.home !== undefined) homePrice = rate.home;
        else if (rate.home_price !== undefined) homePrice = rate.home_price;
        if (rate.desk !== undefined) deskPrice = rate.desk;
        else if (rate.desk_price !== undefined) deskPrice = rate.desk_price;
      }
    }

    deliveryCost = deliveryType === 'desk' ? deskPrice : homePrice;
    if (selectedOffer?.free_delivery || appliedPromo?.discount_type === 'free_delivery') {
      deliveryCost = 0;
    }
  }

  let discountAmount = 0;
  if (appliedPromo) {
    if (appliedPromo.discount_type === 'percentage') {
      discountAmount = Math.round((subtotal * appliedPromo.discount_value) / 100);
    } else if (appliedPromo.discount_type === 'fixed') {
      discountAmount = Math.min(subtotal, parseFloat(appliedPromo.discount_value));
    }
  }

  const finalTotal = Math.max(0, subtotal + (wilayaObj ? deliveryCost : 0) - discountAmount);

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

// Build complete hierarchical root path: e.g. skinsolutions / normal skin / normal skin landing page / vip offer (sesame oil, ricin oil..)
function buildOrderFunnelRootPath(offer, chosenOptions) {
  const parts = [];

  // Breadcrumbs (e.g. skinsolutions / normal skin)
  if (Array.isArray(currentFunnelData?.breadcrumbs)) {
    currentFunnelData.breadcrumbs.forEach(bc => {
      if (bc && bc.title) parts.push(bc.title.trim());
    });
  }

  // Current Landing Page / Funnel Node title
  if (currentFunnelData?.node?.title) {
    parts.push(currentFunnelData.node.title.trim());
  }

  // Offer Title with fixed and chosen options
  let offerTitle = offer ? offer.title.trim() : 'عرض مباشر';
  const optNames = [];
  if (offer?.settings?.fixed_option) {
    optNames.push(offer.settings.fixed_option.trim());
  }
  if (Array.isArray(chosenOptions) && chosenOptions.length > 0) {
    chosenOptions.forEach(opt => {
      if (opt && opt.name) {
        optNames.push(opt.name.trim() + (opt.price ? ` +${opt.price}دج` : ''));
      }
    });
  }

  if (optNames.length > 0) {
    offerTitle += ` (${optNames.join(', ')})`;
  }
  parts.push(offerTitle);

  return parts.join(' / ');
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
  
  let deliveryCost = 0;
  if (wilayaObj) {
    let homePrice = wilayaObj.home;
    let deskPrice = wilayaObj.desk;
    if (activeDeliveryRates) {
      const codeKey = String(wilayaObj.code);
      const codePad = codeKey.padStart(2, '0');
      const rate = activeDeliveryRates[codeKey] || activeDeliveryRates[codePad] || activeDeliveryRates[wilayaObj.en] || activeDeliveryRates[wilayaObj.ar];
      if (rate) {
        if (rate.home_price !== undefined) homePrice = rate.home_price;
        else if (rate.home !== undefined) homePrice = rate.home;
        if (rate.desk_price !== undefined) deskPrice = rate.desk_price;
        else if (rate.desk !== undefined) deskPrice = rate.desk;
      }
    }
    deliveryCost = deliveryType === 'desk' ? deskPrice : homePrice;
    if (selectedOffer?.free_delivery || appliedPromo?.discount_type === 'free_delivery') {
      deliveryCost = 0;
    }
  }

  const basePrice = selectedOffer ? getComputedOfferPrice(selectedOffer) : 0;
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

  const chosenOptions = selectedOffer ? (selectedCustomOptions[selectedOffer.id] || []) : [];
  const funnelRootPath = buildOrderFunnelRootPath(selectedOffer, chosenOptions);
  const compName = selectedDeliveryCompanyName || 'Yalidine Express';
  const compId = selectedDeliveryCompanyId || 1;

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
    shippingAddress: `[شركة: ${compName}] [مسار الطلب: ${funnelRootPath}] ${wilaya}`,
    address: null,
    funnel_root_path: funnelRootPath,
    items: [
      {
        id: selectedOffer?.product_id || null,
        name: funnelRootPath,
        root_path: funnelRootPath,
        price: basePrice,
        quantity: selectedOffer?.quantity || 1,
        selected_options: chosenOptions
      }
    ],
    cartTotal: basePrice,
    deliveryCost: deliveryCost,
    deliveryFee: deliveryCost,
    deliveryCompanyId: compId,
    deliveryCompanyName: compName,
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

    // Replace order form with congratulation & order tracking screen
    const orderBox = document.getElementById('orderFormBlock');
    if (orderBox) {
      let waPhone = '0770000000';
      let formattedWa = '213770000000';
      try {
        const bRes = await fetch('/api/branding');
        if (bRes.ok) {
          const bData = await bRes.json();
          const targetWa = bData.social_links?.whatsapp || bData.whatsapp || bData.phone;
          if (targetWa) {
            waPhone = targetWa;
            formattedWa = formatWhatsAppTargetNumber(targetWa);
          }
        }
      } catch (e) {}

      const orderId = result.orderId || result.orderGroup || 'OMV-' + Date.now().toString().slice(-6);
      const waText = encodeURIComponent(`السلام عليكم! قمت بتأكيد طلبي رقم #${orderId} من خلال صفحة (${currentFunnelData?.node?.title || 'الموقع'}). أود الاستفسار والتأكيد.`);
      const waUrl = `https://wa.me/${formattedWa}?text=${waText}`;

      orderBox.innerHTML = `
        <div class="funnel-success-order-card text-center py-4 px-2" dir="rtl">
          <div class="funnel-success-circle mx-auto mb-4">
            <i class="bi bi-check2 text-white display-3"></i>
          </div>

          <span class="badge bg-success-subtle text-success-emphasis border border-success px-3 py-2 rounded-pill fs-6 fw-bold mb-3 d-inline-block">
            <i class="bi bi-shield-check me-1"></i> تم تسجيل وتأكيد استلام طلبك بنجاح
          </span>

          <h2 class="fw-bolder text-dark mb-3">تهانينا! لقد تم تسجيل طلبك بنجاح 🎉</h2>
          
          <p class="lead text-secondary mx-auto mb-4" style="max-width: 620px; font-size: 1.15rem; line-height: 1.8;">
            سيبدأ فريقنا فوراً في تجهيز وتحضير طلبك بعناية، وسنتصل بك هاتفياً في أقرب وقت لتأكيد العنوان وتفاصيل الشحن والتوصيل.
          </p>

          <!-- Order ID Tracking Card -->
          <div class="funnel-order-id-box p-3 rounded-4 bg-light border border-2 d-inline-flex flex-column align-items-center mb-4 shadow-sm" style="min-width: 300px;">
            <span class="text-muted small fw-bold mb-1">رقم الطلب الخاص بك للمتابعة والتتبع:</span>
            <div class="d-flex align-items-center gap-2">
              <span class="fs-2 fw-bolder text-success font-monospace" id="successOrderIdDisplay">#${orderId}</span>
              <button type="button" class="btn btn-sm btn-outline-success rounded-pill px-3 py-1 fw-bold" onclick="navigator.clipboard.writeText('${orderId}'); this.innerHTML='<i class=\\'bi bi-check2\\'></i> تم النسخ'; setTimeout(() => this.innerHTML='<i class=\\'bi bi-clipboard\\'></i> نسخ', 2000);" title="نسخ رقم الطلب">
                <i class="bi bi-clipboard"></i> نسخ
              </button>
            </div>
          </div>

          <!-- WhatsApp Support Box -->
          <div class="funnel-whatsapp-support-card p-4 rounded-4 border mx-auto mb-4 shadow-sm" style="max-width: 540px;">
            <div class="d-flex align-items-center justify-content-center gap-2 mb-2">
              <i class="bi bi-whatsapp text-success fs-2"></i>
              <h5 class="fw-bold text-dark m-0">هل لديك أي سؤال أو ترغب في تعديل طلبك؟</h5>
            </div>
            <p class="text-muted small mb-3">
              فريق خدمة العملاء متواجد لمساعدتك والإجابة على استفساراتك مباشرة على واتساب:
              <strong class="text-dark d-block fs-5 mt-1" dir="ltr">${waPhone}</strong>
            </p>
            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-success btn-lg rounded-pill px-4 py-2 fw-bold d-inline-flex align-items-center gap-2 shadow">
              <i class="bi bi-whatsapp fs-4"></i>
              <span>تواصل معنا عبر واتساب الآن</span>
            </a>
          </div>

          <div>
            <a href="/" class="btn btn-outline-secondary rounded-pill px-4 py-2 fw-semibold">
              <i class="bi bi-house-door me-1"></i> العودة إلى الصفحة الرئيسية
            </a>
          </div>
        </div>
      `;

      orderBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

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
