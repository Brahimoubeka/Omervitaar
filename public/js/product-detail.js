// Helper function to render star ratings as 5 classic yellow stars
function renderStars(rating) {
  let starsHtml = '';
  for (let i = 1; i <= 5; i++) {
    starsHtml += `<span class="star" style="font-size:1.3em; color: ${i <= rating ? '#ffc107' : '#e4e5e9'};">&#9733;</span>`;
  }
  return starsHtml;
}

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

// Helper function to render product description with expandable functionality
function renderProductDescription(description, container) {
  if (!description || description.trim() === '') {
    container.innerHTML = '<p class="text-muted mt-2 mb-3 fs-6"><i class="bi bi-info-circle me-1"></i> لا يوجد وصف.</p>';
    return;
  }

  // Check if description is longer than 30 characters
  const isLongDescription = description.length > 30;
  const shortDescription = isLongDescription ? description.substring(0, 220) + '...' : description;

  // Create description container
  const descriptionContainer = document.createElement('div');
  descriptionContainer.className = 'product-description-container mt-2 mb-3';
  
  // Create the description text element
  const descriptionText = document.createElement('div');
  descriptionText.className = 'product-description-text';
  descriptionText.id = 'product-description-content';
  descriptionText.style.cssText = `
    word-break: break-word;
    white-space: pre-line;
    height: 200px;
    overflow: ${isLongDescription ? 'hidden' : 'auto'};
    border: 2px solidrgb(0, 0, 0);
    border-radius: 8px;
    padding: 12px;
    background: #f8f9fa;
  `;
  descriptionText.innerHTML = `<i class="bi bi-info-circle me-1"></i> ${isLongDescription ? shortDescription : description}`;

  // Create toggle button container
  const toggleContainer = document.createElement('div');
  toggleContainer.className = 'description-toggle-container mt-2';
  toggleContainer.id = 'description-toggle-container';

  if (isLongDescription) {
    let isExpanded = false;
    
    function updateToggleButton() {
      toggleContainer.innerHTML = `
        <button id="description-toggle-btn" class="btn btn-outline-primary btn-sm">
          <i class="bi bi-chevron-double-${isExpanded ? 'up' : 'down'}"></i> 
          ${isExpanded ? 'عرض أقل' : 'اقرأ المزيد'}
        </button>
      `;
      
      // Use setTimeout to ensure DOM is updated before adding event listener
      setTimeout(() => {
        const toggleBtn = document.getElementById('description-toggle-btn');
        if (toggleBtn) {
          toggleBtn.addEventListener('click', () => {
            isExpanded = !isExpanded;
            const content = document.getElementById('product-description-content');
            
            if (content) {
              if (isExpanded) {
                content.style.overflow = 'auto';
                content.innerHTML = `<i class="bi bi-info-circle me-1"></i> ${description}`;
              } else {
                content.style.overflow = 'hidden';
                content.innerHTML = `<i class="bi bi-info-circle me-1"></i> ${shortDescription}`;
              }
            }
            
            updateToggleButton();
          });
        }
      }, 0);
    }
    
    updateToggleButton();
  }

  descriptionContainer.appendChild(descriptionText);
  if (isLongDescription) {
    descriptionContainer.appendChild(toggleContainer);
  }
  
  container.appendChild(descriptionContainer);
}

// Helper function to extract YouTube video IDs from a text
function extractYouTubeLinks(text) {
  const ytRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_\-]+))/g;
  const links = [];
  let match;
  while ((match = ytRegex.exec(text)) !== null) {
    let url = match[1];
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split(/[?&]/)[0];
    } else if (url.includes('v=')) {
      videoId = url.split('v=')[1].split(/[&?]/)[0];
    }
    if (videoId) {
      links.push(videoId);
    }
  }
  return links;
}

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
(function addProductDetailSkeletonStyles() {
  if (document.getElementById('skeleton-detail-styles')) return;
  const style = document.createElement('style');
  style.id = 'skeleton-detail-styles';
  style.textContent = `
    .skeleton-detail-img { width: 100%; height: 400px; background: #e0e0e0; border-radius: 18px; animation: skeletonPulse 1.2s infinite ease-in-out; }
    .skeleton-detail-title { height: 36px; width: 70%; background: #e0e0e0; border-radius: 10px; animation: skeletonPulse 1.2s infinite ease-in-out; }
    .skeleton-detail-price { height: 24px; width: 30%; background: #e0e0e0; border-radius: 8px; animation: skeletonPulse 1.2s infinite ease-in-out; }
    .skeleton-detail-rating { height: 22px; width: 40%; background: #e0e0e0; border-radius: 8px; animation: skeletonPulse 1.2s infinite ease-in-out; }
    .skeleton-detail-badges { height: 18px; width: 50%; background: #e0e0e0; border-radius: 8px; animation: skeletonPulse 1.2s infinite ease-in-out; }
    .skeleton-detail-desc { height: 90px; width: 100%; background: #e0e0e0; border-radius: 12px; animation: skeletonPulse 1.2s infinite ease-in-out; }
    .skeleton-detail-btn { height: 48px; background: #e0e0e0; border-radius: 12px; animation: skeletonPulse 1.2s infinite ease-in-out; }
    @keyframes skeletonPulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    @media (max-width: 991px) { .skeleton-detail-img { height: 230px; } }
  `;
  document.head.appendChild(style);
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
    // Add cache-busting timestamp to ensure fresh product data
    const response = await fetch(`/api/products/${productId}?_t=${Date.now()}`);
    if (!response.ok) throw new Error('المنتج غير موجود.');
    const product = await response.json();

    // Store product data globally for button functionality
    window.currentProduct = product;

    // Update page SEO and URL
    updatePageSEO(product);
    updateBreadcrumb(product);

    let images = [];
    try {
      const imagesResp = await fetch(`/api/products/${product.id}/images`);
      images = await imagesResp.json();
    } catch { images = []; }
    if (!images || images.length === 0) images = [product.imagePath || 'images/default-product.jpg'];

    // --- YouTube: Extract video IDs from description ---
    const youTubeVideoIds = extractYouTubeLinks(product.description || '');

    // --- Build slides: images first, then videos ---
    const carouselSlides = [
      ...images.map((src, idx) => ({
        type: 'image',
        content: `<img src="${src}" class="d-block w-100 h-100 product-zoom" alt="صورة المنتج ${idx+1}" style="cursor: zoom-in;" onclick="openImageModal(${idx})" title="انقر لتكبير الصورة" loading="lazy">`
      })),
      ...youTubeVideoIds.map((vid, idx) => ({
        type: 'youtube',
        content: `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${vid}" frameborder="0" allowfullscreen style="border-radius:14px;max-width:100%;height:100%;background:#000"></iframe>`
      }))
    ];

    // --- Carousel with modal functionality ---
    const imgCol = document.getElementById('product-image-carousel-col');
    imgCol.innerHTML = `
      <div class="product-carousel-box">
        <div id="productCarousel" class="carousel slide w-100 h-100" data-bs-ride="carousel">
          <div class="carousel-inner h-100">
            ${carouselSlides.map((slide, idx) => `
              <div class="carousel-item h-100${idx === 0 ? ' active' : ''}">
                ${slide.content}
              </div>
            `).join('')}
          </div>
          ${carouselSlides.length > 1 ? `
          <button class="carousel-control-prev" type="button" data-bs-target="#productCarousel" data-bs-slide="prev">
            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Previous</span>
          </button>
          <button class="carousel-control-next" type="button" data-bs-target="#productCarousel" data-bs-slide="next">
            <span class="carousel-control-next-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Next</span>
          </button>
          ` : ''}
        </div>
      </div>

      <!-- Image Modal -->
      <div class="modal fade" id="imageModal" tabindex="-1" aria-labelledby="imageModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-centered">
          <div class="modal-content bg-dark">
            <div class="modal-header border-0">
              <h5 class="modal-title text-white" id="imageModalLabel">
                <i class="bi bi-images me-2"></i>صور المنتج
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="إغلاق"></button>
            </div>
            <div class="modal-body p-0">
              <div id="modalCarousel" class="carousel slide" data-bs-ride="carousel">
                <div class="carousel-inner">
                  ${images.map((src, idx) => `
                    <div class="carousel-item${idx === 0 ? ' active' : ''}">
                      <div class="d-flex justify-content-center align-items-center" style="height: 70vh;">
                        <img src="${src}" class="img-fluid" alt="Product Image ${idx+1}" loading="lazy" 
                             style="max-height: 100%; max-width: 100%; object-fit: contain;">
                      </div>
                    </div>
                  `).join('')}
                </div>
                ${images.length > 1 ? `
                <button class="carousel-control-prev" type="button" data-bs-target="#modalCarousel" data-bs-slide="prev">
                  <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                  <span class="visually-hidden">Previous</span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#modalCarousel" data-bs-slide="next">
                  <span class="carousel-control-next-icon" aria-hidden="true"></span>
                  <span class="visually-hidden">Next</span>
                </button>
                ` : ''}
              </div>
            </div>
            <div class="modal-footer border-0 justify-content-center">
              <div class="d-flex align-items-center text-white">
                <i class="bi bi-info-circle me-2"></i>
                <span>يمكنك التكبير بعجلة الفأرة والتحريك بالسحب</span>
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
          switch(cat.id) {
            case 1: categorySlug = 'alanayh-alshar-1'; break;
            case 2: categorySlug = 'alanayh-alshrh-2'; break;
            case 3: categorySlug = 'aghdhyh-shyh-3'; break;
            case 4: categorySlug = 'altwal-4'; break;
            default: categorySlug = `category-${cat.id}`;
          }
          return `<a href="/categories/${categorySlug}" class="badge bg-success mx-1 text-decoration-none" style="background:var(--orange-accent,#ffbf00);color:var(--dark-charcoal,#2c2c2c);font-weight:500;font-size:0.91em;padding:.32em .62em;letter-spacing:.02em;"><i class="bi bi-tag"></i> ${cat.name}</a>`;
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

    // Description with expandable functionality
    renderProductDescription(product.description || '', detailsCol);

    // Add to Cart Button 
    const addToCartButton = document.createElement('button');
    addToCartButton.innerHTML = `<i class="bi bi-cart-plus me-1"></i>أضف إلى السلة`;
    addToCartButton.classList.add('btn', 'btn-primary', 'mt-3', 'px-4', 'py-2', 'add-to-cart-btn');
    if (product.stock === 0) {
      addToCartButton.disabled = true;
      addToCartButton.style.opacity = '.6';
      addToCartButton.style.cursor = 'not-allowed';
    }
    addToCartButton.addEventListener('click', () => {
      let cart = JSON.parse(localStorage.getItem('cart')) || [];
      const existingProduct = cart.find(item => item.id === product.id);
      if (existingProduct) {
        existingProduct.quantity += 1;
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1
        });
      }
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartCounter();
      
      // Show enhanced cart popup with product info
      showCartMessage('<i class="bi bi-check-circle-fill"></i> تم إضافة المنتج إلى السلة!', 'success', product);
    });
    detailsCol.appendChild(addToCartButton);

    // Go to Cart Button
    const goToCartButton = document.createElement('button');
    goToCartButton.innerHTML = `<i class="bi bi-cart me-1"></i>سلتي`;
    goToCartButton.classList.add('btn', 'btn-outline-secondary', 'mt-3', 'ms-2', 'px-4', 'py-2');
    goToCartButton.addEventListener('click', () => {
      window.location.href = '/cart';
    });
    detailsCol.appendChild(goToCartButton);

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
    
    // Contact About Product Button - copies product URL and opens WhatsApp
    const contactAboutProductBtn = document.getElementById('contact-about-product-btn');
    if (contactAboutProductBtn) {
      contactAboutProductBtn.addEventListener('click', async () => {
        try {
          // Get WhatsApp number from branding API
          const brandingResponse = await fetch('/api/branding');
          const branding = await brandingResponse.json();
          let whatsappNumber = branding.phone || '+905518560018'; // Fallback number
          
          // Clean and validate phone number
          let cleanPhoneNumber = whatsappNumber.replace(/[^0-9]/g, '');
          
          // Ensure phone number starts with country code
          if (!cleanPhoneNumber.startsWith('90') && !cleanPhoneNumber.startsWith('966') && !cleanPhoneNumber.startsWith('213')) {
            // If no country code detected, assume Turkish number
            if (cleanPhoneNumber.length === 10) {
              cleanPhoneNumber = '90' + cleanPhoneNumber;
            }
          }
          
          console.log('Using WhatsApp number:', cleanPhoneNumber); // Debug log
          
          // Get current product URL
          const productUrl = window.location.href;
          
          // Create WhatsApp message
          const message = encodeURIComponent(`عندي استفسار بشأن المنتج: ${productUrl}`);
          
          // Copy URL to clipboard (optional, for user convenience)
          try {
            await navigator.clipboard.writeText(productUrl);
          } catch (err) {
            // Clipboard API might not work in some browsers
            console.log('Could not copy to clipboard:', err);
          }
          
          // Create WhatsApp URL with comprehensive mobile detection
          let whatsappUrl;
          
          // Enhanced mobile detection using multiple methods
          const userAgent = navigator.userAgent.toLowerCase();
          const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) || 
                           window.innerWidth <= 768 || 
                           'ontouchstart' in window ||
                           navigator.maxTouchPoints > 0;
          
          const isAndroid = /android/i.test(userAgent);
          const isIOS = /iphone|ipad|ipod/i.test(userAgent);
          
          console.log('Device detection:', { isMobile, isAndroid, isIOS, userAgent }); // Debug log
          
          // Create appropriate WhatsApp URL based on device
          if (isMobile) {
            whatsappUrl = `https://wa.me/${cleanPhoneNumber}?text=${message}`;
          } else {
            whatsappUrl = `https://wa.me/${cleanPhoneNumber}?text=${message}`;
          }
          
          // Try to open WhatsApp with multiple fallback strategies
          try {
            if (isMobile) {
              // Strategy 1: Direct click simulation (most reliable on mobile)
              const tempLink = document.createElement('a');
              tempLink.href = whatsappUrl;
              tempLink.style.display = 'none';
              tempLink.target = '_blank';
              tempLink.rel = 'noopener noreferrer';
              document.body.appendChild(tempLink);
              
              // Use both click and programmatic opening
              tempLink.click();
              
              // Clean up
              setTimeout(() => {
                if (document.body.contains(tempLink)) {
                  document.body.removeChild(tempLink);
                }
              }, 100);
              
              // Strategy 2: Direct window.open as backup (with delay)
              setTimeout(() => {
                try {
                  if (isIOS) {
                    // For iOS, try the app scheme first, then web
                    window.location.href = `whatsapp://send?phone=${cleanPhoneNumber}&text=${message}`;
                    setTimeout(() => {
                      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                    }, 1500);
                  } else {
                    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                  }
                } catch (e) {
                  console.log('Fallback strategy failed:', e);
                  // Final fallback for mobile
                  window.location.href = whatsappUrl;
                }
              }, 500);
              
            } else {
              // For desktop, standard window.open
              window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
            }
          } catch (error) {
            console.log('Primary WhatsApp open failed, trying ultimate fallback:', error);
            // Ultimate fallback: multiple attempts
            try {
              window.open(`https://web.whatsapp.com/send?phone=${cleanPhoneNumber}&text=${message}`, '_blank');
            } catch (finalError) {
              // Last resort: navigate to WhatsApp web
              window.location.href = `https://web.whatsapp.com/send?phone=${cleanPhoneNumber}&text=${message}`;
            }
          }
          
        } catch (error) {
          console.error('Error opening WhatsApp:', error);
          
          // Show user-friendly error message with multiple options
          const productUrl = window.location.href;
          const message = encodeURIComponent(`عندي استفسار بشأن المنتج: ${productUrl}`);
          
          // Create fallback options
          const webWhatsappUrl = `https://web.whatsapp.com/send?phone=${cleanPhoneNumber}&text=${message}`;
          const waUrl = `https://wa.me/${cleanPhoneNumber}?text=${message}`;
          
          // Show user options
          const userChoice = confirm(
            'لم نتمكن من فتح واتساب تلقائياً. هل تريد المحاولة مرة أخرى؟\n\n' +
            'اضغط "موافق" للمحاولة مرة أخرى\n' +
            'اضغط "إلغاء" لنسخ رابط المنتج يدوياً'
          );
          
          if (userChoice) {
            // Try alternative WhatsApp URL
            window.open(waUrl, '_blank');
          } else {
            // Copy URL and show instructions
            try {
              await navigator.clipboard.writeText(productUrl);
              alert(`تم نسخ رابط المنتج!\n\nيمكنك الآن:\n1. فتح واتساب\n2. إرسال رسالة للرقم: ${whatsappNumber}\n3. لصق الرابط في الرسالة`);
            } catch (err) {
              alert(`رقم واتساب للتواصل: ${whatsappNumber}\n\nيمكنك نسخ هذا الرابط ولصقه في واتساب:\n${productUrl}`);
            }
          }
        }
      });
    }

    // --- RELATED PRODUCTS ---
    renderRelatedProducts(product);
    loadAllCategoriesAndRenderShortcuts();

    loadReviews(productId);
    
    // Auto-refresh disabled - service worker removed
    console.log('🔄 Auto-refresh disabled - service worker and caching removed');
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
    // No more cache-busting needed since service worker is removed
    const resp = await fetch(`/api/products?category=${mainCat}&limit=6`);
    let products = await resp.json();

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
    // Only last 3 (skip current, already filtered)
    products = products.slice(0, 3);

    relatedProductsRow.innerHTML = `
  <div class="related-products-box my-4">
    <h4 class="mb-3" style="color:var(--military-green,#715100);"><i class="bi bi-grid-3x3-gap me-2"></i>منتجات مشابهة</h4>
    <div class="row g-3">
      ${products.map(p => `
        <div class="col-12 col-md-4">
          <a href="/products/${p.slug || SlugUtil.generateProductSlug(p)}" class="text-decoration-none">
            <div class="card related-product-card h-100 shadow-sm">
              <img src="${(p.thumbnail || 'images/default-product.jpg')}" class="card-img-top related-product-img">
              <div class="card-body d-flex flex-column py-2 px-2">
                <h5 class="card-title" style="color:var(--military-green,#715100);font-size:0.98em;font-weight:700">${p.name}</h5>
                <span style="color: rgb(255, 115, 0);font-weight:600;">دج${p.price}</span>
                <div class="mt-auto">
                  ${(p.categories || []).map(cat => {
                    // Map category ID to known slug (same as index page)
                    let categorySlug;
                    switch(cat.id) {
                      case 1: categorySlug = 'alanayh-alshar-1'; break;
                      case 2: categorySlug = 'alanayh-alshrh-2'; break;
                      case 3: categorySlug = 'aghdhyh-shyh-3'; break;
                      case 4: categorySlug = 'altwal-4'; break;
                      default: categorySlug = `category-${cat.id}`;
                    }
                    return `<a href="/categories/${categorySlug}" class="badge bg-light border text-dark me-1 text-decoration-none" style="font-size:0.90em;padding:.25em .48em;"><i class="bi bi-tag"></i> ${cat.name}</a>`;
                  }).join('')}
                </div>
              </div>
            </div>
          </a>
        </div>
      `).join('')}
    </div>
  </div>
`;

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
    // Add cache-busting timestamp to ensure fresh data
    const response = await fetch(`/api/products/${productId}/reviews?_t=${Date.now()}`);
    const reviews = await response.json();
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
            <i class="bi bi-person-circle me-2 fs-4" style="color:var(--military-green,#715100);"></i>
            <span class="fw-bold me-2" style="color:var(--military-green,#715100); font-size:1.09em">${review.userName}</span>
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
    
    // Calculate cart total
    let total = 0;
    const itemsContainer = document.getElementById('cartPopupItemsList');
    itemsContainer.innerHTML = '';
    
    // Show cart items (limited to 3)
    if (cart.length > 0) {
      const displayItems = cart.slice(0, 3);
      displayItems.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'd-flex justify-content-between align-items-center mb-2';
        itemElement.innerHTML = `
          <div>
            <span class="fw-medium">${item.name}</span>
            <span class="text-muted ms-2">x${item.quantity}</span>
          </div>
          <span>دج${itemTotal}</span>
        `;
        itemsContainer.appendChild(itemElement);
      });
      
      // If there are more items
      if (cart.length > 3) {
        const moreItems = document.createElement('div');
        moreItems.className = 'text-center text-muted small mt-2';
        moreItems.textContent = `+ ${cart.length - 3} منتجات أخرى`;
        itemsContainer.appendChild(moreItems);
      }
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
  const stars = document.querySelectorAll('.star-rating label');
  const radios = document.querySelectorAll('.star-rating input[type="radio"]');
  function updateSelectedStars(selectedValue) {
    stars.forEach(label => {
      const val = label.htmlFor.replace('star', '');
      if (parseInt(val) <= selectedValue) {
        label.classList.add('selected');
      } else {
        label.classList.remove('selected');
      }
    });
  }
  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const selectedValue = parseInt(e.target.value);
      updateSelectedStars(selectedValue);
    });
  });
  const checkedRadio = document.querySelector('.star-rating input[type="radio"]:checked');
  if (checkedRadio) {
    updateSelectedStars(parseInt(checkedRadio.value));
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
    const checkedRadio = document.querySelector('.star-rating input[type="radio"]:checked');
    if (!checkedRadio) {
      document.querySelectorAll('.star-rating label').forEach(label => label.classList.remove('selected'));
    }
    loadReviews(productId);
    setTimeout(() => {
      const addReviewModal = bootstrap.Modal.getInstance(document.getElementById('addReviewModal'));
      addReviewModal.hide();
      reviewMessageDiv.innerHTML = '';
    }, 1500);
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
    
    // Fetch ALL categories from the API with cache-busting
    const response = await fetch(`/api/categories?_t=${Date.now()}`);
    const allCategories = await response.json();
    
    // Show ALL categories as buttons, not just the ones the product belongs to
    if (allCategories && allCategories.length > 0) {
      const categoryButtons = allCategories.map(cat => {
        // Map category ID to known slug (same as index page)
        let categorySlug;
        switch(cat.id) {
          case 1: categorySlug = 'alanayh-alshar-1'; break;
          case 2: categorySlug = 'alanayh-alshrh-2'; break;
          case 3: categorySlug = 'aghdhyh-shyh-3'; break;
          case 4: categorySlug = 'altwal-4'; break;
          default: categorySlug = `category-${cat.id}`;
        }
        
        return `
          <a href="/categories/${categorySlug}" class="btn btn-light border shadow-sm px-3 py-2 fw-semibold text-decoration-none" style="border-radius:14px;color:var(--military-green,#715100);background:linear-gradient(90deg,#fff7e6 70%,#fff 100%);font-size:1em;">
            <i class="bi bi-tag-fill me-2" style="color:var(--orange-accent,#ffbf00);"></i>${cat.name}
          </a>
        `;
      }).join('');
      
      row.innerHTML = `
        <div class="col-12 d-flex flex-wrap gap-2 justify-content-center mt-3">
          ${categoryButtons}
          <button id="product-share-btn" class="btn btn-outline-success px-3 py-2 fw-semibold" style="border-radius:14px;font-size:1em;">
            <i class="bi bi-share-fill"></i> مشاركة
          </button>
        </div>
      `;
    } else {
      // If no categories found, only show share button
      row.innerHTML = `
        <div class="col-12 d-flex flex-wrap gap-2 justify-content-center mt-3">
          <button id="product-share-btn" class="btn btn-outline-success px-3 py-2 fw-semibold" style="border-radius:14px;font-size:1em;">
            <i class="bi bi-share-fill"></i> مشاركة
          </button>
        </div>
      `;
    }
    
    setupShareButton();
    // No need for setupCategoryLinks() - using simple HTML anchors like index page
  } catch (e) {
    console.error('Error in loadAllCategoriesAndRenderShortcuts:', e);
    // fallback: show only share button
    document.getElementById('product-categories-row').innerHTML = `
      <div class="col-12 d-flex flex-wrap gap-2 justify-content-center mt-3">
        <button id="product-share-btn" class="btn btn-outline-success px-3 py-2 fw-semibold" style="border-radius:14px;font-size:1em;">
          <i class="bi bi-share-fill"></i> مشاركة
        </button>
      </div>
    `;
    setupShareButton();
  }
}

// Product share button: copies link to clipboard, shows Bootstrap toast
function setupShareButton() {
  setTimeout(() => {
    const shareBtn = document.getElementById('product-share-btn');
    if (!shareBtn) return;
    shareBtn.onclick = function() {
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
  // Show an input that user can select/copy manually
  let temp = document.createElement('input');
  temp.value = link;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand('copy');
  document.body.removeChild(temp);
  showShareToast('تم نسخ رابط المنتج!');
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
  const toast = new bootstrap.Toast(toastEl);
  toast.show();
}

// Function to open image modal at specific slide
function openImageModal(startIndex = 0) {
  const modal = new bootstrap.Modal(document.getElementById('imageModal'));
  // Set the modal carousel to the clicked image
  const modalCarousel = document.getElementById('modalCarousel');
  // Initialize the modal carousel with interval: false to disable auto-slide
  const carousel = new bootstrap.Carousel(modalCarousel, { interval: false, ride: false });
  // Go to the specific slide
  carousel.to(startIndex);
  // Show the modal
  modal.show();
}


// At top of your file:
const urlParams = new URLSearchParams(window.location.search);
let productId = urlParams.get('id');

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
  
  // Enhanced title and description for social media
  const socialTitle = `${product.name} - ${priceText}`;
  const socialDescription = product.description ? 
    `${product.description.substring(0, 200)}...` : 
    `اشتري ${product.name} بأفضل سعر من Omervita. ${availability} - منتجات طبيعية عالية الجودة مع توصيل سريع.`;
  
  // Update Open Graph tags
  const ogTags = [
    { property: 'og:title', content: socialTitle },
    { property: 'og:description', content: socialDescription },
    { property: 'og:image', content: productImage },
    { property: 'og:url', content: url },
    { property: 'og:type', content: 'product' },
    { property: 'og:site_name', content: siteName },
    { property: 'product:price:amount', content: product.price || '0' },
    { property: 'product:price:currency', content: 'DZD' },
    { property: 'product:availability', content: availability }
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
    { name: 'twitter:site', content: '@omervita' },
    { name: 'twitter:creator', content: '@omervita' }
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


