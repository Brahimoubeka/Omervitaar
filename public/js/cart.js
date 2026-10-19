// cart.js - Dynamic Delivery Companies, Wilayas & Cart Management

// Default delivery costs by city (Algerian wilayas) with home & desk rates
const defaultDeliveryRates = {
  "Adrar": { home: 1200, desk: 800 },
  "Chlef": { home: 800, desk: 500 },
  "Laghouat": { home: 1100, desk: 700 },
  "Oum El Bouaghi": { home: 800, desk: 500 },
  "Batna": { home: 800, desk: 500 },
  "Béjaïa": { home: 800, desk: 500 },
  "Biskra": { home: 1100, desk: 700 },
  "Béchar": { home: 1200, desk: 800 },
  "Blida": { home: 600, desk: 400 },
  "Bouira": { home: 800, desk: 500 },
  "Tamanrasset": { home: 1950, desk: 1400 },
  "Tébessa": { home: 1100, desk: 700 },
  "Tlemcen": { home: 800, desk: 500 },
  "Tiaret": { home: 800, desk: 500 },
  "Tizi Ouzou": { home: 800, desk: 500 },
  "Algiers": { home: 500, desk: 350 },
  "Djelfa": { home: 1100, desk: 700 },
  "Jijel": { home: 800, desk: 500 },
  "Sétif": { home: 800, desk: 500 },
  "Saïda": { home: 900, desk: 600 },
  "Skikda": { home: 900, desk: 600 },
  "Sidi Bel Abbès": { home: 800, desk: 500 },
  "Annaba": { home: 800, desk: 500 },
  "Guelma": { home: 900, desk: 600 },
  "Constantine": { home: 800, desk: 500 },
  "Médéa": { home: 800, desk: 500 },
  "Mostaganem": { home: 800, desk: 500 },
  "M'Sila": { home: 800, desk: 500 },
  "Mascara": { home: 800, desk: 500 },
  "Ouargla": { home: 1100, desk: 700 },
  "Oran": { home: 800, desk: 500 },
  "El Bayadh": { home: 1200, desk: 800 },
  "Illizi": { home: 2000, desk: 1500 },
  "Bordj Bou Arréridj": { home: 800, desk: 500 },
  "Boumerdès": { home: 600, desk: 400 },
  "El Tarf": { home: 900, desk: 600 },
  "Tindouf": { home: 1950, desk: 1400 },
  "Tissemsilt": { home: 900, desk: 600 },
  "El Oued": { home: 1100, desk: 700 },
  "Khenchela": { home: 900, desk: 600 },
  "Souk Ahras": { home: 900, desk: 600 },
  "Tipaza": { home: 600, desk: 400 },
  "Mila": { home: 800, desk: 500 },
  "Aïn Defla": { home: 800, desk: 500 },
  "Naâma": { home: 1200, desk: 800 },
  "Aïn Témouchent": { home: 800, desk: 500 },
  "Ghardaïa": { home: 1100, desk: 700 },
  "Relizane": { home: 800, desk: 500 },
  "Timimoun": { home: 1200, desk: 800 },
  "Bordj Badji Mokhtar": { home: 2000, desk: 1500 },
  "Ouled Djellal": { home: 1100, desk: 700 },
  "Béni Abbès": { home: 1200, desk: 800 },
  "In Salah": { home: 1950, desk: 1400 },
  "In Guezzam": { home: 1950, desk: 1400 },
  "Touggourt": { home: 1100, desk: 700 },
  "Djanet": { home: 1950, desk: 1400 },
  "El M'Ghair": { home: 1100, desk: 700 },
  "El Menia": { home: 1100, desk: 700 }
};

let activeDeliveryRates = { ...defaultDeliveryRates };
let deliveryCosts = {};
Object.keys(defaultDeliveryRates).forEach(c => {
  deliveryCosts[c] = defaultDeliveryRates[c].home;
});

let availableDeliveryCompanies = [];
let selectedDeliveryCompanyId = null;
let selectedDeliveryCompanyName = '';
let selectedDeliveryType = 'home'; // 'home' or 'desk'

// Promo & Free Delivery State
let appliedCartPromo = null;
let isCartFreeDelivery = false;
let storewideFreeDelivery = false;
let freeDeliveryProductsList = [];

async function checkCartFreeDeliveryStatus() {
  try {
    const res = await fetch('/api/delivery/free-delivery-status');
    if (res.ok) {
      const data = await res.json();
      storewideFreeDelivery = !!data.storewide_free_delivery;
      freeDeliveryProductsList = Array.isArray(data.free_delivery_products) ? data.free_delivery_products : [];
    }
  } catch (e) {
    console.warn('Could not check free delivery status:', e);
  }
}

function evaluateCartFreeDelivery(cart) {
  if (!cart || cart.length === 0) return false;
  if (storewideFreeDelivery) return true;
  return cart.some(item => {
    const pId = parseInt(item.id || item.productId || item.product_id, 10);
    return freeDeliveryProductsList.some(p => {
      const id = typeof p === 'object' && p !== null ? p.id : p;
      return parseInt(id, 10) === pId;
    }) || item.is_free_delivery === true;
  });
}

function getCityDeliveryCost(city, type = selectedDeliveryType) {
  if (!city) return 0;
  const rate = activeDeliveryRates[city];
  if (!rate) return deliveryCosts[city] || 0;
  const homeP = rate.home !== undefined ? rate.home : (rate.home_price !== undefined ? parseFloat(rate.home_price) : 0);
  const deskP = rate.desk !== undefined ? rate.desk : (rate.desk_price !== undefined ? parseFloat(rate.desk_price) : homeP);
  return type === 'desk' ? deskP : homeP;
}

function updateDeliveryBadges(selectedCity) {
  const homeBadge = document.getElementById('cartHomePriceBadge');
  const deskBadge = document.getElementById('cartDeskPriceBadge');
  if (!selectedCity) {
    if (homeBadge) homeBadge.textContent = '-- دج';
    if (deskBadge) deskBadge.textContent = '-- دج';
    return;
  }
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const hasItems = cart.length > 0;
  const isFree = hasItems && (isCartFreeDelivery || Boolean(appliedCartPromo && appliedCartPromo.free_delivery));
  if (isFree) {
    if (homeBadge) homeBadge.textContent = '0 دج (مجاني)';
    if (deskBadge) deskBadge.textContent = '0 دج (مجاني)';
    return;
  }
  const homeP = getCityDeliveryCost(selectedCity, 'home');
  const deskP = getCityDeliveryCost(selectedCity, 'desk');
  if (homeBadge) homeBadge.textContent = `${homeP} دج`;
  if (deskBadge) deskBadge.textContent = `${deskP} دج`;
}

const WILAYA_CODES = {
  "Adrar": "1", "Chlef": "2", "Laghouat": "3", "Oum El Bouaghi": "4", "Batna": "5",
  "Béjaïa": "6", "Biskra": "7", "Béchar": "8", "Blida": "9", "Bouira": "10",
  "Tamanrasset": "11", "Tébessa": "12", "Tlemcen": "13", "Tiaret": "14", "Tizi Ouzou": "15",
  "Algiers": "16", "Djelfa": "17", "Jijel": "18", "Sétif": "19", "Saïda": "20",
  "Skikda": "21", "Sidi Bel Abbès": "22", "Annaba": "23", "Guelma": "24", "Constantine": "25",
  "Médéa": "26", "Mostaganem": "27", "M'Sila": "28", "Mascara": "29", "Ouargla": "30",
  "Oran": "31", "El Bayadh": "32", "Illizi": "33", "Bordj Bou Arréridj": "34", "Boumerdès": "35",
  "El Tarf": "36", "Tindouf": "37", "Tissemsilt": "38", "El Oued": "39", "Khenchela": "40",
  "Souk Ahras": "41", "Tipaza": "42", "Mila": "43", "Aïn Defla": "44", "Naâma": "45",
  "Aïn Témouchent": "46", "Ghardaïa": "47", "Relizane": "48", "Timimoun": "49", "Bordj Badji Mokhtar": "50",
  "Ouled Djellal": "51", "Béni Abbès": "52", "In Salah": "53", "In Guezzam": "54", "Touggourt": "55",
  "Djanet": "56", "El M'Ghair": "57", "El Menia": "58"
};

function populateCitySelect() {
  const citySelect = document.getElementById('city');
  if (!citySelect) return;
  const currentVal = citySelect.value;
  citySelect.innerHTML = '<option value="">اختر الولاية...</option>';

  const sortedCities = Object.keys(activeDeliveryRates).sort((a, b) => {
    const rateA = activeDeliveryRates[a] || {};
    const rateB = activeDeliveryRates[b] || {};
    const numA = parseInt(rateA.city_code || WILAYA_CODES[a] || '999', 10);
    const numB = parseInt(rateB.city_code || WILAYA_CODES[b] || '999', 10);
    return numA - numB;
  });

  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const hasItems = cart.length > 0;
  const isFree = hasItems && (isCartFreeDelivery || Boolean(appliedCartPromo && appliedCartPromo.free_delivery));

  sortedCities.forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    const rate = activeDeliveryRates[city] || {};
    const rawCode = rate.city_code || WILAYA_CODES[city] || '';
    const numCode = rawCode ? (parseInt(rawCode, 10) || rawCode) : '';
    const cost = isFree ? 0 : getCityDeliveryCost(city, selectedDeliveryType);
    const prefix = numCode ? `${numCode}- ` : '';
    option.textContent = `${prefix}${city} (${cost} دج)`;
    citySelect.appendChild(option);
  });

  if (currentVal && activeDeliveryRates[currentVal]) {
    citySelect.value = currentVal;
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
  let rawDeliveryCost = getCityDeliveryCost(selectedCity, selectedDeliveryType);
  
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const hasItems = cart.length > 0;
  isCartFreeDelivery = evaluateCartFreeDelivery(cart);

  const isFree = hasItems && (isCartFreeDelivery || Boolean(appliedCartPromo && appliedCartPromo.free_delivery));
  const deliveryCost = isFree ? 0 : rawDeliveryCost;

  // Calculate discount
  let discountAmount = 0;
  if (appliedCartPromo) {
    if (appliedCartPromo.discount_type === 'percentage') {
      discountAmount = (cartTotal * appliedCartPromo.discount_value) / 100;
      if (appliedCartPromo.max_discount && discountAmount > appliedCartPromo.max_discount) {
        discountAmount = appliedCartPromo.max_discount;
      }
    } else if (appliedCartPromo.discount_type === 'fixed') {
      discountAmount = Math.min(appliedCartPromo.discount_value, cartTotal);
    }
  }

  const finalTotal = Math.max(0, cartTotal - discountAmount) + deliveryCost;

  // Update Free Delivery Banner visibility
  const banner = document.getElementById('cartFreeDeliveryBanner');
  if (banner) {
    banner.style.display = isFree ? 'block' : 'none';
  }

  // Update Discount Row
  const discountRow = document.getElementById('cartDiscountRow');
  const promoNameEl = document.getElementById('cartAppliedPromoName');
  const discountAmountEl = document.getElementById('cartDiscountAmount');
  if (discountRow && promoNameEl && discountAmountEl) {
    if (appliedCartPromo && discountAmount > 0) {
      discountRow.style.setProperty('display', 'flex', 'important');
      promoNameEl.textContent = appliedCartPromo.code;
      discountAmountEl.textContent = `-دج${discountAmount.toFixed(2)}`;
    } else {
      discountRow.style.setProperty('display', 'none', 'important');
    }
  }
  
  if (document.getElementById('delivery-cost')) {
    const typeLabel = selectedCity ? (selectedDeliveryType === 'desk' ? ' (المكتب)' : ' (المنزل)') : '';
    if (isFree && selectedCity) {
      document.getElementById('delivery-cost').innerHTML = `<span class="badge bg-success">0 دج (توصيل مجاني 🚚)</span>`;
    } else {
      document.getElementById('delivery-cost').textContent = `دج${deliveryCost.toFixed(2)}${typeLabel}`;
    }
  }
  if (document.getElementById('final-total')) {
    document.getElementById('final-total').textContent = `دج${finalTotal.toFixed(2)}`;
  }
  updateDeliveryBadges(selectedCity);
}

async function applyCartPromoCode() {
  const input = document.getElementById('cartPromoCodeInput');
  const feedback = document.getElementById('cartPromoFeedback');
  const btn = document.getElementById('cartApplyPromoBtn');
  if (!input || !feedback) return;

  const code = input.value.trim().toUpperCase();
  if (!code) {
    feedback.className = 'small mt-1 text-danger';
    feedback.textContent = 'الرجاء إدخال كود الخصم أولاً.';
    feedback.style.display = 'block';
    return;
  }

  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const cartTotalText = document.getElementById('cart-total')?.textContent || 'دج0';
  const cartTotal = parseFloat(cartTotalText.replace('دج', '')) || 0;

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    }

    const res = await fetch('/api/promo-codes/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        items: cart,
        cartTotal
      })
    });

    const data = await res.json();
    if (!res.ok) {
      appliedCartPromo = null;
      updateDeliveryCost(cartTotal);
      feedback.className = 'small mt-1 text-danger';
      feedback.textContent = data.error || 'كود الخصم غير صالح';
      feedback.style.display = 'block';
      return;
    }

    appliedCartPromo = {
      code: data.code,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      discount_amount: data.discount_amount,
      free_delivery: !!data.free_delivery,
      max_discount: data.max_discount
    };

    input.disabled = true;
    if (btn) {
      btn.textContent = 'إلغاء';
      btn.className = 'btn btn-outline-danger fw-bold';
      btn.onclick = removeCartPromoCode;
    }

    feedback.className = 'small mt-1 text-success fw-bold';
    feedback.textContent = `تم تطبيق الكوبون بنجاح: ${data.message || ''}`;
    feedback.style.display = 'block';

    updateDeliveryCost(cartTotal);
  } catch (err) {
    feedback.className = 'small mt-1 text-danger';
    feedback.textContent = 'حدث خطأ أثناء فحص الكود.';
    feedback.style.display = 'block';
  } finally {
    if (btn && !appliedCartPromo) {
      btn.disabled = false;
      btn.textContent = 'تطبيق';
      btn.className = 'btn btn-outline-primary fw-bold';
      btn.onclick = applyCartPromoCode;
    } else if (btn) {
      btn.disabled = false;
    }
  }
}

function removeCartPromoCode() {
  appliedCartPromo = null;
  const input = document.getElementById('cartPromoCodeInput');
  const feedback = document.getElementById('cartPromoFeedback');
  const btn = document.getElementById('cartApplyPromoBtn');

  if (input) {
    input.value = '';
    input.disabled = false;
  }
  if (btn) {
    btn.textContent = 'تطبيق';
    btn.className = 'btn btn-outline-primary fw-bold';
    btn.onclick = applyCartPromoCode;
  }
  if (feedback) {
    feedback.style.display = 'none';
  }

  updateDeliveryCost();
}

function loadCart() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  isCartFreeDelivery = evaluateCartFreeDelivery(cart);

  const container = document.getElementById('cart-container');
  if (!container) return;
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

  // Enable checkout button
  const checkoutBtn = document.getElementById('checkout-button');
  if (checkoutBtn) {
    checkoutBtn.disabled = false;
    checkoutBtn.classList.remove('btn-secondary');
    checkoutBtn.classList.add('btn-primary');
    checkoutBtn.style.opacity = '';
    checkoutBtn.style.cursor = '';
  }
}

function saveCartAndReload(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  loadCart();
  if (typeof updateCartCounter === 'function') {
    updateCartCounter();
  }
}

// Fetch rates for a specific delivery company
async function fetchCartRatesForCompany(companyId) {
  try {
    const url = companyId ? `/api/delivery-costs?company_id=${companyId}` : '/api/delivery-costs';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.ratesMap && Object.keys(data.ratesMap).length > 0) {
        activeDeliveryRates = data.ratesMap;
        deliveryCosts = {};
        Object.keys(data.ratesMap).forEach(c => {
          const item = data.ratesMap[c];
          deliveryCosts[c] = item.home !== undefined ? item.home : (item.home_price || 0);
        });
      }
    }
  } catch (err) {
    console.warn('Could not fetch delivery costs for company:', err);
  }

  populateCitySelect();
  updateDeliveryCost();
}

async function setupCityProvinceHandlers() {
  const compSelect = document.getElementById('cartDeliveryCompany');
  const citySelect = document.getElementById('city');

  const compContainer = compSelect ? (compSelect.closest('.col-md-6') || compSelect.parentElement) : null;

  // Load available companies
  try {
    const res = await fetch('/api/delivery-companies');
    if (res.ok) {
      const companies = await res.json();
      if (Array.isArray(companies)) {
        availableDeliveryCompanies = companies;
        if (compSelect) {
          compSelect.innerHTML = '';
          if (companies.length === 0) {
            if (compContainer) compContainer.style.display = 'none';
            compSelect.removeAttribute('required');
            selectedDeliveryCompanyId = null;
            selectedDeliveryCompanyName = '';
          } else {
            if (compContainer) compContainer.style.display = '';
            compSelect.setAttribute('required', 'required');
            companies.forEach(c => {
              const opt = document.createElement('option');
              opt.value = c.id;
              opt.textContent = c.name + (c.is_default ? ' (الافتراضية)' : '');
              if (c.is_default) opt.selected = true;
              compSelect.appendChild(opt);
            });
            const defaultComp = companies.find(c => c.is_default) || companies[0];
            selectedDeliveryCompanyId = defaultComp ? defaultComp.id : companies[0].id;
            selectedDeliveryCompanyName = defaultComp ? defaultComp.name : companies[0].name;
            compSelect.value = selectedDeliveryCompanyId;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not load delivery companies in cart:', err);
  }

  if (compSelect) {
    compSelect.addEventListener('change', async function() {
      selectedDeliveryCompanyId = parseInt(this.value, 10);
      const selectedOpt = this.options[this.selectedIndex];
      selectedDeliveryCompanyName = selectedOpt ? selectedOpt.textContent.replace(' (الافتراضية)', '').trim() : '';
      await fetchCartRatesForCompany(selectedDeliveryCompanyId);
    });
  }

  // Fetch initial rates for the selected company
  await fetchCartRatesForCompany(selectedDeliveryCompanyId);

  if (citySelect) {
    citySelect.addEventListener('change', function() {
      updateDeliveryCost();
    });
  }

  // Setup delivery type buttons (Home vs Stopdesk)
  const homeRadio = document.getElementById('cartDeliveryHome');
  const deskRadio = document.getElementById('cartDeliveryDesk');

  const handleCartDeliveryTypeChange = (newType) => {
    selectedDeliveryType = newType;
    populateCitySelect();
    updateDeliveryCost();

    if (homeRadio && deskRadio) {
      const homeLabel = homeRadio.closest('label');
      const deskLabel = deskRadio.closest('label');
      if (newType === 'home') {
        if (homeLabel) {
          homeLabel.style.borderColor = 'var(--orange-accent, #ffbf00)';
          homeLabel.style.backgroundColor = '#fffdf5';
        }
        if (deskLabel) {
          deskLabel.style.borderColor = '#dee2e6';
          deskLabel.style.backgroundColor = '#fff';
        }
      } else {
        if (deskLabel) {
          deskLabel.style.borderColor = 'var(--orange-accent, #ffbf00)';
          deskLabel.style.backgroundColor = '#fffdf5';
        }
        if (homeLabel) {
          homeLabel.style.borderColor = '#dee2e6';
          homeLabel.style.backgroundColor = '#fff';
        }
      }
    }
  };

  if (homeRadio) {
    homeRadio.addEventListener('change', () => {
      if (homeRadio.checked) handleCartDeliveryTypeChange('home');
    });
  }
  if (deskRadio) {
    deskRadio.addEventListener('change', () => {
      if (deskRadio.checked) handleCartDeliveryTypeChange('desk');
    });
  }
  handleCartDeliveryTypeChange('home');
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
    const provinceEl = document.getElementById('province');
    const province = provinceEl ? provinceEl.value.trim() : '';
    const compSelect = document.getElementById('cartDeliveryCompany');

    const phonePattern = /^\d{9,10}$/;
    if (!phonePattern.test(shippingName)) {
        showMessage('يرجى إدخال رقم هاتف صالح مكون من 9 أو 10 أرقام.', 'danger');
        document.getElementById('shippingName').focus();
        return;
    }

    if (!city) {
        showMessage('الرجاء اختيار الولاية.', 'danger');
        document.getElementById('city').focus();
        return;
    }

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        showMessage('سلتك فارغة.', 'danger');
        return;
    }

    const deliveryCost = getCityDeliveryCost(city, selectedDeliveryType);
    const cartTotal = parseFloat(document.getElementById('cart-total').textContent.replace('دج', '')) || 0;
    
    let discountAmount = 0;
    if (appliedCartPromo) {
      if (appliedCartPromo.discount_type === 'percentage') {
        discountAmount = (cartTotal * appliedCartPromo.discount_value) / 100;
        if (appliedCartPromo.max_discount && discountAmount > appliedCartPromo.max_discount) {
          discountAmount = appliedCartPromo.max_discount;
        }
      } else if (appliedCartPromo.discount_type === 'fixed') {
        discountAmount = Math.min(appliedCartPromo.discount_value, cartTotal);
      }
    }
    const isFree = isCartFreeDelivery || (appliedCartPromo && appliedCartPromo.free_delivery);
    const finalDeliveryCost = isFree ? 0 : deliveryCost;
    const finalTotal = Math.max(0, cartTotal - discountAmount) + finalDeliveryCost;

    const compName = selectedDeliveryCompanyName || (compSelect?.options[compSelect.selectedIndex]?.textContent || 'شركة التوصيل').replace(' (الافتراضية)', '').trim();
    const typeLabel = selectedDeliveryType === 'desk' ? 'استلام من المكتب (Stopdesk)' : 'توصيل للمنزل';
    const formattedAddress = `[شركة: ${compName}] [${typeLabel}] ${province ? 'البلدية/العنوان: ' + province : ''}`.trim();

    const orderData = {
        firstName, lastName, shippingName, 
        shippingAddress: formattedAddress,
        city, province, street: province, 
        department: compName, postalCode: '',
        items: cart, cartTotal, deliveryCost: finalDeliveryCost, finalTotal,
        deliveryType: selectedDeliveryType,
        deliveryCompanyId: selectedDeliveryCompanyId,
        deliveryCompanyName: compName,
        promoCode: appliedCartPromo ? appliedCartPromo.code : null
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

document.addEventListener('DOMContentLoaded', async () => {
  await checkCartFreeDeliveryStatus();
  setupCityProvinceHandlers();
  loadCart();
  setupFormSubmitHandler();
  if (typeof updateCartCounter === 'function') {
    updateCartCounter();
  }
});
