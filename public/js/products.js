let allProducts = [];
let allCategories = [];

// Helper to get all categories for filter dropdown
async function loadCategories() {
  try {
    const resp = await fetch('/api/categories');
    if (!resp.ok) return;
    allCategories = await resp.json();
    const filter = document.getElementById('category-filter');
    if (filter) {
      filter.innerHTML = `<option value="">كل الفئات</option>`; // Clear and add default
      allCategories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent  = cat.name;
        filter.appendChild(opt);
      });
    }
  } catch (e) {}
}


// --- Main rendering ---
function renderProducts(products, append = false) {
  const container = document.getElementById('products-container');
  if (!append) container.innerHTML = '';

  // --- SEO: Generate JSON-LD for all visible products ---
  const productsJsonLd = products.map(product => {
    // Use first image as main image
    let image = (product.images && product.images[0]) || product.imagePath || 'https://omervita.com/images/logo.png';
    // Use first category name if available
    let category = (product.categories && product.categories[0] && product.categories[0].name) || '';
    // Build offer object
    let offer = {
      '@type': 'Offer',
      'price': product.price,
      'priceCurrency': 'DZD',
      'availability': product.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      'url': `https://omervita.com/product-detail.html?id=${product.id}`
    };
    return {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      'name': product.name,
      'image': image.startsWith('http') ? image : `https://omervita.com/${image.replace(/^\/*/, '')}`,
      'description': product.description || '',
      'sku': product.sku || product.id,
      'brand': {
        '@type': 'Brand',
        'name': 'Omervita'
      },
      'category': category,
      'offers': offer
    };
  });
  // Inject JSON-LD into the placeholder script
  const jsonLdScript = document.getElementById('products-jsonld');
  if (jsonLdScript) {
    jsonLdScript.textContent = JSON.stringify(productsJsonLd, null, 2);
  }
  // --- END SEO JSON-LD ---

  products.forEach(product => {
    const productCol = document.createElement('div');
    productCol.classList.add('col', 'mb-4', 'd-flex', 'justify-content-center');

    const productCard = document.createElement('div');
    productCard.classList.add('product-card', 'shadow-sm', 'h-100');

    // Carousel or image
    let carouselHTML = '';
    if (product.images && Array.isArray(product.images) && product.images.length > 1) {
      const carouselId = `product-carousel-${product.id}`;
      carouselHTML = `
        <div id="${carouselId}" class="carousel slide" data-bs-ride="carousel" data-bs-interval="3000" >
          <div class="carousel-inner">
            ${product.images.map((src, idx) => `
              <div class="carousel-item${idx === 0 ? ' active' : ''}">
                <img src="${src}" class="d-block w-100" style="height:230px;object-fit:contain;background:#f8f8f8;" alt="${product.name} ${idx+1}" loading="lazy">
              </div>
            `).join('')}
          </div>
          <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev" >
            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
            <span class="visually-hidden">السابق</span>
          </button>
          <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
            <span class="carousel-control-next-icon" aria-hidden="true"></span>
            <span class="visually-hidden">التالي</span>
          </button>
        </div>
      `;
    } else {
      let src = (product.images && product.images[0]) || product.imagePath || 'images/default-product.jpg';
      carouselHTML = `<img src="${src}" class="d-block w-100" style="height:230px;object-fit:contain;background:#f8f8f8;" alt="${product.name}" loading="lazy">`;
    }

    // Badges (stock, etc)
    let badges = [];
    if (product.stock === 0) {
      badges.push(`<span class="product-badge" style="background:#e84141;color:#fff;">غير متوفر</span>`);
    } else if (product.stock !== undefined && product.stock < 10) {
      badges.push(`<span class="product-badge">كمية محدودة</span>`);
    }
    let badgeHTML = badges.join('');

    // Category badge(s)
    let catBadges = '';
    if (product.categories && product.categories.length) {
      catBadges = product.categories.map(cat =>
        `<span class="badge bg-light border text-dark me-1" style="font-size:0.58em;padding:.25em .53em;"><i class="bi bi-tag"></i> ${cat.name}</span>`
      ).join('');
    }

    // Rating (show average if available, otherwise nothing)
    let ratingHtml = '';
    const avg = Number(product.avgRating);
    if (!isNaN(avg)) {
      // Generate stars based on rating
      let starsHtml = '';
      const roundedRating = Math.round(avg * 2) / 2; // Round to nearest 0.5
      
      for (let i = 1; i <= 5; i++) {
        // Full star
        if (i <= Math.floor(roundedRating)) {
          starsHtml += `<i class="bi bi-star-fill text-warning"></i>`;
        }
        // Half star
        else if (i === Math.ceil(roundedRating) && !Number.isInteger(roundedRating)) {
          starsHtml += `<i class="bi bi-star-half text-warning"></i>`;
        }
        // Empty star
        else {
          starsHtml += `<i class="bi bi-star text-warning"></i>`;
        }
      }
      
      ratingHtml = `
        <div class="d-flex align-items-center mt-1 mb-2">
          <div class="stars-container" style="font-size: 0.8rem;">${starsHtml}</div>
          <span class="ms-1 text-warning fw-bold" style="font-size: 0.9rem;">${avg.toFixed(1)}</span>
          <span class="ms-1 text-muted" style="font-size: 0.8rem;">(${product.reviewCount || 0})</span>
        </div>`;
    }

    // Truncate title if longer than 60 characters
    const truncatedTitle = product.name.length > 60 
      ? product.name.substring(0, 60) + '...' 
      : product.name;

    productCard.innerHTML = `
      <div class="product-img-box position-relative">
        ${carouselHTML}
        ${badgeHTML}
      </div>
      <div class="product-card-body" >
        <h5 class="product-card-title" style="margin: .1em .1em ;" title="${product.name}">${truncatedTitle}</h5>
        <div class="mb-1">${catBadges}</div>
        ${ratingHtml}
        <div style="margin: .1em .1em ;" class="product-card-price"><i class="bi bi-tag me-1"></i>دج${product.price}</div>
        <div class="d-flex justify-content-between mt-2">
          <button class="btn product-card-button flex-grow-1 me-2" style="font-size:1.1em;padding:.1em .1em;">عرض التفاصيل</button>
          ${product.stock === 0 ? 
            `<button class="btn btn-secondary add-cart-btn flex-grow-1" disabled style="font-size:1.1em;padding:.1em .1em;opacity:.6;cursor:not-allowed;">
              <i class="bi bi-cart-plus"></i>
             </button>` : 
            `<button class="btn btn-primary add-cart-btn flex-grow-1" style="font-size:1.1em;padding:.1em .1em;">
              <i class="bi bi-cart-plus"></i>
             </button>`
          }
        </div>
      </div>
    `;
    
    // Make title clickable to go to product details
    productCard.querySelector('.product-card-title').addEventListener('click', () => {
      window.location.href = `product-detail.html?id=${product.id}`;
    });
    
    productCard.querySelector('.product-card-button').addEventListener('click', () => {
      window.location.href = `product-detail.html?id=${product.id}`;
    });
    
    // Add event listener for the "Add to Cart" button if product is in stock
    if (product.stock !== 0) {
      productCard.querySelector('.add-cart-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent parent card click
        
        // Add product to cart
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
        
        // Show success message with enhanced cart popup
        showCartMessage('<i class="bi bi-check-circle-fill"></i> تم إضافة المنتج إلى السلة!', 'success', product);
        
        // Update cart counter if function exists
        if (typeof updateCartCounter === 'function') {
          updateCartCounter();
        }
      });
    }
    
    productCol.appendChild(productCard);
    container.appendChild(productCol);
    // --- Ensure Bootstrap carousel auto-slides ---
    if (product.images && Array.isArray(product.images) && product.images.length > 1) {
      setTimeout(() => {
        const el = document.getElementById(`product-carousel-${product.id}`);
        if (el && window.bootstrap && window.bootstrap.Carousel) {
          new window.bootstrap.Carousel(el, { interval: 3000, ride: 'carousel' });
        }
      }, 0);
    }
  });
}


// Loads products and fetches their images for carousel use
async function loadProducts() {
  // Responsive skeleton count
  let skeletonCount = 8;
  if (window.innerWidth < 600) skeletonCount = 2;
  else if (window.innerWidth < 900) skeletonCount = 4;
  renderSkeletonProducts(skeletonCount);
  showGlobalLoadingSpinner('جاري تحميل المنتجات...');
  try {
    const response = await fetch('/api/products');
    if (!response.ok) {
      throw new Error('تعذر جلب المنتجات');
    }
    let products = await response.json();

    // For each product, fetch images array from /api/products/:id/images
    const productsWithImages = await Promise.all(products.map(async (prod) => {
      try {
        const imgResp = await fetch(`/api/products/${prod.id}/images`);
        const imgs = await imgResp.json();
        return { ...prod, images: imgs && imgs.length > 0 ? imgs : (prod.imagePath ? [prod.imagePath] : []) };
      } catch {
        return { ...prod, images: prod.imagePath ? [prod.imagePath] : [] };
      }
    }));

    // Sort products to show newest first
    productsWithImages.sort((a, b) => b.id - a.id);

    allProducts = productsWithImages;
    renderProducts(allProducts);
  } catch (error) {
    console.error('حدث خطأ أثناء تحميل المنتجات:', error);
  } finally {
    hideGlobalLoadingSpinner();
  }
}

// --- Filtering ---
function filterAndRender() {
  const query = document.getElementById('search-bar').value.toLowerCase();
  const cat = document.getElementById('category-filter').value;
  const minPrice = parseFloat(document.getElementById('min-price').value) || null;
  const maxPrice = parseFloat(document.getElementById('max-price').value) || null;
  const minRating = parseInt(document.getElementById('rating-filter').value) || null;
  const sortPrice = document.getElementById('price-sort').value;

  let filtered = allProducts.filter(product => {
    // Search
    let ok = (
      product.name.toLowerCase().includes(query) ||
      (product.description && product.description.toLowerCase().includes(query))
    );
    // Category filter
    if (ok && cat) {
      ok = Array.isArray(product.categories) && product.categories.some(c => String(c.id) === cat);
    }
    // Price filter
    if (ok && minPrice !== null) ok = parseFloat(product.price) >= minPrice;
    if (ok && maxPrice !== null) ok = parseFloat(product.price) <= maxPrice;
    // Rating filter
    if (ok && minRating !== null && product.avgRating !== undefined) {
      ok = product.avgRating >= minRating;
    }
    return ok;
  });

  // Sort by price if selected
  if (sortPrice) {
    filtered.sort((a, b) => {
      const priceA = parseFloat(a.price);
      const priceB = parseFloat(b.price);
      return sortPrice === 'asc' ? priceA - priceB : priceB - priceA;
    });
  }

  // Update active filters display
  updateActiveFilters(query, cat, minPrice, maxPrice, minRating, sortPrice);
  
  // Update filter control styles
  updateFilterControlStyles(query, cat, minPrice, maxPrice, minRating, sortPrice);
  
  renderProducts(filtered);
}

// Update the visual indication of active filters
function updateActiveFilters(query, cat, minPrice, maxPrice, minRating, sortPrice) {
  const activeFiltersContainer = document.getElementById('active-filters');
  let activeFilters = [];
  
  // Search filter
  if (query) {
    activeFilters.push({
      type: 'search',
      text: `بحث: ${query}`,
      value: query
    });
  }
  
  // Category filter
  if (cat) {
    const catElement = document.getElementById('category-filter');
    const catName = catElement.options[catElement.selectedIndex].text;
    activeFilters.push({
      type: 'category',
      text: `الفئة: ${catName}`,
      value: cat
    });
  }
  
  // Price range filter
  if (minPrice !== null || maxPrice !== null) {
    let priceText = "السعر: ";
    if (minPrice !== null && maxPrice !== null) {
      priceText += `${minPrice} - ${maxPrice} دج`;
    } else if (minPrice !== null) {
      priceText += `> ${minPrice} دج`;
    } else {
      priceText += `< ${maxPrice} دج`;
    }
    activeFilters.push({
      type: 'price',
      text: priceText,
      value: 'price'
    });
  }
  
  // Rating filter
  if (minRating !== null) {
    const stars = '★'.repeat(minRating) + '☆'.repeat(5 - minRating);
    activeFilters.push({
      type: 'rating',
      text: `التقييم: ${stars}`,
      value: minRating
    });
  }
  
  // Price sorting
  if (sortPrice) {
    const sortText = sortPrice === 'asc' ? 'الأرخص للأغلى' : 'الأغلى للأرخص';
    activeFilters.push({
      type: 'sort',
      text: `ترتيب: ${sortText}`,
      value: sortPrice
    });
  }
  
  // Update the UI
  if (activeFilters.length > 0) {
    activeFiltersContainer.innerHTML = activeFilters.map(filter => {
      return `<span class="badge filter-badge-${filter.type}" data-filter-type="${filter.type}" data-filter-value="${filter.value}">
                ${filter.text} <i class="bi bi-x ms-1"></i>
              </span>`;
    }).join('');
    
    // Add click event listeners to remove filters
    activeFiltersContainer.querySelectorAll('.badge').forEach(badge => {
      badge.addEventListener('click', () => {
        removeFilter(badge.dataset.filterType, badge.dataset.filterValue);
      });
    });
  } else {
    activeFiltersContainer.innerHTML = '<span class="badge bg-light text-secondary border">لا توجد فلاتر نشطة</span>';
  }
  
  // Also update sliding panel active filters
  if (typeof updateSlidingActiveFilters === 'function') {
    updateSlidingActiveFilters();
  }
}

// Update the styles of filter controls to highlight active ones
function updateFilterControlStyles(query, cat, minPrice, maxPrice, minRating, sortPrice) {
  // Reset all filter controls
  document.querySelectorAll('.filter-control').forEach(el => {
    el.classList.remove('active');
  });
  
  // Add active class to controls with values
  if (query) document.getElementById('search-bar').classList.add('active');
  if (cat) document.getElementById('category-filter').classList.add('active');
  if (minPrice !== null) document.getElementById('min-price').classList.add('active');
  if (maxPrice !== null) document.getElementById('max-price').classList.add('active');
  if (minRating !== null) document.getElementById('rating-filter').classList.add('active');
  if (sortPrice) document.getElementById('price-sort').classList.add('active');
}

// Remove a filter when clicked
function removeFilter(type, value) {
  switch(type) {
    case 'search':
      document.getElementById('search-bar').value = '';
      break;
    case 'category':
      document.getElementById('category-filter').value = '';
      break;
    case 'price':
      document.getElementById('min-price').value = '';
      document.getElementById('max-price').value = '';
      break;
    case 'rating':
      document.getElementById('rating-filter').value = '';
      break;
    case 'sort':
      document.getElementById('price-sort').value = '';
      break;
  }
  
  filterAndRender(); // Reapply filters and update UI
}

// Clear all filters
function clearAllFilters() {
  document.getElementById('search-bar').value = '';
  document.getElementById('category-filter').value = '';
  document.getElementById('min-price').value = '';
  document.getElementById('max-price').value = '';
  document.getElementById('rating-filter').value = '';
  document.getElementById('price-sort').value = '';
  
  filterAndRender(); // Reapply filters and update UI
}

// --- Event Listeners for all filters ---
document.addEventListener('DOMContentLoaded', async () => {
  await loadCategories();
  await loadProducts();
  
  // Auto-select category if ?category=ID in URL
  const urlParams = new URLSearchParams(window.location.search);
  const cat = urlParams.get('category');
  if (cat) {
    const filter = document.getElementById('category-filter');
    if (filter) {
      filter.value = cat;
      filterAndRender(); // Triggers the filtering
      window.scrollTo(0, 0); // scroll to top
    }
  }
  
  // Set up filter event listeners
  document.getElementById('search-bar').addEventListener('input', () => {
    syncOriginalToSlidingPanel();
    filterAndRender();
  });
  document.getElementById('category-filter').addEventListener('change', () => {
    syncOriginalToSlidingPanel();
    filterAndRender();
  });
  document.getElementById('min-price').addEventListener('input', () => {
    syncOriginalToSlidingPanel();
    filterAndRender();
  });
  document.getElementById('max-price').addEventListener('input', () => {
    syncOriginalToSlidingPanel();
    filterAndRender();
  });
  document.getElementById('rating-filter').addEventListener('change', () => {
    syncOriginalToSlidingPanel();
    filterAndRender();
  });
  document.getElementById('price-sort').addEventListener('change', () => {
    syncOriginalToSlidingPanel();
    filterAndRender();
  });
  
  // Clear all filters button
  document.getElementById('clear-filters').addEventListener('click', clearAllFilters);
  
  // Tooltip initialization for filters (if using Bootstrap tooltips)
  try {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  } catch (e) {
    console.warn('Bootstrap tooltip initialization failed:', e);
  }

  // Sliding filter panel setup
  setupSlidingFilterPanel();
});

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

// Show cart message notification
function showCartMessage(message, type = 'info', product = null) {
  // Remove any existing message
  const existingMessage = document.getElementById('cart-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.id = 'cart-message';
  messageElement.className = `alert alert-${type} cart-message`;
  messageElement.innerHTML = message;
  messageElement.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 9999;
    padding: 10px 20px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease-out forwards;
    max-width: 300px;
  `;
  
  // Add animation styles
  const style = document.createElement('style');
  if (!document.getElementById('cart-message-styles')) {
    style.id = 'cart-message-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
      .cart-message-hide {
        animation: slideOut 0.3s ease-in forwards;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Add to document
  document.body.appendChild(messageElement);
  
  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    messageElement.classList.add('cart-message-hide');
    setTimeout(() => messageElement.remove(), 300);
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

// Sliding Filter Panel Functionality
function setupSlidingFilterPanel() {
  // Add a small delay to ensure DOM is fully loaded
  setTimeout(() => {
    const filterPanel = document.getElementById('slidingFilterPanel');
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    const filterPanelClose = document.getElementById('filterPanelClose');
    const filterPanelOverlay = document.getElementById('filterPanelOverlay');

    if (!filterPanel || !filterToggleBtn || !filterPanelClose || !filterPanelOverlay) {
      console.warn('Some sliding filter panel elements not found');
      return;
    }

    // Open the filter panel
    function openFilterPanel() {
      filterPanel.classList.add('active');
      filterPanelOverlay.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent scrolling when panel is open
      syncFiltersToSlidingPanel(); // Sync current filters to sliding panel
    }

    // Close the filter panel
    function closeFilterPanel() {
      filterPanel.classList.remove('active');
      filterPanelOverlay.classList.remove('active');
      document.body.style.overflow = ''; // Re-enable scrolling
    }

    // Event listeners
    filterToggleBtn.addEventListener('click', openFilterPanel);
    filterPanelClose.addEventListener('click', closeFilterPanel);
    filterPanelOverlay.addEventListener('click', closeFilterPanel);

    // Close panel with Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && filterPanel.classList.contains('active')) {
        closeFilterPanel();
      }
    });

    // Setup sliding panel filters
    setupSlidingPanelFilters();
  }, 500); // Increased delay to ensure DOM is ready
}

function setupSlidingPanelFilters() {
  // Populate sliding panel categories
  const slidingCategoryFilter = document.getElementById('sliding-category-filter');
  if (slidingCategoryFilter && allCategories.length > 0) {
    slidingCategoryFilter.innerHTML = `<option value="">كل الفئات</option>`;
    allCategories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      slidingCategoryFilter.appendChild(opt);
    });
  }

  // Add event listeners for sliding panel filters
  const slidingSearchBar = document.getElementById('sliding-search-bar');
  const slidingCategoryFilterEl = document.getElementById('sliding-category-filter');
  const slidingMinPrice = document.getElementById('sliding-min-price');
  const slidingMaxPrice = document.getElementById('sliding-max-price');
  const slidingRatingFilter = document.getElementById('sliding-rating-filter');
  const slidingPriceSort = document.getElementById('sliding-price-sort');
  const slidingClearFilters = document.getElementById('sliding-clear-filters');

  // Search filter
  if (slidingSearchBar) {
    slidingSearchBar.addEventListener('input', () => {
      document.getElementById('search-bar').value = slidingSearchBar.value; // Sync with original
      filterAndRender();
    });
  }

  // Category filter
  if (slidingCategoryFilterEl) {
    slidingCategoryFilterEl.addEventListener('change', () => {
      document.getElementById('category-filter').value = slidingCategoryFilterEl.value; // Sync with original
      filterAndRender();
    });
  }

  // Price filters
  if (slidingMinPrice) {
    slidingMinPrice.addEventListener('input', () => {
      document.getElementById('min-price').value = slidingMinPrice.value; // Sync with original
      filterAndRender();
    });
  }

  if (slidingMaxPrice) {
    slidingMaxPrice.addEventListener('input', () => {
      document.getElementById('max-price').value = slidingMaxPrice.value; // Sync with original
      filterAndRender();
    });
  }

  // Rating filter
  if (slidingRatingFilter) {
    slidingRatingFilter.addEventListener('change', () => {
      document.getElementById('rating-filter').value = slidingRatingFilter.value; // Sync with original
      filterAndRender();
    });
  }

  // Price sort
  if (slidingPriceSort) {
    slidingPriceSort.addEventListener('change', () => {
      document.getElementById('price-sort').value = slidingPriceSort.value; // Sync with original
      filterAndRender();
    });
  }

  // Clear filters
  if (slidingClearFilters) {
    slidingClearFilters.addEventListener('click', () => {
      clearAllFilters();
      syncFiltersToSlidingPanel();
    });
  }
}

function syncFiltersToSlidingPanel() {
  // Sync current filter values to sliding panel
  const searchBar = document.getElementById('search-bar');
  const categoryFilter = document.getElementById('category-filter');
  const minPrice = document.getElementById('min-price');
  const maxPrice = document.getElementById('max-price');
  const ratingFilter = document.getElementById('rating-filter');
  const priceSort = document.getElementById('price-sort');

  const slidingSearchBar = document.getElementById('sliding-search-bar');
  const slidingCategoryFilter = document.getElementById('sliding-category-filter');
  const slidingMinPrice = document.getElementById('sliding-min-price');
  const slidingMaxPrice = document.getElementById('sliding-max-price');
  const slidingRatingFilter = document.getElementById('sliding-rating-filter');
  const slidingPriceSort = document.getElementById('sliding-price-sort');

  if (searchBar && slidingSearchBar) slidingSearchBar.value = searchBar.value;
  if (categoryFilter && slidingCategoryFilter) slidingCategoryFilter.value = categoryFilter.value;
  if (minPrice && slidingMinPrice) slidingMinPrice.value = minPrice.value;
  if (maxPrice && slidingMaxPrice) slidingMaxPrice.value = maxPrice.value;
  if (ratingFilter && slidingRatingFilter) slidingRatingFilter.value = ratingFilter.value;
  if (priceSort && slidingPriceSort) slidingPriceSort.value = priceSort.value;
}

function syncOriginalToSlidingPanel() {
  // Sync original filter values to sliding panel (reverse of syncFiltersToSlidingPanel)
  const searchBar = document.getElementById('search-bar');
  const categoryFilter = document.getElementById('category-filter');
  const minPrice = document.getElementById('min-price');
  const maxPrice = document.getElementById('max-price');
  const ratingFilter = document.getElementById('rating-filter');
  const priceSort = document.getElementById('price-sort');

  const slidingSearchBar = document.getElementById('sliding-search-bar');
  const slidingCategoryFilter = document.getElementById('sliding-category-filter');
  const slidingMinPrice = document.getElementById('sliding-min-price');
  const slidingMaxPrice = document.getElementById('sliding-max-price');
  const slidingRatingFilter = document.getElementById('sliding-rating-filter');
  const slidingPriceSort = document.getElementById('sliding-price-sort');

  if (searchBar && slidingSearchBar) slidingSearchBar.value = searchBar.value;
  if (categoryFilter && slidingCategoryFilter) slidingCategoryFilter.value = categoryFilter.value;
  if (minPrice && slidingMinPrice) slidingMinPrice.value = minPrice.value;
  if (maxPrice && slidingMaxPrice) slidingMaxPrice.value = maxPrice.value;
  if (ratingFilter && slidingRatingFilter) slidingRatingFilter.value = ratingFilter.value;
  if (priceSort && slidingPriceSort) slidingPriceSort.value = priceSort.value;
}

function updateSlidingActiveFilters() {
  const container = document.getElementById('sliding-active-filters');
  if (!container) return;

  container.innerHTML = ''; // Clear current badges

  const searchTerm = document.getElementById('sliding-search-bar')?.value.trim();
  const selectedCategory = document.getElementById('sliding-category-filter')?.value;
  const minPrice = document.getElementById('sliding-min-price')?.value;
  const maxPrice = document.getElementById('sliding-max-price')?.value;
  const selectedRating = document.getElementById('sliding-rating-filter')?.value;
  const selectedSort = document.getElementById('sliding-price-sort')?.value;

  let hasActiveFilters = false;

  if (searchTerm) {
    const badge = createSlidingFilterBadge('search', `البحث: ${searchTerm}`, 'filter-badge-search');
    container.appendChild(badge);
    hasActiveFilters = true;
  }

  if (selectedCategory) {
    const categoryName = allCategories.find(c => c.id == selectedCategory)?.name || selectedCategory;
    const badge = createSlidingFilterBadge('category', `الفئة: ${categoryName}`, 'filter-badge-category');
    container.appendChild(badge);
    hasActiveFilters = true;
  }

  if (minPrice || maxPrice) {
    const priceText = minPrice && maxPrice ? `${minPrice} - ${maxPrice} دج` :
                     minPrice ? `من ${minPrice} دج` :
                     `حتى ${maxPrice} دج`;
    const badge = createSlidingFilterBadge('price', `السعر: ${priceText}`, 'filter-badge-price');
    container.appendChild(badge);
    hasActiveFilters = true;
  }

  if (selectedRating) {
    const badge = createSlidingFilterBadge('rating', `التقييم: ${selectedRating}★+`, 'filter-badge-rating');
    container.appendChild(badge);
    hasActiveFilters = true;
  }

  if (selectedSort) {
    const sortText = selectedSort === 'asc' ? 'الأرخص أولاً' : 'الأغلى أولاً';
    const badge = createSlidingFilterBadge('sort', `الترتيب: ${sortText}`, 'filter-badge-sort');
    container.appendChild(badge);
    hasActiveFilters = true;
  }

  if (!hasActiveFilters) {
    const noFilters = document.createElement('span');
    noFilters.className = 'badge bg-light text-secondary border';
    noFilters.textContent = 'لا توجد فلاتر نشطة';
    container.appendChild(noFilters);
  }
}

function createSlidingFilterBadge(type, text, className) {
  const badge = document.createElement('span');
  badge.className = `badge border ${className}`;
  badge.innerHTML = `${text} <i class="bi bi-x ms-1" style="cursor: pointer;"></i>`;
  
  badge.querySelector('i').addEventListener('click', () => {
    clearSlidingFilter(type);
  });
  
  return badge;
}

function clearSlidingFilter(type) {
  switch (type) {
    case 'search':
      document.getElementById('sliding-search-bar').value = '';
      document.getElementById('search-bar').value = '';
      break;
    case 'category':
      document.getElementById('sliding-category-filter').value = '';
      document.getElementById('category-filter').value = '';
      break;
    case 'price':
      document.getElementById('sliding-min-price').value = '';
      document.getElementById('sliding-max-price').value = '';
      document.getElementById('min-price').value = '';
      document.getElementById('max-price').value = '';
      break;
    case 'rating':
      document.getElementById('sliding-rating-filter').value = '';
      document.getElementById('rating-filter').value = '';
      break;
    case 'sort':
      document.getElementById('sliding-price-sort').value = '';
      document.getElementById('price-sort').value = '';
      break;
  }
  filterAndRender();
  updateSlidingActiveFilters();
}

// --- Skeleton Loading ---
function renderSkeletonProducts(count = 8) {
  const container = document.getElementById('products-container');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const col = document.createElement('div');
    col.className = 'col mb-4 d-flex justify-content-center';
    col.innerHTML = `
      <div class="product-card skeleton-card">
        <div class="product-img-box skeleton-img"></div>
        <div class="product-card-body">
          <div class="skeleton-title"></div>
          <div class="skeleton-price"></div>
          <div class="skeleton-badges"></div>
          <div class="skeleton-btn"></div>
        </div>
      </div>
    `;
    container.appendChild(col);
  }
}

// --- Patch loadProducts to show skeletons ---
async function loadProducts() {
  // Responsive skeleton count
  let skeletonCount = 8;
  if (window.innerWidth < 600) skeletonCount = 2;
  else if (window.innerWidth < 900) skeletonCount = 4;
  renderSkeletonProducts(skeletonCount);
  showGlobalLoadingSpinner('جاري تحميل المنتجات...');
  try {
    const response = await fetch('/api/products');
    if (!response.ok) {
      throw new Error('تعذر جلب المنتجات');
    }
    let products = await response.json();

    // For each product, fetch images array from /api/products/:id/images
    const productsWithImages = await Promise.all(products.map(async (prod) => {
      try {
        const imgResp = await fetch(`/api/products/${prod.id}/images`);
        const imgs = await imgResp.json();
        return { ...prod, images: imgs && imgs.length > 0 ? imgs : (prod.imagePath ? [prod.imagePath] : []) };
      } catch {
        return { ...prod, images: prod.imagePath ? [prod.imagePath] : [] };
      }
    }));

    // Sort products to show newest first
    productsWithImages.sort((a, b) => b.id - a.id);

    allProducts = productsWithImages;
    renderProducts(allProducts);
  } catch (error) {
    console.error('حدث خطأ أثناء تحميل المنتجات:', error);
  } finally {
    hideGlobalLoadingSpinner();
  }
}

// --- Skeleton CSS ---
(function addSkeletonStyles() {
  if (document.getElementById('skeleton-styles')) return;
  const style = document.createElement('style');
  style.id = 'skeleton-styles';
  style.textContent = `
    .skeleton-card { background: #f6f6f6; position: relative; overflow: hidden; }
    .skeleton-img { width: 100%; min-height: 210px; max-height: 260px; background: #e0e0e0; border-radius: 15px 20px 0 0; animation: skeletonPulse 1.2s infinite ease-in-out; }
    .skeleton-title { height: 22px; width: 80%; background: #e0e0e0; border-radius: 8px; margin: 18px 0 10px 0; animation: skeletonPulse 1.2s infinite ease-in-out; }
    .skeleton-price { height: 18px; width: 40%; background: #e0e0e0; border-radius: 8px; margin-bottom: 12px; animation: skeletonPulse 1.2s infinite ease-in-out; }
    .skeleton-badges { height: 16px; width: 60%; background: #e0e0e0; border-radius: 8px; margin-bottom: 10px; animation: skeletonPulse 1.2s infinite ease-in-out; }
    .skeleton-btn { height: 36px; width: 100%; background: #e0e0e0; border-radius: 12px; margin-top: 10px; animation: skeletonPulse 1.2s infinite ease-in-out; }
    @keyframes skeletonPulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    @media (max-width: 900px) { .skeleton-card { min-width: 45vw; max-width: 90vw; } }
    @media (max-width: 600px) { .skeleton-card { min-width: 90vw; max-width: 98vw; } }
  `;
  document.head.appendChild(style);
})();