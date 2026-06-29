let allProducts = [];
let allCategories = [];
let autoRefreshInterval = null;
let isPageVisible = true;

// Infinite scroll state
let currentFilteredProducts = [];
let currentlyRenderedCount = 0;
const BATCH_SIZE = 12;
let productObserver = null;

// Helper to get all categories for filter dropdown
async function loadCategories() {
  try {
    // Add cache-busting timestamp
    const resp = await fetch('/api/categories');
    if (!resp.ok) {
      throw new Error('تعذر تحميل الفئات');
    }
    allCategories = await resp.json();

    const filter = document.getElementById('category-filter');
    if (filter) {
      filter.innerHTML = `<option value="">كل الفئات</option>`; // Clear and add default
      allCategories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        filter.appendChild(opt);
      });
    }
  } catch (error) {
    console.error('Error loading categories:', error);
    const filter = document.getElementById('category-filter');
    if (filter) {
      filter.innerHTML = `<option value="">كل الفئات (خطأ في التحميل)</option>`;
    }
  }
}


// --- Main rendering ---
function renderProducts(products, append = false) {
  const container = document.getElementById('products-container');
  if (!append) container.innerHTML = '';

  products.forEach(product => {
    const productCol = document.createElement('div');
    productCol.classList.add('col', 'mb-4', 'd-flex', 'justify-content-center');

    const productCard = document.createElement('div');
    productCard.classList.add('product-card', 'shadow-sm', 'h-100');

    // Premium Image Crossfade on Hover
    let imageHTML = '';
    const mainImg = (product.images && product.images[0]) || product.imagePath || 'images/default-product.jpg';
    if (product.images && Array.isArray(product.images) && product.images.length > 1) {
      const hoverImg = product.images[1];
      imageHTML = `
        <img src="${mainImg}" class="product-img-primary d-block w-100" alt="${product.name}" loading="lazy">
        <img src="${hoverImg}" class="product-img-hover d-block w-100" alt="${product.name} alternate" loading="lazy">
      `;
    } else {
      imageHTML = `<img src="${mainImg}" class="product-img-primary d-block w-100" alt="${product.name}" loading="lazy">`;
    }

    // Badges (stock, etc)
    let badgeHTML = '';
    if (product.stock === 0) {
      badgeHTML = `<span class="badge bg-danger position-absolute top-0 end-0 m-2 z-3" style="font-size: 0.65rem; padding: 0.3rem 0.45rem;"><i class="bi bi-x-circle ms-1"></i>نفذت الكمية</span>`;
    } else if (product.stock !== undefined && product.stock < 10) {
      badgeHTML = `<span class="badge bg-warning text-dark position-absolute top-0 end-0 m-2 z-3" style="font-size: 0.65rem; padding: 0.3rem 0.45rem;"><i class="bi bi-exclamation-triangle ms-1"></i>كمية محدودة</span>`;
    }

    // Category badge(s)
    let catBadges = '';
    if (product.categories && product.categories.length) {
      catBadges = product.categories.map(cat =>
        `<span style="font-size:0.75rem; color:#888;">${cat.name}</span>`
      ).join('<span style="font-size:0.75rem; color:#888; margin: 0 4px;">•</span>');
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
        ${imageHTML}
        ${badgeHTML}
      </div>
      <div class="product-card-body" >
        <h5 class="product-card-title" style="margin: .1em .1em ;" title="${product.name}">${truncatedTitle}</h5>
        <div class="mb-1">${catBadges}</div>
        ${ratingHtml}
        <div style="margin: .1em .1em ;" class="product-card-price"><i class="bi bi-tag ms-1"></i>${product.price} دج</div>
        <div class="mt-2">
          ${product.stock === 0 ?
        `<button class="btn btn-secondary add-cart-btn w-100" disabled style="font-size:0.85rem;padding:.4rem;opacity:.6;cursor:not-allowed; border-radius: 12px; font-weight: normal;">
              غير متوفر <i class="bi bi-cart-x ms-1"></i>
             </button>` :
        `<button class="btn add-cart-btn w-100" style="background: var(--orange-accent); color: #000; font-weight: normal; font-size:0.85rem; padding:.4rem; border:none; border-radius: 12px; box-shadow: 0 4px 10px rgba(255,191,0,0.3); transition: transform 0.2s, box-shadow 0.2s;">
              أضف إلى السلة <i class="bi bi-cart-plus ms-1"></i>
             </button>`
      }
        </div>
      </div>
    `;

    // Make entire card clickable except for the add to cart button
    productCard.style.cursor = 'pointer';
    productCard.addEventListener('click', (e) => {
      if (!e.target.closest('.add-cart-btn')) {
        window.location.href = `/products/${product.slug || SlugUtil.generateProductSlug(product)}`;
      }
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
            thumbnail: (product.images && product.images[0]) || product.imagePath || 'images/default-product.jpg',
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
  });
}


// Helper function to add cache-busting to API calls
function addCacheBusting(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${Date.now()}`;
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

  // --- SEO: Generate JSON-LD for all visible products ---
  const productsJsonLd = filtered.map(product => {
    let image = (product.images && product.images[0]) || product.imagePath || 'https://omervita.com/images/logo.png';
    let category = (product.categories && product.categories[0] && product.categories[0].name) || '';
    return {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      'name': product.name,
      'image': image.startsWith('http') ? image : `https://omervita.com/${image.replace(/^\/*/, '')}`,
      'description': product.description || '',
      'sku': product.sku || product.id,
      'brand': { '@type': 'Brand', 'name': 'Omervita' },
      'category': category,
      'offers': {
        '@type': 'Offer',
        'price': product.price,
        'priceCurrency': 'DZD',
        'availability': product.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        'url': `https://omervita.com/products/${product.slug || SlugUtil.generateProductSlug(product)}`
      }
    };
  });
  const jsonLdScript = document.getElementById('products-jsonld');
  if (jsonLdScript) {
    jsonLdScript.textContent = JSON.stringify(productsJsonLd, null, 2);
  }

  currentFilteredProducts = filtered;
  currentlyRenderedCount = 0;
  document.getElementById('products-container').innerHTML = ''; // Clear container
  loadMoreProducts();
}

function loadMoreProducts() {
  if (currentlyRenderedCount >= currentFilteredProducts.length) return;

  const nextBatch = currentFilteredProducts.slice(currentlyRenderedCount, currentlyRenderedCount + BATCH_SIZE);
  renderProducts(nextBatch, true);
  currentlyRenderedCount += nextBatch.length;

  setupIntersectionObserver();
}

function setupIntersectionObserver() {
  const container = document.getElementById('products-container');
  const cards = container.querySelectorAll('.col');
  if (cards.length === 0) return;

  if (productObserver) productObserver.disconnect();

  productObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      loadMoreProducts();
    }
  }, { rootMargin: '200px' });

  productObserver.observe(cards[cards.length - 1]);
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
  switch (type) {
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
  console.log('🚀 Products page DOM loaded, initializing...');

  await loadCategories();
  await loadProducts();

  // Initialize auto-refresh for real-time updates
  console.log('🔄 Auto-refresh disabled - service worker removed');
  // enableAutoRefresh(); // Removed - no longer needed without service worker caching

  // Add manual refresh button for testing
  // addManualRefreshButton(); // Removed - no longer needed without service worker caching

  // Check for category URL (handles both slug and legacy URLs)
  // This runs after both categories and products are loaded
  // Use setTimeout to ensure DOM is fully updated
  setTimeout(() => {
    checkCategoryURL();
  }, 200);

  // Set up filter event listeners
  document.getElementById('search-bar').addEventListener('input', () => {
    syncOriginalToSlidingPanel();
    filterAndRender();
  });
  document.getElementById('category-filter').addEventListener('change', (e) => {
    syncOriginalToSlidingPanel();
    updateCategoryURL(e.target.value); // Update URL when category changes
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

  // Add manual refresh button for testing
  addManualRefreshButton();
});

// Check for category-based URL on page load
function checkCategoryURL() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  // Handle category slug URLs: /categories/category-name-123
  if (path.match(/^\/categories\/[a-z0-9-]+$/i)) {
    const slug = path.replace('/categories/', '');
    const categoryId = SlugUtil.extractIdFromSlug(slug);

    if (categoryId) {
      // Set the category filter
      const filter = document.getElementById('category-filter');
      if (filter) {
        filter.value = categoryId;
        // Sync with sliding panel
        const slidingFilter = document.getElementById('sliding-category-filter');
        if (slidingFilter) {
          slidingFilter.value = categoryId;
        }
        // Apply the filter immediately
        filterAndRender();
        window.scrollTo(0, 0);
      }
    }
  }
  // Handle legacy category URLs: /products.html?category=123
  else if (params.get('category')) {
    const categoryId = params.get('category');
    const filter = document.getElementById('category-filter');
    if (filter) {
      filter.value = categoryId;
      // Sync with sliding panel
      const slidingFilter = document.getElementById('sliding-category-filter');
      if (slidingFilter) {
        slidingFilter.value = categoryId;
      }
      filterAndRender();
      window.scrollTo(0, 0);
    }
  }
}

// Update page URL when category filter changes
function updateCategoryURL(categoryId) {
  if (categoryId) {
    // Find the category to get its slug
    const category = allCategories.find(cat => cat.id == categoryId);
    if (category) {
      const slug = category.slug || SlugUtil.generateCategorySlug(category);
      const newUrl = `/categories/${slug}`;
      window.history.pushState({}, '', newUrl);

      // Update page title and SEO
      document.title = `${category.name} - المنتجات - Omervita`;

      // Update canonical URL
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = `https://omervita.com${newUrl}`;
    }
  } else {
    // No category selected, go back to products page
    window.history.pushState({}, '', '/products');
    document.title = 'المنتجات - Omervita';

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = 'https://omervita.com/products';
  }
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
    document.addEventListener('keydown', function (e) {
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
    clearSlidingFilter(badge.dataset.filterType);
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
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch('/api/products', { headers });
    if (!response.ok) {
      throw new Error('تعذر جلب المنتجات');
    }
    let products = await response.json();

    // Products already have images from the backend enrichment
    // Sort products to show newest first
    products.sort((a, b) => b.id - a.id);

    allProducts = products;
    filterAndRender();
  } catch (error) {
    console.error('حدث خطأ أثناء تحميل المنتجات:', error);

    // Show user-friendly error message
    const container = document.getElementById('products-container');
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger text-center" role="alert">
          <div class="mb-3">
            <i class="bi bi-exclamation-triangle-fill" style="font-size: 2rem; color: #dc3545;"></i>
          </div>
          <h4 class="alert-heading">خطأ في تحميل المنتجات</h4>
          <p class="mb-3">تعذر تحميل المنتجات. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.</p>
          <hr>
          <div class="d-flex justify-content-center gap-2">
            <button class="btn btn-primary" onclick="loadProducts()">
              <i class="bi bi-arrow-clockwise me-1"></i>إعادة المحاولة
            </button>
            <button class="btn btn-secondary" onclick="window.location.href='/'">
              <i class="bi bi-house me-1"></i>الصفحة الرئيسية
            </button>
          </div>
        </div>
      </div>
    `;
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

// Auto-refresh functionality for real-time updates

let isAutoRefreshIntentionallyEnabled = false;

// Function to enable auto-refresh for real-time data
function enableAutoRefresh(intervalMs = 15000) { // Reduced to 15 seconds for testing
  isAutoRefreshIntentionallyEnabled = true;
  console.log('🔄 Enabling auto-refresh with interval:', intervalMs, 'ms');

  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }

  // Show refresh indicator on first enable
  showRefreshIndicator();

  autoRefreshInterval = setInterval(async () => {
    console.log('🔄 Auto-refresh triggered at:', new Date().toLocaleTimeString());
    try {
      // Only refresh if page is visible to avoid unnecessary requests
      if (!isPageVisible) {
        console.log('🔄 Page not visible, skipping auto-refresh');
        return;
      }

      // Silently refresh products and categories without showing loading spinner
      console.log('🔄 Auto-refreshing products and categories...');

      // Store current filter state
      const currentSearch = document.getElementById('search-bar').value;
      const currentCategory = document.getElementById('category-filter').value;
      const currentMinPrice = document.getElementById('min-price').value;
      const currentMaxPrice = document.getElementById('max-price').value;
      const currentSort = document.getElementById('sort-by').value;

      console.log('🔄 Current filters:', { currentSearch, currentCategory, currentMinPrice, currentMaxPrice, currentSort });

      // Refresh categories first
      console.log('🔄 Refreshing categories...');
      await loadCategories();

      // Refresh products data
      console.log('🔄 Refreshing products...');
      const response = await fetch(`/api/products?_t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('تعذر جلب المنتجات');
      }
      let products = await response.json();

      console.log('🔄 Fetched', products.length, 'products');

      // Products already have images from the backend enrichment
      // Sort products to show newest first
      products.sort((a, b) => b.id - a.id);

      allProducts = products;

      console.log('🔄 Updated allProducts array with', allProducts.length, 'products');

      // Restore filter state
      document.getElementById('search-bar').value = currentSearch;
      document.getElementById('category-filter').value = currentCategory;
      document.getElementById('min-price').value = currentMinPrice;
      document.getElementById('max-price').value = currentMaxPrice;
      document.getElementById('sort-by').value = currentSort;

      // Re-apply filters to show updated results
      console.log('🔄 Re-applying filters and rendering...');
      filterAndRender();

      // Show refresh notification
      console.log('🔄 Showing refresh notification...');
      showRefreshNotification('تم تحديث قائمة المنتجات والفئات');

    } catch (error) {
      console.error('❌ Auto-refresh failed:', error);
    }
  }, intervalMs);
}

// Function to disable auto-refresh
function disableAutoRefresh() {
  isAutoRefreshIntentionallyEnabled = false;
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

// Handle page visibility changes to optimize auto-refresh
document.addEventListener('visibilitychange', () => {
  isPageVisible = !document.hidden;

  if (isPageVisible) {
    // Page became visible, resume auto-refresh if it was enabled
    if (autoRefreshInterval === null && isAutoRefreshIntentionallyEnabled) {
      enableAutoRefresh();
    }
  } else {
    // Page became hidden, pause auto-refresh to save resources
    // Keep the interval but just check visibility in the function
  }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  disableAutoRefresh();
});

// User-friendly refresh notification
function showRefreshNotification(message = 'تم تحديث قائمة المنتجات') {
  // Create or update existing notification
  let notification = document.getElementById('refresh-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'refresh-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(25, 135, 84, 0.9);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    document.body.appendChild(notification);
  }

  notification.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i>${message}`;

  // Show notification
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);

  // Hide notification after 3 seconds
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Optional: Add refresh indicator when auto-refresh is active
function showRefreshIndicator() {
  let indicator = document.getElementById('refresh-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'refresh-indicator';
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: rgba(13, 202, 240, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      z-index: 9998;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    indicator.innerHTML = `<i class="bi bi-arrow-clockwise me-1"></i>التحديث التلقائي مفعل`;
    document.body.appendChild(indicator);
  }

  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }, 5000);
}

// Add manual refresh button for testing
function addManualRefreshButton() {
  // Only add if not already present
  if (document.getElementById('manual-refresh-btn')) return;

  const refreshBtn = document.createElement('button');
  refreshBtn.id = 'manual-refresh-btn';
  refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>تحديث يدوي';
  refreshBtn.className = 'btn btn-outline-primary btn-sm position-fixed';
  refreshBtn.style.cssText = `
    top: 80px;
    right: 20px;
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  `;

  refreshBtn.addEventListener('click', async () => {
    console.log('🔄 Manual refresh triggered');
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>جاري التحديث...';

    try {
      // Store current filter state
      const currentSearch = document.getElementById('search-bar').value;
      const currentCategory = document.getElementById('category-filter').value;
      const currentMinPrice = document.getElementById('min-price').value;
      const currentMaxPrice = document.getElementById('max-price').value;
      const currentSort = document.getElementById('sort-by').value;

      // Refresh categories first
      await loadCategories();

      // Refresh products data
      const response = await fetch(`/api/products?_t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('تعذر جلب المنتجات');
      }
      let products = await response.json();

      // Products already have images from the backend enrichment
      // Sort products to show newest first
      products.sort((a, b) => b.id - a.id);

      allProducts = products;

      // Restore filter state
      document.getElementById('search-bar').value = currentSearch;
      document.getElementById('category-filter').value = currentCategory;
      document.getElementById('min-price').value = currentMinPrice;
      document.getElementById('max-price').value = currentMaxPrice;
      document.getElementById('sort-by').value = currentSort;

      // Re-apply filters to show updated results
      filterAndRender();

      // Show success notification
      showRefreshNotification('تم تحديث البيانات بنجاح!');

    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
      showRefreshNotification('فشل في تحديث البيانات');
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>تحديث يدوي';
    }
  });

  document.body.appendChild(refreshBtn);
}

// =====================================================
// === END OF FILE ===
// =====================================================