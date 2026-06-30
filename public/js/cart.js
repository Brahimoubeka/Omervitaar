// cart.js

// Delivery costs by city (Algerian wilayas)
const deliveryCosts = {
  "Adrar": 1200, "Chlef": 800, "Laghouat": 1100, "Oum El Bouaghi": 800, "Batna": 800, "Béjaïa": 800,
  "Biskra": 1100, "Béchar": 1200, "Blida": 600, "Bouira": 800, "Tamanrasset": 1950, "Tébessa": 1100,
  "Tlemcen": 800, "Tiaret": 800, "Tizi Ouzou": 800, "Algiers": 500, "Djelfa": 1100, "Jijel": 800,
  "Sétif": 800, "Saïda": 900, "Skikda": 900, "Sidi Bel Abbès": 800, "Annaba": 800, "Guelma": 900,
  "Constantine": 800, "Médéa": 800, "Mostaganem": 800, "M'Sila": 800, "Mascara": 800, "Ouargla": 1100,
  "Oran": 800, "El Bayadh": 1200, "Illizi": 2000, "Bordj Bou Arréridj": 800, "Boumerdès": 600,
  "El Tarf": 900, "Tindouf": 1950, "Tissemsilt": 900, "El Oued": 1100, "Khenchela": 900,
  "Souk Ahras": 900, "Tipaza": 600, "Mila": 800, "Aïn Defla": 800, "Naâma": 1200, "Aïn Témouchent": 800,
  "Ghardaïa": 1100, "Relizane": 800, "Timimoun": 1200, "Bordj Badji Mokhtar": 2000, "Ouled Djellal": 1100,
  "Béni Abbès": 1200, "In Salah": 1950, "In Guezzam": 1950, "Touggourt": 1100, "Djanet": 1950,
  "El M'Ghair": 1100, "El Menia": 1100
};

function loadCart() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const container = document.getElementById('cart-container');
  container.innerHTML = '';

  // Empty cart
  if (cart.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-cart-x display-2 mb-3 text-warning"></i>
        <p class="fs-5 fw-semibold mb-2" style="color:var(--military-green,#715100);">سلتك فارغة!</p>
        <p class="text-secondary">لمواصلة التسوق <a href="products" style="color:var(--orange-accent,#ffbf00);text-decoration:underline;">تصفح المنتجات</a>.</p>
      </div>
    `;
    if(document.getElementById('cart-total')) document.getElementById('cart-total').textContent = 'دج0.00';
    updateDeliveryCost(0);
    // Disable checkout button if cart is empty
    const checkoutBtn = document.getElementById('checkout-button');
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.classList.add('btn-secondary');
      checkoutBtn.classList.remove('btn-primary');
      checkoutBtn.style.opacity = '0.6';
      checkoutBtn.style.cursor = 'not-allowed';
    }
    return;
  }

  let total = 0;
  cart.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'cart-item-card d-flex flex-row align-items-center mb-2 p-2 border rounded-3 bg-white shadow-sm';

    // Product block WITH small image and compact text
    card.innerHTML = `
      <!-- Image Preview -->
      <div class="me-3" style="width: 60px; height: 60px; flex-shrink: 0; border-radius: 6px; overflow: hidden; border: 1px solid #eee;">
        <img src="${item.img || item.thumbnail || item.image || 'images/default-product.jpg'}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;">
      </div>
      <!-- Product Details & Controls -->
      <div class="flex-grow-1 d-flex flex-column justify-content-between h-100">
        <div class="d-flex justify-content-between align-items-start">
          <h6 class="card-title mb-1 fw-bold text-truncate" style="color:var(--military-green,#715100); font-size:0.9rem; max-width: 140px;" title="${item.name}">
            ${item.name}
          </h6>
          <button class="btn btn-link text-danger p-0 ms-2 remove-btn" aria-label="إزالة"><i class="bi bi-x-circle-fill fs-5"></i></button>
        </div>
        <div class="d-flex align-items-center justify-content-between mt-2">
          <div class="product-card-price text-warning mb-0" style="font-size: 0.9rem; font-weight:700;">
            <i class="bi bi-tag me-1"></i> دج${(parseFloat(item.price) || 0).toFixed(2)}
          </div>
          <div class="d-flex align-items-center quantity-controls bg-light rounded-pill px-1 border">
            <button class="btn btn-sm minus-btn" style="padding: 0 6px;" aria-label="إنقاص"><i class="bi bi-dash"></i></button>
            <input type="number" min="1" value="${item.quantity}" class="form-control form-control-sm text-center fw-semibold qty-input border-0 bg-transparent" style="width: 35px; padding: 0;" aria-label="الكمية" readonly />
            <button class="btn btn-sm plus-btn" style="padding: 0 6px;" aria-label="زيادة"><i class="bi bi-plus"></i></button>
          </div>
        </div>
      </div>
    `;

    // Quantity handlers
    const minusBtn = card.querySelector('.minus-btn');
    const plusBtn = card.querySelector('.plus-btn');
    minusBtn.addEventListener('click', () => {
      if (item.quantity > 1) {
        item.quantity -= 1;
        saveCartAndReload(cart);
      }
    });
    plusBtn.addEventListener('click', () => {
      item.quantity += 1;
      saveCartAndReload(cart);
    });

    // Remove handler
    const removeBtn = card.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => {
      card.classList.add('animate__animated', 'animate__fadeOutRight');
      setTimeout(() => {
        cart.splice(index, 1);
        saveCartAndReload(cart);
      }, 330);
    });

    container.appendChild(card);

    total += (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1);
  });

  if(document.getElementById('cart-total')) {
    document.getElementById('cart-total').textContent = `دج${total.toFixed(2)}`;
  }
  updateDeliveryCost(total);

  // Enable checkout button if cart has items
  const checkoutBtn = document.getElementById('checkout-button');
  if (checkoutBtn) {
    checkoutBtn.disabled = false;
    checkoutBtn.classList.remove('btn-secondary');
    checkoutBtn.classList.add('btn-primary');
    checkoutBtn.style.opacity = '';
    checkoutBtn.style.cursor = '';
  }
}

function updateDeliveryCost(cartTotalOverride = null) {
  let cartTotal = cartTotalOverride;
  if (cartTotal === null) {
    const cartTotalText = document.getElementById('cart-total')?.textContent || 'دج0';
    cartTotal = parseFloat(cartTotalText.replace('دج', '')) || 0;
  }
  
  const citySelect = document.getElementById('city');
  const selectedCity = citySelect ? citySelect.value : '';
  const deliveryCost = deliveryCosts[selectedCity] || 0;
  
  const finalTotal = cartTotal + deliveryCost;
  
  if(document.getElementById('delivery-cost')) {
    document.getElementById('delivery-cost').textContent = `دج${deliveryCost.toFixed(2)}`;
  }
  if(document.getElementById('final-total')) {
    document.getElementById('final-total').textContent = `دج${finalTotal.toFixed(2)}`;
  }
}

function saveCartAndReload(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  loadCart();
  if (typeof updateCartCounter === 'function') {
    updateCartCounter();
  }
}

function setupCityProvinceHandlers() {
  const citySelect = document.getElementById('city');
  if (!citySelect) return;
  
  Object.keys(deliveryCosts).forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    option.innerHTML = city;
    citySelect.appendChild(option);
  });

  citySelect.addEventListener('change', function() {
    updateDeliveryCost();
  });
}

async function showMessage(message, type = 'success') {
  const container = document.getElementById('checkout-message');
  if (!container) return;
  
  if (message && (message.includes('تسجيل الدخول') || message.includes('login'))) {
    message = message.replace(
      /(الرجاء تسجيل الدخول او انشاء حساب أولا|you must be logged in|يجب عليك تسجيل الدخول)/gi,
      `الرجاء تسجيل الدخول او انشاء حساب أولا<br><a href='/login' style='color:#0d6efd;text-decoration:underline;font-weight:600;'>تسجيل الدخول أو إنشاء حساب</a>`
    );
  }
  container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show text-start" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
    </div>
  `;
}

function setupFormSubmitHandler() {
  const form = document.getElementById('checkout-form');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('checkout-button');
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const shippingName = document.getElementById('shippingName').value.trim();
    const city = document.getElementById('city').value;
    const province = document.getElementById('province').value.trim();
    
    // Hardcoded empty strings for removed optional fields to satisfy backend
    const shippingAddress = ""; 
    const department = "";
    const postalCode = "";
    const street = "";

    const phonePattern = /^\d{9,10}$/;
    if (!phonePattern.test(shippingName)) {
        showMessage('يرجى إدخال رقم هاتف صالح مكون من 9 أو 10 أرقام.', 'danger');
        document.getElementById('shippingName').focus();
        return;
    }

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        showMessage('سلتك فارغة.', 'danger');
        return;
    }

    const deliveryCost = deliveryCosts[city] || 0;
    const cartTotal = parseFloat(document.getElementById('cart-total').textContent.replace('دج', ''));
    const finalTotal = cartTotal + deliveryCost;

    const orderData = {
        firstName, lastName, shippingName, shippingAddress, 
        city, province, street, department, postalCode, 
        items: cart, cartTotal, deliveryCost, finalTotal
    };

    const token = localStorage.getItem('token');

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>جاري تأكيد الطلب...';
        }
        showMessage('', 'info');

        let userEmail = '';
        if (token) {
            try {
                const res = await fetch('/api/user/profile', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const userData = await res.json();
                    userEmail = userData.email;
                }
            } catch (err) {}
        }
        if (userEmail) orderData.email = userEmail;

        const endpoint = token ? '/api/orders' : '/api/guest-orders';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();
        
        // Handle out-of-stock API errors gracefully if they occur
        if (!response.ok) {
            if (result.error && (result.error.includes('stok') || result.error.toLowerCase().includes('stock'))) {
                showMessage(`بعض المنتجات غير متوفرة في المخزون: ${result.error}`, 'danger');
                return;
            }
            throw new Error(result.error || 'تعذر معالجة الطلب.');
        }

        localStorage.removeItem('cart');
        showMessage('شكرًا لك! تم استلام طلبك بنجاح.', 'success');
        setTimeout(() => window.location.href = '/orders', 2000);

    } catch (error) {
        console.error('Error processing checkout:', error);
        showMessage(`خطأ: ${error.message}`, 'danger');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHTML;
        }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupCityProvinceHandlers();
  loadCart();
  setupFormSubmitHandler();
  if (typeof updateCartCounter === 'function') {
    updateCartCounter();
  }
});
