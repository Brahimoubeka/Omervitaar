// branding.js - Dynamically loads logo and slide images from site_settings API and updates the DOM

let lastProductsCarouselJson = null;

function getOptimizedSlideUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  if (rawUrl.includes('slide_1_1792342844084.png')) return '/images/slide_1_opt.webp';
  if (rawUrl.includes('slide_2_1792342998616.png')) return '/images/slide_2_opt.webp';
  return rawUrl;
}

function ensureProductsCarouselStyles() {
  if (document.getElementById('products-carousel-inline-style')) return;
  const st = document.createElement('style');
  st.id = 'products-carousel-inline-style';
  st.textContent = `
    .products-slide-clickable {
      display: block;
      position: relative;
      text-decoration: none !important;
      overflow: hidden;
    }
    .products-carousel-img {
      width: 100%;
      height: auto;
      max-height: 460px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
      transition: transform 0.35s ease;
    }
    .products-slide-clickable:hover .products-carousel-img {
      transform: scale(1.015);
    }
    .products-slide-cta-tag {
      position: absolute;
      bottom: 18px;
      left: 22px;
      z-index: 12;
      background: linear-gradient(135deg, #5a6344 0%, #3d442d 100%);
      color: #ffffff;
      padding: 8px 20px;
      border-radius: 50px;
      font-weight: 800;
      font-size: 0.92rem;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
      border: 1.5px solid rgba(255, 255, 255, 0.7);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: transform 0.2s ease, background 0.2s ease;
    }
    .products-slide-clickable:hover .products-slide-cta-tag {
      transform: translateY(-2px) scale(1.04);
      background: linear-gradient(135deg, #715100 0%, #5a6344 100%);
    }
    @media (max-width: 576px) {
      .products-carousel-img {
        max-height: 320px;
      }
      .products-slide-cta-tag {
        bottom: 12px;
        left: 14px;
        padding: 6px 14px;
        font-size: 0.8rem;
      }
    }
  `;
  document.head.appendChild(st);
}

function applyBrandingSettingsToDom(settings) {
  if (!settings) return;

  // Update all logo images
  if (settings.logo) {
    const optLogo = settings.logo.includes('logo.png') ? '/images/logo_opt.webp' : settings.logo;
    document.querySelectorAll('img[data-dynamic-logo], img.logo-dynamic').forEach(img => {
      img.src = optLogo;
    });
  }

  // 1. Update Home Page carousel slides (#coverCarousel)
  const carouselInner = document.querySelector('#coverCarousel .carousel-inner');
  const carouselIndicators = document.querySelector('#coverCarousel .carousel-indicators');
  const slides = (settings.slides && settings.slides.length > 0) ? settings.slides : [];

  if (carouselInner && slides.length > 0) {
    carouselInner.innerHTML = slides.map((slide, i) => {
      const rawUrl = (typeof slide === 'object' && slide !== null) ? slide.url : slide;
      const url = getOptimizedSlideUrl(rawUrl, i);
      const link = (typeof slide === 'object' && slide !== null && slide.link) ? slide.link : '';
      const title = (typeof slide === 'object' && slide !== null && slide.title) ? slide.title : `سلايد ${i + 1}`;
      const escapedTitle = title.replace(/"/g, '&quot;');
      const imgHtml = `<img src="${url}" class="d-block w-100 hero-img" alt="${escapedTitle}"
             width="440" height="520" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async">`;

      const contentHtml = link
        ? `<a href="${link}" class="slide-clickable-wrapper" title="${escapedTitle}" aria-label="${escapedTitle}">
             ${imgHtml}
             <span class="slide-action-tag">
               <i class="bi bi-arrow-left-circle-fill"></i> تسوق الآن
             </span>
           </a>`
        : imgHtml;

      return `
        <div class="carousel-item${i === 0 ? ' active' : ''}">
          ${contentHtml}
        </div>
      `;
    }).join('');

    if (carouselIndicators) {
      carouselIndicators.innerHTML = slides.map((_, i) => `
        <button type="button" data-bs-target="#coverCarousel" data-bs-slide-to="${i}"
                ${i === 0 ? 'class="active" aria-current="true"' : ''}
                aria-label="Slide ${i + 1}"></button>
      `).join('');
    }
  }

  // 2. Update Products Page Auto-Size Carousel (#productsPageCarousel)
  const prodCarouselSection = document.getElementById('productsPageCarouselSection');
  const prodCarouselEl = document.getElementById('productsPageCarousel');
  const prodCarouselInner = document.getElementById('productsCarouselInner');
  const prodCarouselIndicators = document.getElementById('productsCarouselIndicators');

  if (prodCarouselSection && prodCarouselInner && prodCarouselEl) {
    const prodSlides = (Array.isArray(settings.products_slides) && settings.products_slides.length > 0)
      ? settings.products_slides
      : slides;

    const serialized = JSON.stringify(prodSlides);
    if (prodSlides.length > 0 && serialized !== lastProductsCarouselJson) {
      lastProductsCarouselJson = serialized;
      ensureProductsCarouselStyles();
      prodCarouselSection.style.display = 'block';

      prodCarouselInner.innerHTML = prodSlides.map((slide, i) => {
        const rawUrl = (typeof slide === 'object' && slide !== null) ? slide.url : slide;
        const url = getOptimizedSlideUrl(rawUrl, i);
        const link = (typeof slide === 'object' && slide !== null && slide.link) ? slide.link : '';
        const title = (typeof slide === 'object' && slide !== null && slide.title) ? slide.title : `عرض ${i + 1}`;
        const escapedTitle = title.replace(/"/g, '&quot;');

        const imgHtml = `<img src="${url}" class="products-carousel-img" alt="${escapedTitle}" loading="${i === 0 ? 'eager' : 'lazy'}" ${i === 0 ? 'fetchpriority="high"' : ''} decoding="async">`;

        const innerHtml = link
          ? `<a href="${link}" class="products-slide-clickable" title="${escapedTitle}" aria-label="${escapedTitle}">
               ${imgHtml}
               <span class="products-slide-cta-tag">
                 <i class="bi bi-arrow-left-circle-fill"></i> شاهد الآن
               </span>
             </a>`
          : `<div class="position-relative">${imgHtml}</div>`;

        return `
          <div class="carousel-item${i === 0 ? ' active' : ''}">
            ${innerHtml}
          </div>
        `;
      }).join('');

      if (prodCarouselIndicators) {
        prodCarouselIndicators.innerHTML = prodSlides.length > 1
          ? prodSlides.map((_, i) => `
              <button type="button" data-bs-target="#productsPageCarousel" data-bs-slide-to="${i}"
                      ${i === 0 ? 'class="active" aria-current="true"' : ''}
                      aria-label="Slide ${i + 1}"></button>
            `).join('')
          : '';
      }

      // Initialize Bootstrap Carousel with 3-second (3000ms) auto-cycle interval
      if (window.bootstrap && bootstrap.Carousel) {
        const existingInstance = bootstrap.Carousel.getInstance(prodCarouselEl);
        if (existingInstance) existingInstance.dispose();
        const instance = new bootstrap.Carousel(prodCarouselEl, {
          interval: 3000,
          ride: 'carousel',
          pause: 'hover',
          wrap: true
        });
        instance.cycle();
      }
    } else if (prodSlides.length === 0) {
      prodCarouselSection.style.display = 'none';
    }
  }
}

async function loadBrandingAssets() {
  // 1) Instant render from localStorage cache (0ms delay)
  try {
    const cachedRaw = localStorage.getItem('omv_site_settings_cache');
    if (cachedRaw) {
      applyBrandingSettingsToDom(JSON.parse(cachedRaw));
    }
  } catch (_) {}

  // 2) Fetch fresh settings from RAM-cached backend endpoint
  try {
    const resp = await fetch('/api/site-settings');
    if (!resp.ok) return;
    const settings = await resp.json();
    try {
      localStorage.setItem('omv_site_settings_cache', JSON.stringify(settings));
    } catch (_) {}
    applyBrandingSettingsToDom(settings);
  } catch (e) {
    // Fail silently
  }
}

document.addEventListener('DOMContentLoaded', loadBrandingAssets);
