// Helper function to render star ratings as 5 classic yellow stars
function renderStars(rating) {
  let starsHtml = '';
  for (let i = 1; i <= 5; i++) {
    starsHtml += `<span class="star" style="font-size:1.3em; color: ${i <= rating ? '#ffc107' : '#e4e5e9'};">&#9733;</span>`;
  }
  return starsHtml;
}


function getQueryParams() {
  const params = {};
  const queryString = window.location.search.slice(1);
  queryString.split('&').forEach(param => {
    const [key, value] = param.split('=');
    params[key] = decodeURIComponent(value);
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

// MAIN FUNCTION: loadProductDetail
async function loadProductDetail() {
  const params = getQueryParams();
  productId = params.id;

  if (!productId) {
    document.getElementById('product-detail-container').innerHTML = '<p>لم يتم تحديد معرف المنتج.</p>';
    return;
  }

  try {
    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) throw new Error('المنتج غير موجود.');
    const product = await response.json();

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
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Kapat"></button>
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
                <span>Fare tekerleği ile yakınlaştırabilir, sürükleyerek hareket ettirebilirsiniz</span>
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

    // --- CATEGORY BADGES with icon ---
    if (product.categories && product.categories.length > 0) {
      const categoriesDiv = document.createElement('div');
      categoriesDiv.className = "mb-2";
      categoriesDiv.innerHTML = `
        <span class="fw-bold" style="color:var(--military-green,#715100);font-size:1.1em">
          <i class="bi bi-tags"></i> كategoriler:
        </span>
        ${product.categories.map(cat =>
          `<span class="badge bg-success mx-1" style="background:var(--orange-accent,#ffbf00);color:var(--dark-charcoal,#2c2c2c);font-weight:500;font-size:0.91em;padding:.32em .62em;letter-spacing:.02em;"><i class="bi bi-tag"></i> ${cat.name}</span>`
        ).join('')}
      `;
      detailsCol.appendChild(categoriesDiv);
    }

    // Price 
    const price = document.createElement('p');
    price.classList.add('fs-5', 'mb-3');
    price.innerHTML = `<span class="product-card-price" style="color: rgb(255, 115, 0);font-weight:700;font-size:1.28em;">
    <i class="bi bi-tag"></i> ₺${product.price}
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
    addToCartButton.classList.add('btn', 'btn-primary', 'mt-3', 'px-4', 'py-2');
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
      showCartMessage('<i class="bi bi-check-circle-fill"></i> تم إضافة المنتج إلى السلة!', 'success');
    });
    detailsCol.appendChild(addToCartButton);

    // Go to Cart Button
    const goToCartButton = document.createElement('button');
    goToCartButton.innerHTML = `<i class="bi bi-cart me-1"></i>سلتي`;
    goToCartButton.classList.add('btn', 'btn-outline-secondary', 'mt-3', 'ms-2', 'px-4', 'py-2');
    goToCartButton.addEventListener('click', () => {
      window.location.href = 'cart.html';
    });
    detailsCol.appendChild(goToCartButton);

    // --- RELATED PRODUCTS ---
    renderRelatedProducts(product);
    loadAllCategoriesAndRenderShortcuts(product.categories || []);

    loadReviews(productId);
  } catch (error) {
    console.error('Error loading product details:', error);
    document.getElementById('product-detail-container').innerHTML = `<p>Hata: ${error.message}</p>`;
  }
}


// Show 3 related products in the same category
async function renderRelatedProducts(product) {
  // Find all category IDs for this product
  const mainCatIds = (product.categories || []).map(cat => cat.id);
  if (!mainCatIds.length) {
    document.getElementById('related-products-row').innerHTML = '';
    return;
  }
  // We'll use only the first category for backend query (as the API supports single category param)
  const mainCat = mainCatIds[0];
  try {
    const resp = await fetch(`/api/products?category=${mainCat}&limit=6`);
    let products = await resp.json();

    // Filter out products that are NOT in any of the current product's categories 
    products = products.filter(p =>
      p.id !== product.id &&
      Array.isArray(p.categories) &&
      p.categories.some(cat => mainCatIds.includes(cat.id))
    );

    if (!products.length) {
      document.getElementById('related-products-row').innerHTML = '';
      return;
    }
    // Only last 3 (skip current, already filtered)
    products = products.slice(0, 3);

    document.getElementById('related-products-row').innerHTML = `
  <div class="related-products-box my-4">
    <h4 class="mb-3" style="color:var(--military-green,#715100);"><i class="bi bi-grid-3x3-gap me-2"></i>منتجات مشابهة</h4>
    <div class="row g-3">
      ${products.map(p => `
        <div class="col-12 col-md-4">
          <a href="product-detail.html?id=${p.id}" class="text-decoration-none">
            <div class="card related-product-card h-100 shadow-sm">
              <img src="${(p.thumbnail || 'images/default-product.jpg')}" class="card-img-top related-product-img">
              <div class="card-body d-flex flex-column py-2 px-2">
                <h5 class="card-title" style="color:var(--military-green,#715100);font-size:0.98em;font-weight:700">${p.name}</h5>
                <span style="color: rgb(255, 115, 0);font-weight:600;">₺${p.price}</span>
                <div class="mt-auto">
                  ${(p.categories || []).map(cat =>
                    `<span class="badge bg-light border text-dark me-1" style="font-size:0.90em;padding:.25em .48em;"><i class="bi bi-tag"></i> ${cat.name}</span>`
                  ).join('')}
                </div>
              </div>
            </div>
          </a>
        </div>
      `).join('')}
    </div>
  </div>
`;

  } catch {
    document.getElementById('related-products-row').innerHTML = '';
  }
}
//load reviews
async function loadReviews(productId) {
  try {
    const response = await fetch(`/api/products/${productId}/reviews`);
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
  }
}

function showCartMessage(message, type = 'success') {
  const container = document.getElementById('cart-message-container');
  const alertId = `alert-${Date.now()}`;
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.role = 'alert';
  alertDiv.id = alertId;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Kapat"></button>
  `;
  container.appendChild(alertDiv);
  setTimeout(() => {
    const alert = bootstrap.Alert.getOrCreateInstance(alertDiv);
    alert.close();
  }, 3000);
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
  if (!token) {
    alert('يجب عليك تسجيل الدخول لترك تعليق.');
    return;
  }
  const rating = document.querySelector('input[name="rating"]:checked')?.value;
  const comment = document.getElementById('comment').value;
  const reviewMessageDiv = document.getElementById('review-message');
  if (!rating) {
    reviewMessageDiv.innerHTML = `<div class="alert alert-danger">يرجى اختيار تقييم.</div>`;
    return;
  }
  try {
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
  }
});

//helper to load all categories:
async function loadAllCategoriesAndRenderShortcuts(selectedCategories = []) {
  try {
    const resp = await fetch('/api/categories');
    const allCats = await resp.json();
    const row = document.getElementById('product-categories-row');
    row.innerHTML = `
      <div class="col-12 d-flex flex-wrap gap-2 justify-content-center mt-3">
        ${allCats.map(cat => `
          <a href="products.html?category=${cat.id}" class="btn btn-light border shadow-sm px-3 py-2 fw-semibold" style="border-radius:14px;color:var(--military-green,#715100);background:linear-gradient(90deg,#fff7e6 70%,#fff 100%);font-size:1em;">
            <i class="bi bi-tag-fill me-2" style="color:var(--orange-accent,#ffbf00);"></i>${cat.name}
          </a>
        `).join('')}
        <button id="product-share-btn" class="btn btn-outline-success px-3 py-2 fw-semibold" style="border-radius:14px;font-size:1em;">
          <i class="bi bi-share-fill"></i> مشاركة
        </button>
      </div>
    `;
    setupShareButton();
  } catch (e) {
    // fallback: show nothing or an error
    document.getElementById('product-categories-row').innerHTML = '';
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
  const carousel = new bootstrap.Carousel(modalCarousel);
  
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


