// branding.js - Dynamically loads logo and slide images from site_settings API and updates the DOM

async function loadBrandingAssets() {
  try {
    const resp = await fetch('/api/site-settings');
    if (!resp.ok) return;
    const settings = await resp.json();

    // Update all logo images
    if (settings.logo) {
      document.querySelectorAll('img[data-dynamic-logo], img.logo-dynamic').forEach(img => {
        img.src = settings.logo;
      });
    }

    // Update carousel slides dynamically if the carousel exists
    const carouselInner = document.querySelector('#coverCarousel .carousel-inner');
    const carouselIndicators = document.querySelector('#coverCarousel .carousel-indicators');
    const slides = (settings.slides && settings.slides.length > 0) ? settings.slides : [];

    if (carouselInner && slides.length > 0) {
      // Rebuild carousel items
      carouselInner.innerHTML = slides.map((url, i) => `
        <div class="carousel-item${i === 0 ? ' active' : ''}">
          <img src="${url}" class="d-block w-100 hero-img" alt="سلايد ${i + 1}"
               loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async">
        </div>
      `).join('');

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
      document.querySelectorAll(`img[data-dynamic-cover="${i + 1}"]`).forEach(img => {
        img.src = legacySlides[i];
      });
    }

  } catch (e) {
    // Fail silently
  }
}

document.addEventListener('DOMContentLoaded', loadBrandingAssets);
