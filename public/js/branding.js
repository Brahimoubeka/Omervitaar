// branding.js - Dynamically loads logo and slide images from site_settings API and updates the DOM

async function loadBrandingAssets() {
  try {
    const resp = await fetch('/api/site-settings');
    if (!resp.ok) return;
    const settings = await resp.json();

    function getOptimizedSlideUrl(rawUrl, idx) {
      if (!rawUrl) return rawUrl;
      if (rawUrl.includes('slide_1_1792342844084.png')) return '/images/slide_1_opt.webp';
      if (rawUrl.includes('slide_2_1792342998616.png')) return '/images/slide_2_opt.webp';
      return rawUrl;
    }

    // Update all logo images
    if (settings.logo) {
      const optLogo = settings.logo.includes('logo.png') ? '/images/logo_opt.webp' : settings.logo;
      document.querySelectorAll('img[data-dynamic-logo], img.logo-dynamic').forEach(img => {
        img.src = optLogo;
      });
    }

    // Update carousel slides dynamically if the carousel exists
    const carouselInner = document.querySelector('#coverCarousel .carousel-inner');
    const carouselIndicators = document.querySelector('#coverCarousel .carousel-indicators');
    const slides = (settings.slides && settings.slides.length > 0) ? settings.slides : [];

    if (carouselInner && slides.length > 0) {
      // Rebuild carousel items using optimized WebP paths with explicit dimensions
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

      // Rebuild indicators
      if (carouselIndicators) {
        carouselIndicators.innerHTML = slides.map((_, i) => `
          <button type="button" data-bs-target="#coverCarousel" data-bs-slide-to="${i}"
                  ${i === 0 ? 'class="active" aria-current="true"' : ''}
                  aria-label="Slide ${i + 1}"></button>
        `).join('');
      }
    }

    // Legacy: also support data-dynamic-cover="N" attributes (1-based)
    const legacySlides = settings.slides || [];
    for (let i = 0; i < legacySlides.length; i++) {
      const url = (typeof legacySlides[i] === 'object' && legacySlides[i] !== null) ? legacySlides[i].url : legacySlides[i];
      document.querySelectorAll(`img[data-dynamic-cover="${i + 1}"]`).forEach(img => {
        img.src = url;
      });
    }

  } catch (e) {
    // Fail silently
  }
}

document.addEventListener('DOMContentLoaded', loadBrandingAssets);
