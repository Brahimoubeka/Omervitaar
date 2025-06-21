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
function renderProducts(products) {
  const container = document.getElementById('products-container');
  container.innerHTML = '';

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
        <div id="${carouselId}" class="carousel slide" data-bs-ride="carousel">
          <div class="carousel-inner">
            ${product.images.map((src, idx) => `
              <div class="carousel-item${idx === 0 ? ' active' : ''}">
                <img src="${src}" class="d-block w-100" style="height:230px;object-fit:contain;background:#f8f8f8;" alt="${product.name} ${idx+1}" loading="lazy">
              </div>
            `).join('')}
          </div>
          <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
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
    } else if (product.stock !== undefined && product.stock < 6) {
      badges.push(`<span class="product-badge">كمية قليلة</span>`);
    }
    let badgeHTML = badges.join('');

    // Category badge(s)
    let catBadges = '';
    if (product.categories && product.categories.length) {
      catBadges = product.categories.map(cat =>
        `<span class="badge bg-light border text-dark me-1" style="font-size:0.88em;padding:.25em .53em;"><i class="bi bi-tag"></i> ${cat.name}</span>`
      ).join('');
    }

    // Rating (if exists, otherwise fake for demo)
    let ratingHtml = '';
    if (product.avgRating !== undefined) {
      ratingHtml = `<span class="ms-2 text-warning" title="التقييم"><i class="bi bi-star-fill"></i> ${parseFloat(product.avgRating).toFixed(1)}</span>`;
    }

    productCard.innerHTML = `
      <div class="product-img-box position-relative">
        ${carouselHTML}
        ${badgeHTML}
      </div>
      <div class="product-card-body">
        <h5 class="product-card-title">${product.name}</h5>
        <div class="mb-1">${catBadges}</div>
        <div class="product-card-price"><i class="bi bi-tag me-1"></i>دج${product.price}${ratingHtml}</div>
        <button class="btn product-card-button">عرض التفاصيل</button>
      </div>
    `;
    productCard.querySelector('.product-card-button').addEventListener('click', () => {
      window.location.href = `product-detail.html?id=${product.id}`;
    });
    productCol.appendChild(productCard);
    container.appendChild(productCol);
  });
}

// Loads products and fetches their images for carousel use
async function loadProducts() {
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
        // fetch average rating per product from backend 
        return { ...prod, images: imgs && imgs.length > 0 ? imgs : (prod.imagePath ? [prod.imagePath] : []) };
      } catch {
        return { ...prod, images: prod.imagePath ? [prod.imagePath] : [] };
      }
    }));

    // Sort products to show newest first
    productsWithImages.sort((a, b) => {
      
      //sort by ID ( higher ID = newer)
      return b.id - a.id;
    });

    allProducts = productsWithImages;
    renderProducts(allProducts);
  } catch (error) {
    console.error('حدث خطأ أثناء تحميل المنتجات:', error);
  }
}

// --- Filtering ---
function filterAndRender() {
  const query = document.getElementById('search-bar').value.toLowerCase();
  const cat = document.getElementById('category-filter').value;
  const minPrice = parseFloat(document.getElementById('min-price').value) || null;
  const maxPrice = parseFloat(document.getElementById('max-price').value) || null;
  const minRating = parseInt(document.getElementById('rating-filter').value) || null;

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
  renderProducts(filtered);
}

// --- Event Listeners for all filters ---
document.getElementById('search-bar').addEventListener('input', filterAndRender);
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
  document.getElementById('category-filter').addEventListener('change', filterAndRender);
  document.getElementById('min-price').addEventListener('input', filterAndRender);
  document.getElementById('max-price').addEventListener('input', filterAndRender);
  document.getElementById('rating-filter').addEventListener('change', filterAndRender);
});