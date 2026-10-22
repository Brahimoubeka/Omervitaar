/**
 * Loads and renders Featured Solutions / Funnel Sections on Homepage
 * Fixed dimensions prevent CLS / large image flash on refresh
 */
document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('home-featured-funnels-root');
  if (!root) return;

  try {
    const res = await fetch('/api/funnels/home-featured');
    if (!res.ok) return;
    const funnels = await res.json();
    if (!Array.isArray(funnels) || funnels.length === 0) return;

    const html = `
      <section class="home-funnels-section" aria-label="أقسام وحلول مميزة">
        <div class="container py-2">
          <div class="home-funnels-grid">
            ${funnels.map(item => {
              const hasSubs = Array.isArray(item.sub_sections) && item.sub_sections.length > 0;
              const linkUrl = `/solutions/${item.slug}`;
              const btnText = item.button_text || 'اكتشف الحل ➔';
              const imgUrl = item.image_url || '/images/hero.jpg';

              const settings = typeof item.settings === 'object' && item.settings !== null ? item.settings : {};

              let titleStyle = settings.title_color ? `style="color: ${settings.title_color} !important;"` : '';
              let textStyle = settings.text_color ? `style="color: ${settings.text_color} !important;"` : '';

              let btnStyle = '';
              if (settings.button_color) btnStyle += `background: ${settings.button_color} !important; `;
              if (settings.button_text_color) btnStyle += `color: ${settings.button_text_color} !important; `;

              return `
                <div class="home-funnel-card" data-funnel-id="${item.id}">
                  <div class="home-funnel-img-wrap" style="width: 100%; aspect-ratio: 1/1; overflow: hidden; position: relative;">
                    <img src="${imgUrl}" alt="${item.title}" onerror="this.onerror=null; this.src='/images/hero.jpg';" class="home-funnel-img" width="300" height="300" style="width: 100%; height: 100%; max-width: 100%; aspect-ratio: 1/1; object-fit: cover; display: block;" loading="lazy">
                  </div>
                  <div class="home-funnel-content">
                    <h3 class="home-funnel-title" ${titleStyle}>${item.title}</h3>
                    <p class="home-funnel-subtitle" ${textStyle}>${item.subtitle || '&nbsp;'}</p>
                    
                    <div class="home-funnel-subs ${hasSubs ? '' : 'home-funnel-subs-empty'}">
                      ${hasSubs ? `
                        ${item.sub_sections.slice(0, 2).map(sub => `
                          <a href="/solutions/${sub.slug}" class="home-funnel-sub-pill" title="${sub.title}">
                            <span>${sub.title}</span>
                          </a>
                        `).join('')}
                        ${item.sub_sections.length > 2 ? `
                          <a href="${linkUrl}" class="home-funnel-more-pill" title="يوجد ${item.sub_sections.length - 2} أقسام إضافية">
                            +${item.sub_sections.length - 2}
                          </a>
                        ` : ''}
                      ` : `
                        <span class="home-funnel-sub-pill" style="visibility: hidden;">&nbsp;</span>
                      `}
                    </div>

                    <a href="${linkUrl}" class="home-funnel-cta-btn" style="${btnStyle}">
                      <span>${btnText}</span>
                      <i class="bi bi-arrow-left"></i>
                    </a>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </section>
    `;

    root.innerHTML = html;
  } catch (err) {
    console.error('Failed to load home featured funnels:', err);
  }
});
