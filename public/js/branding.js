// branding.js - Dynamically loads logo and cover images from backend branding API and updates the DOM

async function loadBrandingAssets() {
  try {
    const resp = await fetch('/api/branding');
    if (!resp.ok) return;
    const branding = await resp.json();

    // Update all logo images
    if (branding.logo) {
      document.querySelectorAll('img[data-dynamic-logo], img.logo-dynamic').forEach(img => {
        img.src = branding.logo;
      });
    }

    // Update cover images in carousels or backgrounds
    for (let i = 1; i <= 3; i++) {
      if (branding[`cover${i}`]) {
        document.querySelectorAll(`img[data-dynamic-cover="${i}"]`).forEach(img => {
          img.src = branding[`cover${i}`];
        });
      }
    }
  } catch (e) {
    // Fail silently
  }
}

document.addEventListener('DOMContentLoaded', loadBrandingAssets);
