// Helper function to render star ratings as 5 classic yellow stars
const renderStars = (rating) => {
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="star" style="font-size:1.0em; color: ${i < rating ? '#ffc107' : '#e4e5e9'};">&#9733;</span>`
  ).join('');
};

function getQueryParams() {
  // First check if we're using clean URLs
  const pageInfo = SlugUtil.getCurrentPageInfo();

  if (pageInfo.type === 'product' && pageInfo.id) {
    return { id: pageInfo.id.toString() };
  }

  // Fall back to legacy query parameters
  const params = {};
  const queryString = window.location.search.slice(1);

  queryString.split('&').forEach(param => {
    const [key, value] = param.split('=');
    if (key && value) params[key] = decodeURIComponent(value);
  });

  return params;
}

// Helper function to render product description cleanly (no box, no margin, edge to edge)
function renderProductDescription(description, container) {
  if (!container) return;
  if (!description || description.trim() === '') {
    container.innerHTML = '';
    return;
  }

  // Create description container with no box, no border, and zero side margins
  const descriptionContainer = document.createElement('div');
  descriptionContainer.className = 'product-description-container w-100 my-3';

  // Create the description text element spanning full width
  const descriptionText = document.createElement('div');
  descriptionText.id = 'product-description-content';
  descriptionText.className = 'product-description-text w-100';

  // Format line breaks safely if plain text
  const formattedDesc = description.includes('<') && description.includes('>')
    ? description
    : description.replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
  descriptionText.innerHTML = formattedDesc;

  descriptionContainer.appendChild(descriptionText);
  container.innerHTML = '';
  container.appendChild(descriptionContainer);
}

// Helper function to extract YouTube video IDs from a text  
const extractYouTubeLinks = (text) => {
  const ytRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_\-]+))/g;
  const links = [];
  let match;
  while ((match = ytRegex.exec(text)) !== null) {
    const url = match[1];
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split(/[?&]/)[0];
    } else if (url.includes('v=')) {
      videoId = url.split('v=')[1].split(/[&?]/)[0];
    }
    if (videoId) links.push(videoId);
  }
  return links;
};

// --- Global Loading Spinner Notification ---
function showGlobalLoadingSpinner(message = 'جاري التحميل...') {
  let spinnerDiv = document.getElementById('global-loading-spinner');
  if (!spinnerDiv) {
    spinnerDiv = document.createElement('div');
    spinnerDiv.id = 'global-loading-spinner';
    spinnerDiv.style.position = 'fixed';
    spinnerDiv.style.top = '30px';
    spinnerDiv.style.left = '50%';
    spinnerDiv.style.transform = 'translateX(-50%)';
    spinnerDiv.style.zIndex = '9999';
    spinnerDiv.innerHTML = `
      <div class="alert alert-warning d-flex align-items-center mb-0" role="alert" style="min-width:220px;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        <span>${message}</span>
      </div>`;
    document.body.appendChild(spinnerDiv);
  }
}
function hideGlobalLoadingSpinner() {
  const spinnerDiv = document.getElementById('global-loading-spinner');
  if (spinnerDiv) spinnerDiv.remove();
}

// --- Skeleton Loading for Product Detail ---
function renderProductDetailSkeleton() {
  // Only update the contents of the child columns, not the parent container
  const imgCol = document.getElementById('product-image-carousel-col');
  const infoCol = document.getElementById('product-info-col');
  if (imgCol) {
    imgCol.innerHTML = '<div class="product-carousel-box skeleton-detail-img"></div>';
  }
  if (infoCol) {
    infoCol.innerHTML = `
      <div class="skeleton-detail-title mb-3"></div>
      <div class="skeleton-detail-price mb-2"></div>
      <div class="skeleton-detail-rating mb-2"></div>
      <div class="skeleton-detail-badges mb-2"></div>
      <div class="skeleton-detail-desc mb-4"></div>
      <div class="d-flex gap-2">
        <div class="skeleton-detail-btn flex-grow-1"></div>
        <div class="skeleton-detail-btn flex-grow-1"></div>
      </div>
    `;
  }
}

// --- Skeleton CSS for Product Detail ---
// Note: Skeleton CSS styles are now inline in HTML for better performance
// This function is kept for backwards compatibility but does nothing
(function addProductDetailSkeletonStyles() {
  // CSS moved to inline styles in HTML head for performance
  return;
})();

// MAIN FUNCTION: loadProductDetail
async function loadProductDetail() {
  renderProductDetailSkeleton();
  showGlobalLoadingSpinner('جاري تحميل تفاصيل المنتج...');

  const params = getQueryParams();
  productId = params.id;

  if (!productId) {
    hideGlobalLoadingSpinner();
    const errorContainer = document.getElementById('product-detail-container');
    errorContainer.innerHTML = `
      <div class="alert alert-warning text-center" role="alert">
        <div class="mb-3">
          <i class="bi bi-question-circle-fill" style="font-size: 2rem; color: #ffc107;"></i>
        </div>
        <h4 class="alert-heading">لم يتم تحديد المنتج</h4>
        <p class="mb-3">لم يتم تحديد معرف المنتج المطلوب عرضه.</p>
        <hr>
        <div class="d-flex justify-content-center gap-2">
          <button class="btn btn-primary" onclick="window.location.href='/products'">
            <i class="bi bi-shop me-1"></i>تصفح المنتجات
          </button>
          <button class="btn btn-secondary" onclick="window.location.href='/'">
            <i class="bi bi-house me-1"></i>الصفحة الرئيسية
          </button>
        </div>
      </div>
    `;

    // Update page meta for no product case
    document.title = "Omervita - لم يتم تحديد المنتج";

    // Update breadcrumb for no product case  
    const breadcrumbContainer = document.getElementById('product-breadcrumb');
    if (breadcrumbContainer) {
      breadcrumbContainer.innerHTML = `
        <li class="breadcrumb-item"><a href="/"><i class="bi bi-house me-1"></i>الرئيسية</a></li>
        <li class="breadcrumb-item"><a href="/products"><i class="bi bi-shop me-1"></i>المنتجات</a></li>
        <li class="breadcrumb-item active" aria-current="page">منتج غير محدد</li>
      `;
    }
    return;
  }

  try {
    // Optimized cache strategy: check cache first, then fetch if needed
    const cacheKey = `product_${productId}`;
    const cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
    const cachedData = CacheManager.get(cacheKey, cacheExpiry);

    let product;
    const token = localStorage.getItem('token');
    if (cachedData && !token) {
      product = cachedData;
      console.log('Loading product from cache for better performance');
    } else {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`/api/products/${productId}`, { headers });

      if (!response.ok) {
        throw new Error('المنتج غير موجود.');
      }

      product = await response.json();
      // Cache the product data
      CacheManager.set(cacheKey, product);
    }

    // Check if product is inactive and user is not admin
    if (product.is_active === false) {
      let isAdmin = false;
      try {
        if (token) {
          // Use parseJwt if available (from header.js) or decode manually
          const parseJwt = window.parseJwt || function (t) {
            const base64Url = t.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(window.atob(base64));
          };
          const userData = parseJwt(token);
          if (userData && userData.role === 'admin') isAdmin = true;
        }
      } catch (e) {
        console.error('Error parsing token for admin check:', e);
      }

      if (!isAdmin) {
        hideGlobalLoadingSpinner();
        const container = document.getElementById('product-detail-container');
        if (container) {
          container.innerHTML = `
            <div class="container text-center py-5 my-5" style="min-height: 50vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
              <i class="bi bi-eye-slash text-muted mb-3" style="font-size: 5rem;"></i>
              <h2 class="text-dark fw-bold mb-3">المنتج غير متاح</h2>
              <p class="text-muted fs-5 mb-4">نعتذر، هذا المنتج لم يعد متوفراً حالياً.</p>
              <a href="/products" class="btn btn-primary px-4 py-2 fw-bold" style="background: var(--orange-accent); color: var(--dark-charcoal); border: none; border-radius: 8px;">
                <i class="bi bi-shop me-2"></i>العودة لصفحة المنتجات
              </a>
            </div>
          `;
        }
        document.title = "Omervita - المنتج غير متاح";
        const breadcrumbContainer = document.getElementById('product-breadcrumb');
        if (breadcrumbContainer) {
          breadcrumbContainer.innerHTML = `
            <li class="breadcrumb-item"><a href="/"><i class="bi bi-house me-1"></i>الرئيسية</a></li>
            <li class="breadcrumb-item"><a href="/products"><i class="bi bi-shop me-1"></i>المنتجات</a></li>
            <li class="breadcrumb-item active" aria-current="page">منتج غير متاح</li>
          `;
        }
        return;
      }
    }

    // Hide debug after successful load
    setTimeout(() => {
      const debugDiv = document.getElementById('debug-info');
      if (debugDiv && debugDiv.parentNode) {
        debugDiv.style.display = 'none';
      }
    }, 3000);

    // Store product data globally for button functionality
    window.currentProduct = product;

    // Update page SEO and URL
    updatePageSEO(product);
    updateBreadcrumb(product);

    let images = (product.images && product.images.length > 0) ? product.images : [product.imagePath || 'images/default-product.jpg'];

    // --- YouTube: Extract video IDs from description ---
    const youTubeVideoIds = extractYouTubeLinks(product.description || '');

    // --- Phase 3: LCP optimization (first image loading eager) ---
    const carouselSlides = [
      ...images.map((src, idx) => ({
        type: 'image',
        src: src,
        content: `<img src="${src}" class="d-block w-100 h-100 product-zoom" id="main-product-image" alt="صورة المنتج ${idx + 1}" style="cursor: zoom-in;" onclick="openImageModal(window.currentImageIndex || 0)" title="انقر لتكبير الصورة" ${idx === 0 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'}>`
      })),
      ...youTubeVideoIds.map((vid, idx) => ({
        type: 'youtube',
        vid: vid,
        content: `<iframe width="100%" height="100%" id="main-product-video" src="https://www.youtube.com/embed/${vid}" frameborder="0" allowfullscreen style="border-radius:14px;max-width:100%;height:100%;background:#000" loading="lazy"></iframe>`
      }))
    ];

    // Build thumbnails HTML
    const thumbnailsHtml = carouselSlides.length > 1 ? `
      <div class="product-thumbnails-container">
        ${carouselSlides.map((slide, idx) => {
      if (slide.type === 'image') {
        return `<div class="thumbnail-item ${idx === 0 ? 'active' : ''}" onclick="changeMainMedia(${idx})">
                      <img src="${slide.src}" alt="Thumbnail ${idx + 1}" loading="lazy">
                    </div>`;
      } else {
        return `<div class="thumbnail-item ${idx === 0 ? 'active' : ''}" onclick="changeMainMedia(${idx})" style="position:relative; background:#000;">
                      <img src="https://img.youtube.com/vi/${slide.vid}/default.jpg" alt="Video Thumbnail" loading="lazy" style="opacity:0.7;">
                      <i class="bi bi-play-circle-fill text-white" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:1.5rem;"></i>
                    </div>`;
      }
    }).join('')}
      </div>
    ` : '';

    // Main media container
    const mainMediaHtml = `
      <div class="product-main-image-box" id="main-media-container">
        ${carouselSlides[0] ? carouselSlides[0].content : ''}
      </div>
      ${thumbnailsHtml}
    `;

    // Global function to handle media change
    window.carouselSlidesData = carouselSlides;
    window.currentImageIndex = 0;
    window.changeMainMedia = function (idx) {
      window.currentImageIndex = idx;
      const container = document.getElementById('main-media-container');
      if (container && window.carouselSlidesData[idx]) {
        container.innerHTML = window.carouselSlidesData[idx].content;
        // Update active class on thumbnails
        document.querySelectorAll('.thumbnail-item').forEach((item, i) => {
          if (i === idx) item.classList.add('active');
          else item.classList.remove('active');
        });
      }
    };

    // --- Carousel with modal functionality ---
    const imgCol = document.getElementById('product-image-carousel-col');
    imgCol.innerHTML = `
      ${mainMediaHtml}

      <!-- Image Modal (Lightbox Mode: Attractive frame, direct close button & click-out) -->
      <div class="modal fade lightbox-modal" id="imageModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-fullscreen m-0 p-0">
          <div class="modal-content border-0 rounded-0 shadow-none position-relative w-100 h-100 overflow-hidden">
            <!-- Top corner close button -->
            <button type="button" class="btn-close-lightbox" data-bs-dismiss="modal" aria-label="إغلاق" title="إغلاق">
              <i class="bi bi-x-lg"></i>
            </button>

            <!-- Floating hint pill -->
            <div class="image-zoom-hint">
              <i class="bi bi-arrows-fullscreen me-1"></i>
              <span>يمكنك التكبير بعجلة الفأرة والتحريك بالسحب</span>
            </div>

            <div class="modal-body p-0 w-100 h-100 d-flex align-items-center justify-content-center position-relative">
              <div id="modalCarousel" class="carousel slide w-100 h-100" data-bs-ride="false" data-bs-interval="false">
                <div class="carousel-inner w-100 h-100">
                  ${images.map((src, idx) => `
                    <div class="carousel-item w-100 h-100${idx === 0 ? ' active' : ''}">
                      <div class="lightbox-img-wrapper w-100 h-100 d-flex flex-column justify-content-center align-items-center">
                        <div class="lightbox-stage d-inline-flex flex-column align-items-center position-relative">
                          <!-- Close button directly above the image -->
                          <div class="lightbox-header-bar w-100 d-flex justify-content-between align-items-center mb-2">
                            <span class="lightbox-tip-badge d-none d-sm-inline-flex align-items-center">
                              <i class="bi bi-cursor me-1"></i>انقر خارج الصورة للإغلاق
                            </span>
                            <button type="button" class="btn-close-above-image" data-bs-dismiss="modal" aria-label="إغلاق" title="إغلاق">
                              <i class="bi bi-x-lg me-1"></i>
                              <span>إغلاق</span>
                            </button>
                          </div>
                          <img src="${src}" class="img-fluid lightbox-zoom-img" alt="صورة المنتج ${idx + 1}" loading="lazy">
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
                ${images.length > 1 ? `
                <button class="carousel-control-prev lightbox-arrow" type="button" data-bs-target="#modalCarousel" data-bs-slide="prev" aria-label="السابق">
                  <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                </button>
                <button class="carousel-control-next lightbox-arrow" type="button" data-bs-target="#modalCarousel" data-bs-slide="next" aria-label="التالي">
                  <span class="carousel-control-next-icon" aria-hidden="true"></span>
                </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Store images globally for modal access
    window.productImages = images;

    const detailsCol = document.getElementById('product-info-col');
    detailsCol.innerHTML = '';
    // Product Title 
    const name = document.createElement('h1');
    name.innerHTML = `<i class="bi bi-box-seam me-2" style="color:var(--military-green,#715100)"></i>
      <span style="color:var(--military-green,#715100); font-weight:700;">${product.name}</span>`;
    detailsCol.appendChild(name);

    // Add star rating below the title
    if (product.avgRating !== null && product.avgRating !== undefined) {
      const ratingDiv = document.createElement('div');
      ratingDiv.className = 'product-rating mb-3 d-flex align-items-center';

      // Get the average rating and round to nearest 0.5
      const avgRating = Math.round(product.avgRating * 2) / 2;

      // Create stars
      const starsHtml = renderStars(avgRating);

      ratingDiv.innerHTML = `
        <div class="stars-container me-2">
          ${starsHtml}
        </div>
        <span class="rating-value text-warning fw-bold" style="font-size: 1.1rem;">${avgRating.toFixed(1)}</span>
        <span class="review-count text-muted ms-2">(${product.reviewCount || 0} تقييم)</span>
      `;

      detailsCol.appendChild(ratingDiv);
    }

    // Update breadcrumb with product information
    updateBreadcrumb(product);

    // --- SEO: Dynamic Meta Description ---
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = product.description
      ? product.description.substring(0, 160)
      : `${product.name} - تسوق الآن من Omervita!`;

    // --- SEO: Open Graph & Twitter Card Tags ---
    function setOrUpdateMeta(property, content) {
      let tag = document.querySelector(`meta[property='${property}']`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    }
    setOrUpdateMeta('og:title', `${product.name} | Omervita`);
    setOrUpdateMeta('og:description', product.description ? product.description.substring(0, 160) : '');
    setOrUpdateMeta('og:image', images[0]);
    setOrUpdateMeta('og:url', window.location.href);
    setOrUpdateMeta('og:type', 'product');
    setOrUpdateMeta('twitter:card', 'summary_large_image');
    setOrUpdateMeta('twitter:title', `${product.name} | Omervita`);
    setOrUpdateMeta('twitter:description', product.description ? product.description.substring(0, 160) : '');
    setOrUpdateMeta('twitter:image', images[0]);

    // --- SEO: Enhanced Structured Data (JSON-LD) ---
    const productJsonLd = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.name,
      "image": images.map(img => img.startsWith('http') ? img : `https://omervita.com/${img.replace(/^\/*/, '')}`),
      "description": product.description || `${product.name} - منتج طبيعي عالي الجودة من Omervita`,
      "sku": product.sku || `OMERVITA-${product.id}`,
      "mpn": product.mpn || product.id,
      "brand": {
        "@type": "Brand",
        "name": "Omervita",
        "url": "https://omervita.com/"
      },
      "manufacturer": {
        "@type": "Organization",
        "name": "Omervita",
        "url": "https://omervita.com/"
      },
      "category": (product.categories && product.categories.length > 0) ? product.categories.map(cat => cat.name).join(', ') : 'العناية الشخصية',
      "offers": {
        "@type": "Offer",
        "priceCurrency": "DZD",
        "price": product.price,
        "priceValidUntil": new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
        "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "url": window.location.href,
        "seller": {
          "@type": "Organization",
          "name": "Omervita",
          "url": "https://omervita.com/"
        },
        "itemCondition": "https://schema.org/NewCondition"
      },
      "url": window.location.href
    };

    // Add aggregate rating if available
    if (product.avgRating && product.reviewCount > 0) {
      productJsonLd.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": product.avgRating,
        "reviewCount": product.reviewCount,
        "bestRating": 5,
        "worstRating": 1
      };
    }

    // Add additional product properties if available
    if (product.weight) {
      productJsonLd.weight = {
        "@type": "QuantitativeValue",
        "value": product.weight,
        "unitText": "g"
      };
    }

    if (product.dimensions) {
      productJsonLd.depth = product.dimensions.depth || null;
      productJsonLd.height = product.dimensions.height || null;
      productJsonLd.width = product.dimensions.width || null;
    }

    let script = document.getElementById('product-jsonld');
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'product-jsonld';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(productJsonLd, null, 2);

    // --- SEO: Canonical URL ---
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href;

    // --- CATEGORY BADGES with icon ---
    if (product.categories && product.categories.length > 0) {
      const categoriesDiv = document.createElement('div');
      categoriesDiv.className = "mb-2";
      categoriesDiv.innerHTML = `
        <span class="fw-bold" style="color:var(--military-green,#715100);font-size:1.1em">
          <i class="bi bi-tags"></i> الفئات:
        </span>
        ${product.categories.map(cat => {
        // Map category ID to known slug (same as index page)
        let categorySlug;
        switch (cat.id) {
          case 1: categorySlug = 'alanayh-alshar-1'; break;
          case 2: categorySlug = 'alanayh-alshrh-2'; break;
          case 3: categorySlug = 'aghdhyh-shyh-3'; break;
          case 4: categorySlug = 'altwal-4'; break;
          default: categorySlug = `category-${cat.id}`;
        }
        return `<a href="/categories/${categorySlug}" class="badge mx-1 text-decoration-none" style="background-color:var(--orange-accent,#ffbf00) !important;color:#555 !important;font-weight:600;font-size:0.8em;padding:.3em .6em;"><i class="bi bi-tag"></i> ${cat.name}</a>`;
      }).join('')}
      `;
      detailsCol.appendChild(categoriesDiv);
    }

    // Price
    const price = document.createElement('p');
    price.classList.add('fs-5', 'mb-3');
    price.innerHTML = `<span class="product-card-price" style="color: rgb(255, 115, 0);font-weight:700;font-size:1.28em;">
    <i class="bi bi-tag"></i> ${product.price} دج
    </span>`;
    detailsCol.appendChild(price);

    // If stock is 0, show a red badge!
    if (product.stock !== undefined && product.stock === 0) {
      const outOfStock = document.createElement('span');
      outOfStock.className = 'badge rounded-pill bg-danger mb-2';
      outOfStock.style.fontSize = "1em";
      outOfStock.innerHTML = '<i class="bi bi-x-octagon"></i> غير متوفر';
      detailsCol.appendChild(outOfStock);
    }

    // Product Details Text: full width across page from right to left corner (no box, no margin)
    const fullDescCol = document.getElementById('product-description-full-col');
    renderProductDescription(product.description || '', fullDescCol || detailsCol);

    // Quick order buttons row
    const buttonsRow = document.createElement('div');
    buttonsRow.className = 'd-flex flex-column flex-sm-row gap-2 mt-3';

    // Add to Cart Button 
    const addToCartButton = document.createElement('button');
    addToCartButton.innerHTML = `<i class="bi bi-cart-plus me-1"></i>أضف إلى السلة`;
    addToCartButton.classList.add('btn', 'btn-outline-primary', 'px-4', 'py-2', 'add-to-cart-btn', 'flex-grow-1');
    if (product.stock === 0) {
      addToCartButton.disabled = true;
      addToCartButton.style.opacity = '.6';
      addToCartButton.style.cursor = 'not-allowed';
    }
    addToCartButton.addEventListener('click', () => {
      let cart = JSON.parse(localStorage.getItem('cart')) || [];
      const productId = product.id || product._id;
      const existingProduct = cart.find(item => (item.id || item._id) === productId);
      if (existingProduct) {
        existingProduct.quantity += 1;
      } else {
        cart.push({
          id: productId,
          name: product.name,
          price: product.price,
          thumbnail: product.thumbnail,
          quantity: 1
        });
      }
      localStorage.setItem('cart', JSON.stringify(cart));
      if (typeof updateCartCounter === 'function') updateCartCounter();
      if (typeof updateCartCount === 'function') updateCartCount();

      // Show enhanced cart popup with product info
      showCartMessage('<i class="bi bi-check-circle-fill"></i> تم إضافة المنتج إلى السلة!', 'success', product);
    });

    // WhatsApp Button
    const whatsappButton = document.createElement('button');
    whatsappButton.id = 'contact-about-product-btn';
    whatsappButton.classList.add('btn', 'btn-success', 'flex-grow-1');
    whatsappButton.innerHTML = `<i class="bi bi-whatsapp me-1"></i>تواصل عبر واتساب`;

    buttonsRow.appendChild(addToCartButton);
    buttonsRow.appendChild(whatsappButton);
    detailsCol.appendChild(buttonsRow);

    // Initialize the direct checkout form on the page and make it visible
    const stickyOrderBtnSmall = document.querySelector('.sticky-order-now-small');
    if (product.stock > 0) {
      const checkoutContainer = document.getElementById('directCheckoutContainer');
      if (checkoutContainer) {
        checkoutContainer.style.display = 'block';
        // Place the form right after the product-detail-container inside the main wrapper
        // It's already there in the HTML, we just need to initialize it
        window.currentProduct = product;
        if (window.initDirectCheckout) {
          window.initDirectCheckout(product);
        }
      }
    } else {
      // Out of stock
      if (stickyOrderBtnSmall) {
        stickyOrderBtnSmall.innerHTML = '<i class="bi bi-x-octagon-fill me-1"></i> المنتج غير متوفر حاليا';
        stickyOrderBtnSmall.style.backgroundColor = '#dc3545';
        stickyOrderBtnSmall.style.borderColor = '#dc3545';
        stickyOrderBtnSmall.style.color = '#fff';
        stickyOrderBtnSmall.style.cursor = 'not-allowed';
        stickyOrderBtnSmall.style.pointerEvents = 'none';
      }
    }

    // Call-to-action buttons functionality

    // Complete Order Button - adds product to cart and redirects to cart page
    const completeOrderBtn = document.getElementById('complete-order-btn');
    if (completeOrderBtn) {
      // Hide button if product is out of stock
      if (product.stock === 0) {
        completeOrderBtn.style.display = 'none';
      } else {
        completeOrderBtn.style.display = 'inline-block';

        completeOrderBtn.addEventListener('click', () => {
          // Get current product data from the global variable or fetch it
          if (window.currentProduct) {
            // Add product to cart if not already added
            let cart = JSON.parse(localStorage.getItem('cart')) || [];
            const existingProduct = cart.find(item => item.id === window.currentProduct.id);

            if (!existingProduct) {
              // Add 1 piece of the product to cart
              cart.push({
                id: window.currentProduct.id,
                name: window.currentProduct.name,
                price: window.currentProduct.price,
                image: window.currentProduct.images?.[0] || window.currentProduct.imagePath,
                quantity: 1
              });
              localStorage.setItem('cart', JSON.stringify(cart));
            }

            // Redirect to cart page
            window.location.href = '/cart';
          }
        });
      }
    }

    // Contact About Product Button - WhatsApp integration
    const contactAboutProductBtn = document.getElementById('contact-about-product-btn');
    if (contactAboutProductBtn) {
      contactAboutProductBtn.addEventListener('click', async () => {
        try {
          // Show loading state
          contactAboutProductBtn.disabled = true;
          contactAboutProductBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>جاري الفتح...`;

          // Get WhatsApp number from branding data
          const brandingCacheKey = 'branding_data';
          let branding = CacheManager.get(brandingCacheKey, 15 * 60 * 1000);

          if (!branding) {
            const brandingResponse = await fetch('/api/branding', {
              headers: { 'Cache-Control': 'public, max-age=900' }
            });
            branding = await brandingResponse.json();
            CacheManager.set(brandingCacheKey, branding);
          }

          // Format phone number for WhatsApp
          const phoneNumber = branding.phone?.replace(/\D/g, '') || '905518560018';
          let formattedNumber = phoneNumber;

          // Add country code if missing
          if (!formattedNumber.startsWith('90') && !formattedNumber.startsWith('966') && !formattedNumber.startsWith('213')) {
            formattedNumber = '90' + formattedNumber;
          }

          // Get product info from window.currentProduct
          const product = window.currentProduct;
          const productUrl = window.location.href;

          // Prepare message
          let whatsappMessage = `السلام عليكم! أود الاستفسار عن المنتج:\n`;
          whatsappMessage += `${product.name}\n\n`;
          whatsappMessage += `- السعر: ${product.price} دج\n`;

          if (product.description) {
            // Add truncated description if available
            const shortDesc = product.description.length > 100 ?
              product.description.substring(0, 100) + '...' :
              product.description;
            whatsappMessage += `- ${shortDesc}\n\n`;
          }

          whatsappMessage += `رابط المنتج:\n${productUrl}`;

          // Copy product URL
          try {
            await navigator.clipboard.writeText(productUrl);
            // Show mini toast 
            const toast = document.createElement('div');
            toast.className = 'position-fixed bottom-0 end-0 p-3';
            toast.style.zIndex = '5000';
            toast.innerHTML = `
              <div class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                  <div class="toast-body">
                    <i class="bi bi-check2-circle me-2"></i>تم نسخ رابط المنتج
                  </div>
                  <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
              </div>
            `;
            document.body.appendChild(toast);
            const bsToast = new bootstrap.Toast(toast.querySelector('.toast'));
            bsToast.show();
            setTimeout(() => toast.remove(), 3000);
          } catch (err) {
            console.warn('Could not copy to clipboard:', err);
          }

          // Detect device
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

          // URLs for different platforms
          const waWebUrl = `https://web.whatsapp.com/send?phone=${formattedNumber}&text=${encodeURIComponent(whatsappMessage)}`;
          const waAppUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(whatsappMessage)}`;
          const waDeepLink = `whatsapp://send?phone=${formattedNumber}&text=${encodeURIComponent(whatsappMessage)}`;

          // Open WhatsApp with fallback strategy
          if (isMobile) {
            if (isIOS) {
              // iOS: Try deep link first, then web
              try {
                window.location.href = waDeepLink;
                setTimeout(() => window.location.href = waAppUrl, 2000);
              } catch {
                window.location.href = waAppUrl;
              }
            } else {
              // Android: Use app URL
              window.location.href = waAppUrl;
            }
          } else {
            // Desktop: Open WhatsApp Web
            window.open(waWebUrl, '_blank');
          }

        } catch (error) {
          console.error('Error opening WhatsApp:', error);

          // Show error modal
          const errorModal = document.createElement('div');
          errorModal.className = 'modal fade';
          errorModal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">
                    <i class="bi bi-exclamation-triangle text-warning me-2"></i>
                    تعذر فتح واتساب
                  </h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <p>لم نتمكن من فتح واتساب تلقائياً. يمكنك:</p>
                  <ol>
                    <li>فتح واتساب يدوياً</li>
                    <li>إضافة الرقم: ${phoneNumber}</li>
                    <li>نسخ رابط المنتج (تم نسخه تلقائياً)</li>
                  </ol>
                  <p class="text-muted small">يمكنك أيضاً المحاولة مرة أخرى أو استخدام واتساب ويب.</p>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                  <a href="${waWebUrl}" target="_blank" class="btn btn-success">
                    <i class="bi bi-whatsapp me-1"></i>
                    فتح واتساب ويب
                  </a>
                </div>
              </div>
            </div>
          `;
          document.body.appendChild(errorModal);
          const bsModal = new bootstrap.Modal(errorModal);
          bsModal.show();
          errorModal.addEventListener('hidden.bs.modal', () => errorModal.remove());
        } finally {
          // Reset button state
          contactAboutProductBtn.disabled = false;
          contactAboutProductBtn.innerHTML = `<i class="bi bi-whatsapp me-2"></i>تواصل معنا بشأن المنتج`;
        }
      });
    }

    // --- RELATED PRODUCTS ---
    renderRelatedProducts(product);
    loadAllCategoriesAndRenderShortcuts();

    // --- OPTIONAL PARAGRAPHS ---
    const dynamicParasContainer = document.getElementById('product-dynamic-paragraphs');
    if (dynamicParasContainer) {
      dynamicParasContainer.innerHTML = ''; // Prevent duplicates
      if (product.paragraphs && Array.isArray(product.paragraphs) && product.paragraphs.length > 0) {
        product.paragraphs.forEach(p => {
          const itemDiv = document.createElement('div');
          itemDiv.className = "col-12 mt-3 p-0 bg-transparent border-0 shadow-none";

          if (p.title) {
            const titleEl = document.createElement('h6');
            titleEl.className = "fw-bold mb-2";
            titleEl.style.color = p.color || "var(--military-green)";
            titleEl.textContent = p.title;
            titleEl.style.fontSize = "1.1rem";
            itemDiv.appendChild(titleEl);
          }

          const contentEl = document.createElement('div');
          contentEl.className = "text-muted";
          contentEl.style.fontSize = "0.95rem";
          contentEl.style.lineHeight = "1.6";
          const sanitizedContent = (p.content || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
          contentEl.innerHTML = sanitizedContent;
          itemDiv.appendChild(contentEl);

          dynamicParasContainer.appendChild(itemDiv);
        });
      } else {
        dynamicParasContainer.style.display = 'none';
      }
    }

    loadReviews(productId);

    // Fade in secondary content now that everything is loaded
    const elementsToReveal = [
      document.getElementById('product-secondary-content'),
      document.getElementById('product-breadcrumb-nav'),
      document.getElementById('sticky-order-btn')
    ];
    elementsToReveal.forEach(el => {
      if (el) {
        el.style.display = 'block';
        // Slight delay to allow display:block to apply before changing opacity
        setTimeout(() => {
          el.style.opacity = '1';
        }, 50);
      }
    });

    // Auto-refresh disabled - service worker removed
    // Note: Service worker functionality has been removed for better performance
    // enableAutoRefresh(); // Removed - no longer needed
  } catch (error) {
    console.error('Error loading product details:', error);
    hideGlobalLoadingSpinner();

    // Enhanced error display
    const errorContainer = document.getElementById('product-detail-container');
    errorContainer.innerHTML = `
      <div class="alert alert-danger text-center" role="alert">
        <div class="mb-3">
          <i class="bi bi-exclamation-triangle-fill" style="font-size: 2rem; color: #dc3545;"></i>
        </div>
        <h4 class="alert-heading">حدث خطأ أثناء تحميل المنتج</h4>
        <p class="mb-3">${error.message || 'تعذر تحميل تفاصيل المنتج. يرجى المحاولة مرة أخرى.'}</p>
        <hr>
        <div class="d-flex justify-content-center gap-2">
          <button class="btn btn-primary" onclick="window.location.reload()">
            <i class="bi bi-arrow-clockwise me-1"></i>إعادة المحاولة
          </button>
          <button class="btn btn-secondary" onclick="window.location.href='/products'">
            <i class="bi bi-arrow-left me-1"></i>العودة للمنتجات
          </button>
        </div>
      </div>
    `;

    // Update page meta for error case
    document.title = "Omervita - خطأ في تحميل المنتج";

    // Update breadcrumb for error case
    const breadcrumbContainer = document.getElementById('product-breadcrumb');
    if (breadcrumbContainer) {
      breadcrumbContainer.innerHTML = `
        <li class="breadcrumb-item"><a href="/"><i class="bi bi-house me-1"></i>الرئيسية</a></li>
        <li class="breadcrumb-item"><a href="/products"><i class="bi bi-shop me-1"></i>المنتجات</a></li>
        <li class="breadcrumb-item active" aria-current="page">خطأ في التحميل</li>
      `;
    }
  } finally {
    hideGlobalLoadingSpinner();
  }
}


// Show 3 related products in the same category
async function renderRelatedProducts(product) {
  // Find all category IDs for this product
  const mainCatIds = (product.categories || []).map(cat => cat.id);
  const relatedProductsRow = document.getElementById('related-products-row');

  if (!relatedProductsRow) {
    console.warn('Related products container not found');
    return;
  }

  if (!mainCatIds.length) {
    relatedProductsRow.innerHTML = '';
    return;
  }

  // We'll use only the first category for backend query (as the API supports single category param)
  const mainCat = mainCatIds[0];
  try {
    // Cache strategy for related products
    const relatedCacheKey = `related_products_${mainCat}`;
    const cachedRelated = CacheManager.get(relatedCacheKey, 10 * 60 * 1000); // 10 minutes

    let products;
    if (cachedRelated) {
      products = cachedRelated;
    } else {
      const resp = await fetch(`/api/products?category=${mainCat}&limit=10`, {
        headers: {
          'Cache-Control': 'public, max-age=600', // 10 minutes
        }
      });
      products = await resp.json();
      CacheManager.set(relatedCacheKey, products);
    }

    // Filter out products that are NOT in any of the current product's categories 
    products = products.filter(p =>
      p.id !== product.id &&
      Array.isArray(p.categories) &&
      p.categories.some(cat => mainCatIds.includes(cat.id))
    );

    if (!products.length) {
      relatedProductsRow.innerHTML = '';
      return;
    }
    // Only last 6 (skip current, already filtered)
    products = products.slice(0, 6);

    relatedProductsRow.innerHTML = `
  <div class="related-products-box my-4">
    <h4 class="mb-3" style="color:var(--military-green,#715100);"><i class="bi bi-grid-3x3-gap me-2"></i>منتجات مشابهة</h4>
    <div class="row g-3">
      ${products.map((p, index) => `
        <div class="col-6 col-md-4 col-lg-2">
          <div class="card related-product-card h-100 shadow-sm border-0" style="border-radius: 12px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;">
            <a href="/products/${p.slug || SlugUtil.generateProductSlug(p)}" class="text-decoration-none d-block">
              <div class="position-relative">
                <img src="${(p.thumbnail || 'images/default-product.jpg')}" class="card-img-top related-product-img" alt="${p.name}" loading="lazy" style="object-fit: cover; aspect-ratio: 1/1; width: 100%;">
              </div>
            </a>
            <div class="card-body d-flex flex-column p-3 text-center bg-white">
              <a href="/products/${p.slug || SlugUtil.generateProductSlug(p)}" class="text-decoration-none text-dark">
                <h5 class="card-title text-truncate mb-2" style="font-size:0.85rem;font-weight:700;" title="${p.name}">${p.name}</h5>
              </a>
              <div class="mt-auto">
                <span class="d-block mb-2" style="color:var(--orange-accent,#ffbf00);font-weight:800;font-size:1.05rem;">دج${p.price}</span>
                ${p.stock > 0 ? `
                  <button class="btn btn-sm w-100 fw-bold add-to-cart-related" data-index="${index}" style="background-color: var(--orange-accent, #ffbf00); color: #333; border-radius: 8px; font-size: 0.85rem; transition: background-color 0.2s;">
                    <i class="bi bi-cart-plus me-1"></i> أضف للسلة
                  </button>
                ` : `
                  <button class="btn btn-sm w-100 fw-bold" disabled style="background-color: #dc3545; color: #fff; border-radius: 8px; font-size: 0.85rem; cursor: not-allowed;">
                    <i class="bi bi-x-octagon-fill me-1"></i> المنتج غير متوفر
                  </button>
                `}
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>
`;

    // Add event listeners for the "Add to cart" buttons in related products
    const addToCartBtns = relatedProductsRow.querySelectorAll('.add-to-cart-related');
    addToCartBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const productIndex = parseInt(btn.getAttribute('data-index'), 10);
        const selectedProduct = products[productIndex];
        const productId = selectedProduct.id || selectedProduct._id;

        // Add to local storage cart
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existingItem = cart.find(item => (item.id || item._id) === productId);

        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          cart.push({
            id: productId,
            name: selectedProduct.name,
            price: selectedProduct.price,
            thumbnail: selectedProduct.thumbnail,
            quantity: 1
          });
        }

        localStorage.setItem('cart', JSON.stringify(cart));

        if (typeof updateCartCount === 'function') updateCartCount();
        if (typeof updateCartCounter === 'function') updateCartCounter();

        // Show the cart popup modal reusing the same function used on the main product page
        if (typeof showCartMessage === 'function') {
          showCartMessage('<i class="bi bi-check-circle-fill"></i> تم إضافة المنتج إلى السلة!', 'success', selectedProduct);
        }
      });
    });

  } catch (error) {
    console.error('Error loading related products:', error);
    const relatedProductsRow = document.getElementById('related-products-row');
    if (relatedProductsRow) {
      relatedProductsRow.innerHTML = `
        <div class="col-12">
          <div class="alert alert-light text-center" role="alert">
            <i class="bi bi-info-circle me-2"></i>
            <span>لا يمكن عرض المنتجات المرتبطة في الوقت الحالي</span>
          </div>
        </div>
      `;
    }
  }
}
//load reviews
async function loadReviews(productId) {
  try {
    // Cache reviews for better performance
    const reviewsCacheKey = `reviews_${productId}`;
    const cachedReviews = CacheManager.get(reviewsCacheKey, 3 * 60 * 1000); // 3 minutes

    let reviews;
    if (cachedReviews) {
      reviews = cachedReviews;
    } else {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        headers: {
          'Cache-Control': 'public, max-age=180', // 3 minutes
        }
      });
      reviews = await response.json();
      CacheManager.set(reviewsCacheKey, reviews);
    }
    const reviewsContainer = document.getElementById('reviews-container');
    const toggleBtn = document.getElementById('reviews-toggle-btn');
    reviewsContainer.innerHTML = '';
    toggleBtn.innerHTML = '';

    if (reviews.length === 0) {
      reviewsContainer.innerHTML = '<p>لا توجد تعليقات بعد.</p>';
      return;
    }

    let showingAll = false;
    function renderReviewBlocks(limit) {
      reviewsContainer.innerHTML = '';
      reviews.slice(0, limit).forEach(review => {
        const reviewDiv = document.createElement('div');
        reviewDiv.className = 'review-block mb-3 shadow-sm rounded px-3 py-2';
        reviewDiv.style.border = "1px solid #f2f2f2";
        reviewDiv.innerHTML = `
          <div class="d-flex align-items-center mb-1">
            <i class="bi bi-person-circle me-2 fs-5" style="color:var(--military-green,#715100);"></i>
            <span class="fw-bold me-2" style="color:var(--military-green,#715100); font-size:0.9em">${review.userName}</span>
            <span class="review-stars ms-auto">${renderStars(review.rating)}</span>
          </div>
          <p class="mb-2 ms-2">${review.comment}</p>
          <small class="ms-2 text-secondary"><i class="bi bi-clock me-1"></i>${new Date(review.created_at).toLocaleString()}</small>
        `;
        reviewsContainer.appendChild(reviewDiv);
      });
    }

    function updateToggleBtn() {
      if (reviews.length > 3) {
        toggleBtn.innerHTML = `
          <button id="show-more-reviews" class="btn btn-outline-primary btn-sm mb-2">
            <i class="bi bi-chevron-double-down"></i> عرض المزيد
          </button>
        `;
        document.getElementById('show-more-reviews').onclick = () => {
          renderReviewBlocks(reviews.length);
          toggleBtn.innerHTML = `
            <button id="show-less-reviews" class="btn btn-outline-secondary btn-sm mb-2">
              <i class="bi bi-chevron-double-up"></i> عرض أقل
            </button>
          `;
          document.getElementById('show-less-reviews').onclick = () => {
            renderReviewBlocks(3);
            updateToggleBtn();
          };
        };
      } else {
        toggleBtn.innerHTML = '';
      }
    }

    renderReviewBlocks(3);
    updateToggleBtn();
  } catch (error) {
    console.error('Error loading reviews:', error);
    const reviewsContainer = document.getElementById('reviews-container');
    if (reviewsContainer) {
      reviewsContainer.innerHTML = `
        <div class="alert alert-light text-center" role="alert">
          <i class="bi bi-chat-square-text me-2"></i>
          <span>لا يمكن عرض التعليقات في الوقت الحالي</span>
        </div>
      `;
    }
  }
}

function showCartMessage(message, type = 'success', product = null) {
  // Simple notification
  const container = document.getElementById('cart-message-container');
  const alertId = `alert-${Date.now()}`;
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.role = 'alert';
  alertDiv.id = alertId;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
  `;
  container.appendChild(alertDiv);
  setTimeout(() => {
    const alert = bootstrap.Alert.getOrCreateInstance(alertDiv);
    alert.close();
  }, 3000);

  // Enhanced cart popup
  if (product) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartPopupModal = new bootstrap.Modal(document.getElementById('cartPopupModal'));

    // Set product details
    document.getElementById('cartPopupProductName').textContent = product.name;
    document.getElementById('cartPopupProductPrice').textContent = `دج${product.price}`;
    const imgEl = document.getElementById('cartPopupProductImage');
    if (imgEl) {
      imgEl.src = product.thumbnail || 'images/default-product.jpg';
    }

    // Calculate cart total
    let total = 0;
    const itemsContainer = document.getElementById('cartPopupItemsList');
    itemsContainer.innerHTML = '';

    // Show cart items
    if (cart.length > 0) {
      cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        // Total price for cart is calculated elsewhere, wait, total is calculated here!
        total += itemTotal;

        const itemElement = document.createElement('div');
        itemElement.className = 'd-flex justify-content-between align-items-center mb-3 pb-2 border-bottom';
        itemElement.innerHTML = `
          <div class="d-flex align-items-center">
            <img src="${item.thumbnail || item.image || item.imagePath || 'images/default-product.jpg'}" alt="${item.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd;" class="me-2 ms-2">
            <div>
              <span class="fw-bold d-block" style="font-size: 0.9rem; color: #444;">${item.name}</span>
              <span class="text-muted" style="font-size: 0.8rem;">الكمية: ${item.quantity}</span>
            </div>
          </div>
          <span class="fw-bold text-dark" style="font-size: 0.95rem;">دج${itemTotal}</span>
        `;
        itemsContainer.appendChild(itemElement);
      });
    } else {
      itemsContainer.innerHTML = '<p class="text-center text-muted my-2">لا توجد منتجات في السلة</p>';
    }

    // Update total
    document.getElementById('cartPopupTotal').textContent = `دج${total}`;

    // Show the modal
    cartPopupModal.show();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadProductDetail();

  // Initialize or re-sync star rating
  if (typeof initStarRating === 'function') {
    initStarRating();
  }
});
//add review
document.getElementById('review-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const reviewMessageDiv = document.getElementById('review-message');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
  if (!token) {
    reviewMessageDiv.innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>يجب عليك تسجيل الدخول لترك تعليق.
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
    </div>`;
    return;
  }
  const rating = document.querySelector('input[name="rating"]:checked')?.value;
  const comment = document.getElementById('comment').value;
  if (!rating) {
    reviewMessageDiv.innerHTML = `<div class="alert alert-danger">يرجى اختيار تقييم.</div>`;
    return;
  }
  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>جاري الإرسال...';
    }
    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        product_id: productId,
        rating,
        comment
      })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'تعذر إضافة التعليق.');
    }
    reviewMessageDiv.innerHTML = `<div class="alert alert-success">${result.message}</div>`;
    e.target.reset();
    if (typeof initStarRating === 'function') {
      initStarRating();
    }
    loadReviews(productId);
    setTimeout(() => {
      reviewMessageDiv.innerHTML = '';
    }, 3000);
  } catch (error) {
    console.error('Error submitting review:', error);
    reviewMessageDiv.innerHTML = `<div class="alert alert-danger">خطأ: ${error.message}</div>`;
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  }
});

//helper to load all categories:
async function loadAllCategoriesAndRenderShortcuts(selectedCategories = []) {
  try {
    const row = document.getElementById('product-categories-row');

    // Cache categories for better performance
    const categoriesCacheKey = 'all_categories';
    const cachedCategories = CacheManager.get(categoriesCacheKey, 15 * 60 * 1000); // 15 minutes

    let allCategories;
    if (cachedCategories) {
      allCategories = cachedCategories;
    } else {
      const response = await fetch(`/api/categories`, {
        headers: {
          'Cache-Control': 'public, max-age=900', // 15 minutes
        }
      });
      allCategories = await response.json();
      CacheManager.set(categoriesCacheKey, allCategories);
    }

    // Show ALL categories as buttons, not just the ones the product belongs to
    if (allCategories && allCategories.length > 0) {
      const categoryButtons = allCategories.map(cat => {
        // Map category ID to known slug (same as index page)
        let categorySlug;
        switch (cat.id) {
          case 1: categorySlug = 'alanayh-alshar-1'; break;
          case 2: categorySlug = 'alanayh-alshrh-2'; break;
          case 3: categorySlug = 'aghdhyh-shyh-3'; break;
          case 4: categorySlug = 'altwal-4'; break;
          default: categorySlug = `category-${cat.id}`;
        }

        return `
          <a href="/categories/${categorySlug}" class="badge mx-1 shadow-sm text-decoration-none flex-shrink-0" style="background-color:var(--orange-accent,#ffbf00) !important;color:#555 !important;font-weight:600;font-size:0.85em;padding:.4em .8em;border-radius:8px; display:inline-flex; align-items:center;">
            <i class="bi bi-tag-fill me-1" style="color:#555;"></i>${cat.name}
          </a>
        `;
      }).join('');

      row.innerHTML = `
        <div class="col-12 d-flex flex-nowrap gap-2 mt-3" style="overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 10px; scrollbar-width: none;">
          ${categoryButtons}
        </div>
      `;
    } else {
      // If no categories found, hide the categories row
      row.innerHTML = '';
    }

    setupShareButton();
    // No need for setupCategoryLinks() - using simple HTML anchors like index page
  } catch (e) {
    console.error('Error in loadAllCategoriesAndRenderShortcuts:', e);
    // fallback: empty row
    document.getElementById('product-categories-row').innerHTML = '';
    setupShareButton();
  }
}

// Product share button: copies link to clipboard, shows Bootstrap toast
function setupShareButton() {
  setTimeout(() => {
    const shareBtn = document.getElementById('product-share-btn');
    if (!shareBtn) return;
    shareBtn.onclick = function () {
      const link = window.location.href;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(link).then(() => {
          showShareToast();
        }).catch(() => {
          fallbackShare(link);
        });
      } else {
        fallbackShare(link);
      }
    }
  }, 500);
}

function fallbackShare(link) {
  // Modern fallback without deprecated document.execCommand
  const temp = document.createElement('input');
  temp.value = link;
  temp.style.cssText = 'position:absolute;left:-9999px;opacity:0;pointer-events:none';
  document.body.appendChild(temp);
  temp.select();
  temp.setSelectionRange(0, temp.value.length); // Better mobile support

  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showShareToast('تم نسخ رابط المنتج!');
    } else {
      showManualCopyDialog(link);
    }
  } catch (err) {
    showManualCopyDialog(link);
  } finally {
    document.body.removeChild(temp);
  }
}

// Modern fallback dialog for manual copying
function showManualCopyDialog(text) {
  const modal = document.createElement('div');
  modal.className = 'modal fade show';
  modal.style.cssText = 'display: block; background: rgba(0,0,0,0.5);';
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">انسخ الرابط</h5>
        </div>
        <div class="modal-body text-center">
          <p>انسخ الرابط أدناه:</p>
          <input type="text" class="form-control" value="${text}" readonly onclick="this.select()">
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" onclick="this.closest('.modal').remove()">إغلاق</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Auto-select text and remove after 10 seconds
  const input = modal.querySelector('input');
  input.select();
  setTimeout(() => modal.remove(), 10000);
}

function showShareToast(message) {
  const toastEl = document.getElementById('share-toast');
  if (message) {
    toastEl.querySelector('.toast-body').innerHTML =
      `<i class="bi bi-clipboard-check me-2"></i> ${message}`;
  } else {
    toastEl.querySelector('.toast-body').innerHTML =
      `<i class="bi bi-clipboard-check me-2"></i> تم نسخ رابط المنتج!`;
  }
  toastEl.style.display = 'block';
  const toast = new bootstrap.Toast(toastEl);
  toast.show();
}

// Setup interactive mouse wheel zoom, drag pan, and click-outside-to-close
let zoomPanInitialized = false;
function setupImageModalZoomPan() {
  const modalEl = document.getElementById('imageModal');
  if (!modalEl || modalEl._zoomPanSetup) return;
  modalEl._zoomPanSetup = true;

  let scale = 1;
  let pointX = 0;
  let pointY = 0;
  let startX = 0;
  let startY = 0;
  let isPanning = false;
  let hasDragged = false;
  let dragOriginX = 0;
  let dragOriginY = 0;

  function getActiveImage() {
    const activeItem = modalEl.querySelector('.carousel-item.active');
    return activeItem ? activeItem.querySelector('img') : modalEl.querySelector('img');
  }

  function updateTransform(img) {
    if (!img) return;
    img.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
    img.style.cursor = scale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in';
  }

  function resetZoom() {
    scale = 1;
    pointX = 0;
    pointY = 0;
    isPanning = false;
    hasDragged = false;
    modalEl.querySelectorAll('.carousel-item img').forEach(img => {
      img.style.transform = 'translate(0px, 0px) scale(1)';
      img.style.cursor = 'zoom-in';
      img.style.transition = 'transform 0.2s ease-out';
    });
  }

  modalEl.addEventListener('show.bs.modal', resetZoom);
  modalEl.addEventListener('hidden.bs.modal', resetZoom);

  const carouselEl = modalEl.querySelector('#modalCarousel');
  if (carouselEl) {
    carouselEl.addEventListener('slide.bs.carousel', resetZoom);
  }

  // Click on any empty place outside the image closes the modal
  modalEl.addEventListener('click', (e) => {
    if (hasDragged) {
      hasDragged = false;
      return;
    }
    // Don't close if clicked on the image itself or interactive controls
    if (e.target.closest('img') || 
        e.target.closest('.btn-close-above-image') || 
        e.target.closest('.btn-close-lightbox') || 
        e.target.closest('.carousel-control-prev') || 
        e.target.closest('.carousel-control-next') || 
        e.target.closest('.image-zoom-hint')) {
      return;
    }
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) {
      modalInstance.hide();
    }
  });

  const modalBody = modalEl.querySelector('.modal-body');
  if (modalBody) {
    // Mouse wheel zoom
    modalBody.addEventListener('wheel', (e) => {
      e.preventDefault();
      const img = getActiveImage();
      if (!img) return;

      img.style.transition = 'transform 0.08s ease-out';
      const zoomFactor = 0.25;
      if (e.deltaY < 0) {
        scale = Math.min(scale + zoomFactor, 4);
      } else {
        scale = Math.max(scale - zoomFactor, 1);
      }
      if (scale === 1) {
        pointX = 0;
        pointY = 0;
      }
      updateTransform(img);
    }, { passive: false });

    // Drag to pan
    modalBody.addEventListener('mousedown', (e) => {
      dragOriginX = e.clientX;
      dragOriginY = e.clientY;
      hasDragged = false;
      if (e.button !== 0) return;
      const img = getActiveImage();
      if (!img || scale <= 1) return;

      e.preventDefault();
      isPanning = true;
      startX = e.clientX - pointX;
      startY = e.clientY - pointY;
      img.style.transition = 'none';
      updateTransform(img);
    });

    window.addEventListener('mousemove', (e) => {
      if (Math.hypot(e.clientX - dragOriginX, e.clientY - dragOriginY) > 6) {
        hasDragged = true;
      }
      if (!isPanning) return;
      const img = getActiveImage();
      if (!img) return;

      pointX = e.clientX - startX;
      pointY = e.clientY - startY;
      updateTransform(img);
    });

    window.addEventListener('mouseup', () => {
      if (!isPanning) return;
      isPanning = false;
      const img = getActiveImage();
      if (img) {
        img.style.transition = 'transform 0.2s ease-out';
        updateTransform(img);
      }
    });

    // Double click to toggle zoom
    modalBody.addEventListener('dblclick', (e) => {
      e.preventDefault();
      const img = getActiveImage();
      if (!img) return;

      img.style.transition = 'transform 0.25s ease-out';
      if (scale > 1) {
        scale = 1;
        pointX = 0;
        pointY = 0;
      } else {
        scale = 2.5;
      }
      updateTransform(img);
    });

    // Touch support (pinch zoom, drag & tap outside to close)
    let initialTouchDist = 0;
    let initialScale = 1;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchOriginX = 0;
    let touchOriginY = 0;

    modalBody.addEventListener('touchstart', (e) => {
      const img = getActiveImage();
      if (!img) return;

      if (e.touches.length === 2) {
        initialTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialScale = scale;
      } else if (e.touches.length === 1) {
        touchOriginX = e.touches[0].clientX;
        touchOriginY = e.touches[0].clientY;
        hasDragged = false;
        if (scale > 1) {
          isPanning = true;
          touchStartX = e.touches[0].clientX - pointX;
          touchStartY = e.touches[0].clientY - pointY;
          img.style.transition = 'none';
        }
      }
    }, { passive: true });

    modalBody.addEventListener('touchmove', (e) => {
      const img = getActiveImage();
      if (!img) return;

      if (e.touches.length === 2 && initialTouchDist > 0) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        scale = Math.min(Math.max((dist / initialTouchDist) * initialScale, 1), 4);
        if (scale === 1) {
          pointX = 0;
          pointY = 0;
        }
        updateTransform(img);
      } else if (e.touches.length === 1) {
        if (Math.hypot(e.touches[0].clientX - touchOriginX, e.touches[0].clientY - touchOriginY) > 8) {
          hasDragged = true;
        }
        if (isPanning) {
          pointX = e.touches[0].clientX - touchStartX;
          pointY = e.touches[0].clientY - touchStartY;
          updateTransform(img);
        }
      }
    }, { passive: false });

    modalBody.addEventListener('touchend', (e) => {
      if (isPanning) {
        isPanning = false;
        const img = getActiveImage();
        if (img) {
          img.style.transition = 'transform 0.2s ease-out';
          updateTransform(img);
        }
      }
      // Simple tap outside image closes on touch
      if (!hasDragged && e.changedTouches && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && !target.closest('img') && !target.closest('button') && !target.closest('.image-zoom-hint')) {
          const modalInstance = bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
      }
    });
  }
}

// Function to open image modal at specific slide
function openImageModal(startIndex = 0) {
  const modalEl = document.getElementById('imageModal');
  if (!modalEl) return;
  setupImageModalZoomPan();
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  const modalCarousel = document.getElementById('modalCarousel');
  if (modalCarousel) {
    const carousel = bootstrap.Carousel.getOrCreateInstance(modalCarousel, { interval: false, ride: false });
    carousel.to(startIndex);
  }
  modal.show();
}


// At top of your file - Extract product ID from URL (supports both clean URLs and legacy .html)
function getProductIdFromUrl() {
  // Check for clean URL pattern: /products/123
  const pathMatch = window.location.pathname.match(/\/products\/(\d+)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  // Fallback to query parameter: ?id=123
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

const urlParams = new URLSearchParams(window.location.search);
let productId = getProductIdFromUrl();

// After you load or display the product:
if (productId && !isNaN(parseInt(productId))) {
  const token = localStorage.getItem('token');
  fetch(`/api/products/${productId}/visit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    }
  });
}

// Update page SEO metadata
function updatePageSEO(product) {
  const title = `${product.name} - Omervita`;
  document.title = title;
  const cleanUrl = `https://omervita.com/products/${product.slug || SlugUtil.generateProductSlug(product)}`;
  const description = product.description ? `${product.description.substring(0, 155)}...` : `اشتري ${product.name} بأفضل سعر من Omervita. منتجات طبيعية عالية الجودة مع توصيل سريع.`;

  // Update basic meta tags
  SlugUtil.updatePageMeta(title, description, cleanUrl);

  // Update social media and structured data
  updateSocialMediaTags(product, title, description, cleanUrl);
  updateProductStructuredData(product, cleanUrl);
  updateBreadcrumbStructuredData(product, cleanUrl);

  // Update URL if coming from legacy page
  const currentPath = window.location.pathname;
  if (currentPath.includes('product-detail.html')) {
    // Update to clean URL now that server-side routing is working
    window.history.replaceState({}, '', `/products/${product.slug || SlugUtil.generateProductSlug(product)}`);
  }
}

// Update product structured data for better SEO
function updateProductStructuredData(product, url) {
  const productImage = getProductImageUrl(product);

  const structuredData = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    'name': product.name,
    'description': product.description || `منتج طبيعي عالي الجودة من Omervita`,
    'image': product.images && product.images.length > 0 ?
      product.images.map(img => img.startsWith('http') ? img : `https://omervita.com/${img.replace(/^\/+/, '')}`) :
      [productImage],
    'brand': {
      '@type': 'Brand',
      'name': 'Omervita',
      'url': 'https://omervita.com'
    },
    'manufacturer': {
      '@type': 'Organization',
      'name': 'Omervita',
      'url': 'https://omervita.com'
    },
    'sku': product.sku || `OMERVITA-${product.id}`,
    'mpn': product.mpn || product.sku || `OMERVITA-${product.id}`,
    'url': url,
    'offers': {
      '@type': 'Offer',
      'price': product.price || '0',
      'priceCurrency': 'DZD',
      'availability': product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      'url': url,
      'priceValidUntil': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
      'seller': {
        '@type': 'Organization',
        'name': 'Omervita',
        'url': 'https://omervita.com'
      },
      'shippingDetails': {
        '@type': 'OfferShippingDetails',
        'shippingRate': {
          '@type': 'MonetaryAmount',
          'value': '0',
          'currency': 'DZD'
        },
        'shippingDestination': {
          '@type': 'DefinedRegion',
          'addressCountry': 'DZ'
        }
      }
    }
  };

  // Add aggregate rating if available
  if (product.avgRating && product.reviewCount > 0) {
    structuredData.aggregateRating = {
      '@type': 'AggregateRating',
      'ratingValue': product.avgRating,
      'reviewCount': product.reviewCount,
      'bestRating': '5',
      'worstRating': '1'
    };
  }

  // Add category information
  if (product.categories && product.categories.length > 0) {
    structuredData.category = product.categories.map(cat => cat.name).join(', ');
  }

  // Add additional product properties
  if (product.weight) {
    structuredData.weight = {
      '@type': 'QuantitativeValue',
      'value': product.weight,
      'unitText': 'g'
    };
  }

  // Update or create product structured data script
  let jsonLdScript = document.getElementById('product-schema');
  if (!jsonLdScript) {
    jsonLdScript = document.createElement('script');
    jsonLdScript.id = 'product-schema';
    jsonLdScript.type = 'application/ld+json';
    document.head.appendChild(jsonLdScript);
  }
  jsonLdScript.textContent = JSON.stringify(structuredData, null, 2);
}

// Update breadcrumb navigation
function updateBreadcrumb(product) {
  const breadcrumbContainer = document.getElementById('product-breadcrumb');
  if (!breadcrumbContainer) return;
  const breadcrumbs = [
    { name: 'الرئيسية', url: '/', icon: 'bi-house' },
    { name: 'المنتجات', url: '/products', icon: 'bi-shop' }
  ];
  if (product.categories && product.categories.length > 0) {
    const category = product.categories[0];
    breadcrumbs.push({
      name: category.name,
      url: `/categories/${category.slug || SlugUtil.generateCategorySlug(category)}`,
      icon: 'bi-tag'
    });
  }
  breadcrumbs.push({ name: product.name, current: true });
  const breadcrumbHtml = breadcrumbs.map((crumb, index) => {
    if (crumb.current) {
      return `<li class="breadcrumb-item active" aria-current="page">${crumb.name}</li>`;
    } else {
      return `<li class="breadcrumb-item"><a href="${crumb.url}"><i class="${crumb.icon} me-1"></i>${crumb.name}</a></li>`;
    }
  }).join('');
  breadcrumbContainer.innerHTML = breadcrumbHtml;

  // Update breadcrumb structured data
  updateBreadcrumbStructuredData(product);
}

// Update breadcrumb structured data
function updateBreadcrumbStructuredData(product, url) {
  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'الصفحة الرئيسية',
        'item': 'https://omervita.com/'
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': 'المنتجات',
        'item': 'https://omervita.com/products'
      }
    ]
  };

  // Add category if available
  if (product.categories && product.categories.length > 0) {
    const category = product.categories[0];
    breadcrumbData.itemListElement.push({
      '@type': 'ListItem',
      'position': 3,
      'name': category.name,
      'item': `https://omervita.com/categories/${SlugUtil.generateCategorySlug(category)}`
    });

    // Add product as final item
    breadcrumbData.itemListElement.push({
      '@type': 'ListItem',
      'position': 4,
      'name': product.name,
      'item': url
    });
  } else {
    // Add product as final item
    breadcrumbData.itemListElement.push({
      '@type': 'ListItem',
      'position': 3,
      'name': product.name,
      'item': url
    });
  }

  // Update or create breadcrumb structured data
  let breadcrumbScript = document.getElementById('breadcrumb-schema');
  if (!breadcrumbScript) {
    breadcrumbScript = document.createElement('script');
    breadcrumbScript.id = 'breadcrumb-schema';
    breadcrumbScript.type = 'application/ld+json';
    document.head.appendChild(breadcrumbScript);
  }
  breadcrumbScript.textContent = JSON.stringify(breadcrumbData, null, 2);
}

// Update social media meta tags for rich previews
function updateSocialMediaTags(product, title, description, url) {
  // Get the best available image
  const productImage = getProductImageUrl(product);
  const siteName = 'Omervita';
  const priceText = product.price ? `${product.price} دج` : 'السعر غير متوفر';
  const availability = product.stock > 0 ? 'متوفر' : 'غير متوفر';
  const stockIndicator = product.stock > 0 ? '✅ متوفر' : '❌ غير متوفر';

  // Enhanced title and description for social media
  const socialTitle = `${product.name} - ${priceText} | Omervita`;
  const socialDescription = product.description ?
    `${product.description.substring(0, 180)}... | ${stockIndicator} - منتجات طبيعية عالية الجودة من Omervita 🌿` :
    `اشتري ${product.name} بأفضل سعر من Omervita. ${stockIndicator} - منتجات طبيعية عالية الجودة مع توصيل سريع 🚚`;

  // Update Open Graph tags
  const ogTags = [
    { property: 'og:title', content: socialTitle },
    { property: 'og:description', content: socialDescription },
    { property: 'og:image', content: productImage },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: `صورة المنتج: ${product.name}` },
    { property: 'og:url', content: url },
    { property: 'og:type', content: 'product' },
    { property: 'og:site_name', content: siteName },
    { property: 'og:locale', content: 'ar_DZ' },
    { property: 'product:price:amount', content: product.price || '0' },
    { property: 'product:price:currency', content: 'DZD' },
    { property: 'product:availability', content: availability },
    { property: 'product:condition', content: 'new' },
    { property: 'product:retailer_item_id', content: product.id },
    { property: 'product:item_group_id', content: product.categories?.[0]?.id || 'general' }
  ];

  // Add product category if available
  if (product.categories && product.categories.length > 0) {
    ogTags.push({ property: 'product:category', content: product.categories[0].name });
  }

  // Add product brand
  ogTags.push({ property: 'product:brand', content: 'Omervita' });

  // Update Twitter Card tags
  const twitterTags = [
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: socialTitle },
    { name: 'twitter:description', content: socialDescription },
    { name: 'twitter:image', content: productImage },
    { name: 'twitter:image:alt', content: `صورة المنتج: ${product.name}` },
    { name: 'twitter:site', content: '@omervita' },
    { name: 'twitter:creator', content: '@omervita' },
    { name: 'twitter:label1', content: 'السعر' },
    { name: 'twitter:data1', content: priceText },
    { name: 'twitter:label2', content: 'التوفر' },
    { name: 'twitter:data2', content: availability }
  ];

  // Update or create Open Graph tags
  ogTags.forEach(tag => {
    let ogTag = document.querySelector(`meta[property="${tag.property}"]`);
    if (!ogTag) {
      ogTag = document.createElement('meta');
      ogTag.property = tag.property;
      document.head.appendChild(ogTag);
    }
    ogTag.content = tag.content;
  });

  // Update or create Twitter Card tags
  twitterTags.forEach(tag => {
    let twitterTag = document.querySelector(`meta[name="${tag.name}"]`);
    if (!twitterTag) {
      twitterTag = document.createElement('meta');
      twitterTag.name = tag.name;
      document.head.appendChild(twitterTag);
    }
    twitterTag.content = tag.content;
  });

  // Update canonical URL
  let canonicalTag = document.querySelector('link[rel="canonical"]');
  if (!canonicalTag) {
    canonicalTag = document.createElement('link');
    canonicalTag.rel = 'canonical';
    document.head.appendChild(canonicalTag);
  }
  canonicalTag.href = url;

  // Optional: Trigger Facebook's Open Graph debugger to refresh cache
  // This helps ensure fresh data when sharing (useful for testing)
  if (window.FB && typeof window.FB.XFBML !== 'undefined') {
    window.FB.XFBML.parse();
  }
}

// Helper function to get the best available product image URL
function getProductImageUrl(product) {
  const baseUrl = 'https://omervita.com';

  // Check if product has images array
  if (product.images && product.images.length > 0) {
    const firstImage = product.images[0];
    // If image is already a full URL, return it
    if (firstImage.startsWith('http')) {
      return firstImage;
    }
    // Otherwise, construct the full URL
    return `${baseUrl}/${firstImage.replace(/^\/+/, '')}`;
  }

  // Check if product has imagePath
  if (product.imagePath) {
    if (product.imagePath.startsWith('http')) {
      return product.imagePath;
    }
    return `${baseUrl}/${product.imagePath.replace(/^\/+/, '')}`;
  }

  // Fall back to logo
  return `${baseUrl}/images/logo.png`;
}

// Performance Optimization: Lazy Loading Images
// This reduces initial page load by deferring non-critical image loading
function initLazyLoading() {
  // Modern browsers with Intersection Observer support
  if ('IntersectionObserver' in window) {
    const lazyImageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const lazyImage = entry.target;

          // For regular images
          if (lazyImage.dataset.src) {
            lazyImage.src = lazyImage.dataset.src;
            lazyImage.removeAttribute('data-src');
          }

          // For carousel images
          if (lazyImage.classList.contains('carousel-lazy-img') ||
            lazyImage.classList.contains('modal-lazy-img')) {
            if (lazyImage.dataset.src) {
              lazyImage.src = lazyImage.dataset.src;
              lazyImage.removeAttribute('data-src');
            }
          }

          // Add fade-in effect
          lazyImage.style.opacity = '0';
          lazyImage.style.transition = 'opacity 0.3s';
          lazyImage.onload = () => {
            lazyImage.style.opacity = '1';
          };

          lazyImage.classList.remove('lazy-load-img', 'carousel-lazy-img', 'modal-lazy-img');
          lazyImageObserver.unobserve(lazyImage);
        }
      });
    }, {
      // Load images 100px before they enter viewport
      rootMargin: '100px'
    });

    // Observe all lazy images
    const lazyImages = document.querySelectorAll('.lazy-load-img, .carousel-lazy-img, .modal-lazy-img');
    lazyImages.forEach(img => lazyImageObserver.observe(img));

    // Handle carousel slide changes for lazy loading
    const carousel = document.getElementById('productCarousel');
    if (carousel) {
      carousel.addEventListener('slide.bs.carousel', function () {
        // Load next slide image when transitioning
        const activeSlide = this.querySelector('.carousel-item.active');
        const nextSlide = activeSlide.nextElementSibling || this.querySelector('.carousel-item:first-child');
        const nextImg = nextSlide.querySelector('img[data-src]');
        if (nextImg) {
          nextImg.src = nextImg.dataset.src;
          nextImg.removeAttribute('data-src');
        }
      });
    }

    // Handle modal carousel for lazy loading
    const modalCarousel = document.getElementById('modalCarousel');
    if (modalCarousel) {
      modalCarousel.addEventListener('slide.bs.carousel', function () {
        const activeSlide = this.querySelector('.carousel-item.active');
        const nextSlide = activeSlide.nextElementSibling || this.querySelector('.carousel-item:first-child');
        const nextImg = nextSlide.querySelector('img[data-src]');
        if (nextImg) {
          nextImg.src = nextImg.dataset.src;
          nextImg.removeAttribute('data-src');
        }
      });
    }
  } else {
    // Fallback for older browsers - load all images immediately
    const lazyImages = document.querySelectorAll('.lazy-load-img, .carousel-lazy-img, .modal-lazy-img');
    lazyImages.forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
    });
  }
}

// Performance Optimization: Optimize YouTube embeds
// Only load YouTube videos when they become visible
function optimizeYouTubeEmbeds() {
  const youtubeIframes = document.querySelectorAll('iframe[data-src*="youtube.com"]');

  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const iframe = entry.target;
          iframe.src = iframe.dataset.src;
          iframe.removeAttribute('data-src');
          observer.unobserve(iframe);
        }
      });
    }, {
      rootMargin: '50px'
    });

    youtubeIframes.forEach(iframe => videoObserver.observe(iframe));
  } else {
    // Fallback - load immediately
    youtubeIframes.forEach(iframe => {
      if (iframe.dataset.src) {
        iframe.src = iframe.dataset.src;
        iframe.removeAttribute('data-src');
      }
    });
  }
}

// Performance Optimization: Image preloading for better UX
function preloadCriticalImages() {
  // Only preload the first image and next image for better performance
  const firstCarouselImg = document.querySelector('.carousel-item.active img[data-src]');
  if (firstCarouselImg) {
    firstCarouselImg.src = firstCarouselImg.dataset.src;
    firstCarouselImg.removeAttribute('data-src');
  }

  // Preload next slide image
  const secondSlide = document.querySelector('.carousel-item:nth-child(2) img[data-src]');
  if (secondSlide) {
    const preloadImg = new Image();
    preloadImg.onload = () => {
      secondSlide.src = secondSlide.dataset.src;
      secondSlide.removeAttribute('data-src');
    };
    preloadImg.src = secondSlide.dataset.src;
  }
}

// Performance Optimization: Modern Cache Management System
const CacheManager = {
  get(key, maxAge) {
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const data = JSON.parse(cached);
      const isExpired = Date.now() - data.timestamp > maxAge;

      if (isExpired) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }
      return data.value;
    } catch (error) {
      console.warn('Cache read error:', error);
      return null;
    }
  },

  set(key, value) {
    try {
      const data = { value, timestamp: Date.now() };
      localStorage.setItem(`cache_${key}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Cache write error:', error);
      this.cleanup();
    }
  },

  cleanup() {
    try {
      const cacheKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('cache_'));

      if (cacheKeys.length > 20) {
        cacheKeys.forEach(key => {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            const age = Date.now() - data.timestamp;
            if (age > 30 * 60 * 1000) { // 30 minutes
              localStorage.removeItem(key);
            }
          } catch {
            localStorage.removeItem(key);
          }
        });
      }
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }
};

// Performance Optimization: Modern Resource Management
const ResourceManager = {
  async preloadEndpoints() {
    const endpoints = ['/api/categories', '/api/branding'];

    // Use Promise.all for parallel preloading but don't block execution
    Promise.all(
      endpoints.map(endpoint =>
        fetch(endpoint, { headers: { 'Cache-Control': 'public, max-age=900' } })
          .catch(() => { }) // Ignore preload failures
      )
    );
  },

  initCleanupListeners() {
    // Clean cache before page unload
    window.addEventListener('beforeunload', CacheManager.cleanup);

    // Periodic cleanup every 10 minutes
    setInterval(CacheManager.cleanup, 10 * 60 * 1000);
  }
};

// Initialize all modern performance optimizations
const initAllOptimizations = () => {
  // Start modern resource management
  ResourceManager.preloadEndpoints();
  ResourceManager.initCleanupListeners();

  // Clean old cache immediately
  setTimeout(CacheManager.cleanup, 1000);

  // Initialize performance features
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        initLazyLoading();
        optimizeYouTubeEmbeds();
        preloadCriticalImages();
      }, 100);
    });
  } else {
    setTimeout(() => {
      initLazyLoading();
      optimizeYouTubeEmbeds();
      preloadCriticalImages();
    }, 100);
  }
};

// Start all optimizations
initAllOptimizations();



// Back to Top Button Logic
document.addEventListener('DOMContentLoaded', () => {
  const backToTopBtn = document.getElementById('back-to-top-btn');
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      // Show button after scrolling down 300px
      if (window.scrollY > 300) {
        backToTopBtn.classList.add('show');
      } else {
        backToTopBtn.classList.remove('show');
      }
    });

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
});
window.scrollTo({
  top: 0,
  behavior: 'smooth'
});

// =====================================================
// === PAGE INITIALIZATION ===
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  loadProductDetail();
});
