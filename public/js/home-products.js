// Fetch and render dynamic category shortcuts on the homepage
async function loadHomeCategories() {
  const container = document.getElementById('homepage-category-shortcuts');
  if (!container) return;

  try {
    const res = await fetch('/api/categories');
    if (!res.ok) return;
    const categories = await res.json();
    if (!categories || categories.length === 0) return;

    container.innerHTML = categories.map(cat => {
      const icon = cat.icon || 'bi-tag';
      const color = cat.color || 'orange';
      const slug = cat.slug || cat.id;

      return `
        <a href="/categories/${slug}" class="cat-shortcut-link text-decoration-none"
          style="flex: 0 0 auto; width: 120px;">
          <div class="cat-shortcut-card shadow-sm"
            style="padding: 20px 10px 16px 10px; min-height: 120px; display: flex; flex-direction: column; align-items: center;">
            <div class="cat-shortcut-icon bg-${color}" style="width: 50px; height: 50px; font-size: 1.4rem;">
              <i class="bi ${icon}"></i>
            </div>
            <div class="cat-shortcut-title" style="font-size: 0.95rem; margin-top: 10px; text-align: center;">
              ${cat.name}
            </div>
          </div>
        </a>
      `;
    }).join('');
  } catch (err) {
    console.warn('Error loading dynamic categories:', err);
  }
}

// Fetch and render featured products for the homepage
document.addEventListener('DOMContentLoaded', async () => {
  // Load categories dynamically
  loadHomeCategories();

  const container = document.getElementById('featured-products-container');
  if (!container) return;

  try {
    const res = await fetch('/api/products/paginate?limit=4');
    if (!res.ok) throw new Error('Failed to fetch products');
    const products = await res.json();
    
    if (products && products.length > 0) {
      container.innerHTML = ''; // clear loading state
      
      products.forEach(product => {
        // Price formatting
        const hasDiscount = product.discount_price && product.discount_price < product.price;
        const currentPrice = hasDiscount ? product.discount_price : product.price;
        
        let priceHtml = `<span class="fw-bold fs-5 text-primary-brand">${currentPrice} د.ج</span>`;
        if (hasDiscount) {
          priceHtml += ` <small class="text-muted text-decoration-line-through ms-2">${product.price} د.ج</small>`;
        }

        // Ratings
        const rating = product.avgRating ? Number(product.avgRating).toFixed(1) : '5.0';
        const reviewCount = product.reviewCount || 0;
        
        const cardHTML = `
          <div class="col-xl-3 col-lg-4 col-md-6 mb-4">
            <div class="product-card">
              <div class="product-badge">${hasDiscount ? 'تخفيض' : 'جديد'}</div>
              <a href="/products/${product.slug}" class="product-img-wrapper">
                <img src="${product.thumbnail}" alt="${product.name}" class="product-img lazy-image" loading="lazy" width="300" height="250" decoding="async">
              </a>
              <div class="product-details">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <h3 class="product-title"><a href="/products/${product.slug}">${product.name}</a></h3>
                  <div class="product-rating">
                    <i class="bi bi-star-fill text-warning"></i> <span>${rating}</span>
                  </div>
                </div>
                <div class="product-category text-muted small mb-3">
                  ${product.categories && product.categories.length > 0 ? product.categories[0].name : 'منتج طبيعي'}
                </div>
                <div class="d-flex justify-content-between align-items-center mt-auto">
                  <div class="product-price">
                    ${priceHtml}
                  </div>
                  <button class="btn btn-primary-brand btn-sm rounded-circle add-to-cart-btn" 
                          data-id="${product.id}" 
                          data-name="${product.name}" 
                          data-price="${currentPrice}" 
                          data-img="${product.thumbnail}" 
                          aria-label="أضف إلى السلة">
                    <i class="bi bi-cart-plus"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
      });

      // Add to cart functionality
      const addBtns = container.querySelectorAll('.add-to-cart-btn');
      addBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const { id, name, img } = btn.dataset;
          const price = parseFloat(btn.dataset.price) || 0;
          
          let cart = JSON.parse(localStorage.getItem('cart') || '[]');
          const itemIndex = cart.findIndex(item => item.id == id);
          if (itemIndex > -1) {
            cart[itemIndex].quantity += 1;
          } else {
            cart.push({ id, name, price, img, quantity: 1 });
          }
          localStorage.setItem('cart', JSON.stringify(cart));
          
          // Trigger header update if the function exists
          if (typeof updateCartCounter === 'function') {
            updateCartCounter();
          }

          // Show a simple toast or alert (can be improved based on site's design system)
          const toast = document.createElement('div');
          toast.className = 'toast-notification';
          toast.innerHTML = `<i class="bi bi-check-circle-fill me-2 text-success"></i> تم إضافة ${name} إلى السلة`;
          document.body.appendChild(toast);
          
          setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
              toast.classList.remove('show');
              setTimeout(() => toast.remove(), 300);
            }, 3000);
          }, 10);
        });
      });
    } else {
      container.innerHTML = '<div class="col-12 text-center text-muted py-4">لا توجد منتجات حاليا</div>';
    }
  } catch (error) {
    console.error('Error fetching featured products:', error);
    container.innerHTML = '<div class="col-12 text-center text-danger py-4">حدث خطأ أثناء تحميل المنتجات.</div>';
  }
});
