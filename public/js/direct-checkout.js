// direct-checkout.js - Dynamic Delivery Companies, Cities & Order Processing

// Default fallback cities data with home and desk delivery prices
const defaultCitiesRates = {
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

let activeDeliveryRates = { ...defaultCitiesRates };
let cities = {};
Object.keys(defaultCitiesRates).forEach(c => {
  cities[c] = defaultCitiesRates[c].home;
});

let availableDeliveryCompanies = [];
let selectedDeliveryCompanyId = null;
let selectedDeliveryCompanyName = '';
let selectedDeliveryType = 'home'; // 'home' or 'desk'
let currentProduct = null;
let currentQuantity = 1;

// Helper: compute delivery cost for a city and type
function getDeliveryPrice(cityName, type = selectedDeliveryType) {
  if (!cityName) return 0;
  const rate = activeDeliveryRates[cityName];
  if (!rate) return cities[cityName] || 0;
  const homeP = rate.home !== undefined ? rate.home : (rate.home_price !== undefined ? parseFloat(rate.home_price) : 0);
  const deskP = rate.desk !== undefined ? rate.desk : (rate.desk_price !== undefined ? parseFloat(rate.desk_price) : homeP);
  return type === 'desk' ? deskP : homeP;
}

// Update badges on the radio buttons
function updateDeliveryBadges(cityName) {
  const homeBadge = document.getElementById('directHomePriceBadge');
  const deskBadge = document.getElementById('directDeskPriceBadge');
  if (!cityName) {
    if (homeBadge) homeBadge.textContent = '-- دج';
    if (deskBadge) deskBadge.textContent = '-- دج';
    return;
  }
  const homeP = getDeliveryPrice(cityName, 'home');
  const deskP = getDeliveryPrice(cityName, 'desk');
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

// Populate the city dropdown
function populateDirectCityDropdown() {
  const citySelect = document.getElementById('city');
  if (!citySelect) return;
  const currentVal = citySelect.value;
  citySelect.innerHTML = '<option value="">إختر الولاية...</option>';

  const sortedCities = Object.keys(activeDeliveryRates).sort((a, b) => {
    const rateA = activeDeliveryRates[a] || {};
    const rateB = activeDeliveryRates[b] || {};
    const numA = parseInt(rateA.city_code || WILAYA_CODES[a] || '999', 10);
    const numB = parseInt(rateB.city_code || WILAYA_CODES[b] || '999', 10);
    return numA - numB;
  });

  sortedCities.forEach(cityName => {
    const option = document.createElement('option');
    option.value = cityName;
    const rate = activeDeliveryRates[cityName] || {};
    const rawCode = rate.city_code || WILAYA_CODES[cityName] || '';
    const numCode = rawCode ? (parseInt(rawCode, 10) || rawCode) : '';
    const p = getDeliveryPrice(cityName, selectedDeliveryType);
    const prefix = numCode ? `${numCode}- ` : '';
    option.textContent = `${prefix}${cityName} (${p} دج)`;
    citySelect.appendChild(option);
  });

  if (currentVal && activeDeliveryRates[currentVal]) {
    citySelect.value = currentVal;
  }
}

let appliedDirectPromo = null;
let isProductFreeDelivery = false;

// Update summary prices and totals
function updateDirectSummary() {
  const citySelect = document.getElementById('city');
  const selectedCity = citySelect ? citySelect.value : '';
  const baseDeliveryPrice = getDeliveryPrice(selectedCity, selectedDeliveryType);
  const isFreeShip = isProductFreeDelivery || (appliedDirectPromo && appliedDirectPromo.free_delivery);
  const effectiveDeliveryPrice = isFreeShip ? 0 : baseDeliveryPrice;

  if (currentProduct) {
    const subtotal = currentProduct.price * currentQuantity;
    const prodNameEl = document.getElementById('directCheckoutProductName');
    const prodPriceEl = document.getElementById('directCheckoutProductPrice');
    if (prodNameEl) prodNameEl.textContent = `${currentProduct.name} (${currentQuantity}x)`;
    if (prodPriceEl) prodPriceEl.textContent = `${subtotal} دج`;

    const deliveryEl = document.getElementById('directCheckoutDeliveryPrice');
    if (deliveryEl) {
      if (isFreeShip) {
        deliveryEl.innerHTML = '<span class="text-success fw-bold"><i class="bi bi-gift-fill me-1"></i>0 دج (مجاني)</span>';
      } else {
        const typeLabel = selectedCity ? (selectedDeliveryType === 'desk' ? ' (المكتب)' : ' (المنزل)') : '';
        deliveryEl.textContent = `${baseDeliveryPrice} دج${typeLabel}`;
      }
    }

    // Promo code discount row
    let discountAmount = 0;
    const discountRow = document.getElementById('directCheckoutDiscountRow');
    const discountAmountEl = document.getElementById('directCheckoutDiscountAmount');
    const promoNameEl = document.getElementById('directAppliedPromoName');

    if (appliedDirectPromo && !appliedDirectPromo.free_delivery) {
      if (appliedDirectPromo.discount_type === 'percentage') {
        discountAmount = Math.round((subtotal * appliedDirectPromo.discount_value) / 100);
      } else if (appliedDirectPromo.discount_type === 'fixed') {
        discountAmount = Math.min(subtotal, appliedDirectPromo.discount_value);
      }
      if (discountRow) discountRow.style.setProperty('display', 'flex', 'important');
      if (promoNameEl) promoNameEl.textContent = appliedDirectPromo.code;
      if (discountAmountEl) discountAmountEl.textContent = `-${discountAmount} دج`;
    } else {
      if (discountRow) discountRow.style.setProperty('display', 'none', 'important');
    }

    const total = Math.max(0, subtotal - discountAmount) + effectiveDeliveryPrice;
    const totalEl = document.getElementById('directCheckoutTotalPrice');
    if (totalEl) totalEl.textContent = `${total} دج`;
  }

  updateDeliveryBadges(selectedCity);
}

// Global promo code helper functions for product detail quick checkout
window.applyDirectPromoCode = async function() {
  const input = document.getElementById('directPromoCodeInput');
  const btn = document.getElementById('directApplyPromoBtn');
  const feedback = document.getElementById('directPromoFeedback');
  const code = (input?.value || '').trim();

  if (!code) {
    if (feedback) {
      feedback.style.display = 'block';
      feedback.className = 'small mt-1 text-danger';
      feedback.textContent = 'يرجى إدخال كود الخصم أولاً';
    }
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
  }

  try {
    const citySelect = document.getElementById('city');
    const selectedCity = citySelect ? citySelect.value : '';
    const baseDelivery = getDeliveryPrice(selectedCity, selectedDeliveryType);
    const subtotal = (currentProduct?.price || 0) * currentQuantity;

    const res = await fetch('/api/promo-codes/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        items: [{
          id: currentProduct.id,
          name: currentProduct.name,
          price: currentProduct.price,
          quantity: currentQuantity
        }],
        cartTotal: subtotal,
        deliveryCost: baseDelivery
      })
    });

    const data = await res.json();
    if (!res.ok || !data.valid) {
      appliedDirectPromo = null;
      if (feedback) {
        feedback.style.display = 'block';
        feedback.className = 'small mt-1 text-danger';
        feedback.textContent = data.error || 'كود الخصم غير صالح';
      }
    } else {
      appliedDirectPromo = data;
      if (feedback) {
        feedback.style.display = 'block';
        feedback.className = 'small mt-1 text-success fw-bold d-flex align-items-center justify-content-between';
        feedback.innerHTML = `
          <span><i class="bi bi-check-circle-fill me-1"></i>${data.message}</span>
          <a href="#" onclick="removeDirectPromoCode(event)" class="text-danger small text-decoration-none ms-2">إلغاء</a>
        `;
      }
      if (input) input.disabled = true;
      if (btn) btn.style.display = 'none';
    }
  } catch (err) {
    console.error('Error applying promo code:', err);
    if (feedback) {
      feedback.style.display = 'block';
      feedback.className = 'small mt-1 text-danger';
      feedback.textContent = 'حدث خطأ في التحقق من الكود';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'تطبيق';
    }
    updateDirectSummary();
  }
};

window.removeDirectPromoCode = function(e) {
  if (e) e.preventDefault();
  appliedDirectPromo = null;
  const input = document.getElementById('directPromoCodeInput');
  const btn = document.getElementById('directApplyPromoBtn');
  const feedback = document.getElementById('directPromoFeedback');

  if (input) {
    input.disabled = false;
    input.value = '';
  }
  if (btn) btn.style.display = '';
  if (feedback) {
    feedback.style.display = 'none';
    feedback.innerHTML = '';
  }
  updateDirectSummary();
};

// Fetch rates for a specific company
async function fetchRatesForCompany(companyId) {
  try {
    const url = companyId ? `/api/delivery-costs?company_id=${companyId}` : '/api/delivery-costs';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.ratesMap && Object.keys(data.ratesMap).length > 0) {
        activeDeliveryRates = data.ratesMap;
        cities = {};
        Object.keys(data.ratesMap).forEach(cityName => {
          const item = data.ratesMap[cityName];
          cities[cityName] = item.home !== undefined ? item.home : (item.home_price || 0);
        });
      }
    }
  } catch (err) {
    console.warn('Could not fetch rates for company, using fallback:', err);
  }

  populateDirectCityDropdown();
  updateDirectSummary();
}

// Load delivery companies and initialize company dropdown
async function initDeliveryCompanies() {
  const compSelect = document.getElementById('directDeliveryCompany');
  const compContainer = compSelect ? (compSelect.closest('.col-md-6') || compSelect.parentElement) : null;
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

            // Pick default or first active company
            const defaultComp = companies.find(c => c.is_default) || companies[0];
            selectedDeliveryCompanyId = defaultComp ? defaultComp.id : companies[0].id;
            selectedDeliveryCompanyName = defaultComp ? defaultComp.name : companies[0].name;
            compSelect.value = selectedDeliveryCompanyId;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not load delivery companies:', err);
  }

  // Fetch rates for the selected company
  await fetchRatesForCompany(selectedDeliveryCompanyId);
}

// Setup radio buttons & listeners once DOM is ready
function setupDirectDeliveryListeners() {
  const compSelect = document.getElementById('directDeliveryCompany');
  if (compSelect) {
    compSelect.addEventListener('change', async function () {
      selectedDeliveryCompanyId = parseInt(this.value, 10);
      const selectedOpt = this.options[this.selectedIndex];
      selectedDeliveryCompanyName = selectedOpt ? selectedOpt.textContent.replace(' (الافتراضية)', '').trim() : '';
      await fetchRatesForCompany(selectedDeliveryCompanyId);
    });
  }

  const citySelect = document.getElementById('city');
  if (citySelect) {
    citySelect.addEventListener('change', function () {
      updateDirectSummary();
    });
  }

  const homeRadio = document.getElementById('directDeliveryHome');
  const deskRadio = document.getElementById('directDeliveryDesk');

  const handleTypeChange = (type) => {
    selectedDeliveryType = type;
    populateDirectCityDropdown();
    updateDirectSummary();

    if (homeRadio && deskRadio) {
      const homeLabel = homeRadio.closest('label');
      const deskLabel = deskRadio.closest('label');
      if (type === 'home') {
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
      if (homeRadio.checked) handleTypeChange('home');
    });
  }
  if (deskRadio) {
    deskRadio.addEventListener('change', () => {
      if (deskRadio.checked) handleTypeChange('desk');
    });
  }
  handleTypeChange('home');
}

// Main initialization called from product-detail.js
function initDirectCheckout(product) {
  currentProduct = product;
  currentQuantity = 1;
  appliedDirectPromo = null;
  isProductFreeDelivery = Boolean(product.is_free_delivery);

  // Check storewide free delivery status
  fetch('/api/delivery/free-delivery-status')
    .then(r => r.json())
    .then(data => {
      if (data.storewide_free_delivery || (data.free_delivery_products && data.free_delivery_products.some(p => p.id === product.id))) {
        isProductFreeDelivery = true;
      }
      const banner = document.getElementById('directFreeDeliveryBanner');
      if (banner) banner.style.display = isProductFreeDelivery ? 'block' : 'none';
      updateDirectSummary();
    })
    .catch(() => {});

  const quantityInput = document.getElementById('quantity');
  if (quantityInput) quantityInput.value = currentQuantity;

  // Handle quantity buttons
  const decreaseBtn = document.getElementById('decreaseQuantity');
  const increaseBtn = document.getElementById('increaseQuantity');

  if (decreaseBtn) {
    decreaseBtn.onclick = () => {
      if (currentQuantity > 1) {
        currentQuantity--;
        if (quantityInput) quantityInput.value = currentQuantity;
        updateDirectSummary();
      }
    };
  }

  if (increaseBtn) {
    increaseBtn.onclick = () => {
      if (currentQuantity < (product.stock || 10)) {
        currentQuantity++;
        if (quantityInput) quantityInput.value = currentQuantity;
        updateDirectSummary();
      }
    };
  }

  updateDirectSummary();

  // Setup form submission
  const form = document.getElementById('directCheckoutForm');
  const submitButton = document.getElementById('submitDirectOrder');

  const csrfToken = (window.InputSecurity && InputSecurity.generateCSRFToken) ? InputSecurity.generateCSRFToken() : 'direct_csrf';
  localStorage.setItem('checkout_csrf_token', csrfToken);

  if (submitButton && form) {
    submitButton.onclick = async (e) => {
      e.preventDefault();

      if (window.FormProtection && !FormProtection.startSubmit()) {
        return;
      }

      try {
        if (!form.checkValidity()) {
          form.classList.add('was-validated');
          return;
        }

        const nameInput = document.getElementById('name');
        const phoneInput = document.getElementById('phone');
        const addressInput = document.getElementById('address');
        const citySelect = document.getElementById('city');
        const compSelect = document.getElementById('directDeliveryCompany');

        const trimmedName = (nameInput?.value || '').trim();
        const trimmedPhone = (phoneInput?.value || '').trim();
        const trimmedAddress = (addressInput?.value || '').trim();
        const selectedCity = citySelect?.value || '';

        // Name validation
        const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]{3,50}$/;
        if (!nameRegex.test(trimmedName)) {
          showDirectCartMessage('الرجاء إدخال اسم صحيح (3-50 حرف، حروف عربية أو إنجليزية فقط)', 'error');
          nameInput?.focus();
          return;
        }

        // Phone validation
        const phoneRegex = /^[0-9]{9,10}$/;
        if (!phoneRegex.test(trimmedPhone)) {
          showDirectCartMessage('يرجى إدخال رقم هاتف صالح مكون من 9 أو 10 أرقام.', 'error');
          phoneInput?.focus();
          return;
        }



        // City validation
        if (!selectedCity) {
          showDirectCartMessage('الرجاء اختيار الولاية', 'error');
          citySelect?.focus();
          return;
        }

        const isFreeShip = isProductFreeDelivery || (appliedDirectPromo && appliedDirectPromo.free_delivery);
        const deliveryPrice = isFreeShip ? 0 : getDeliveryPrice(selectedCity, selectedDeliveryType);
        const cartTotal = currentProduct.price * currentQuantity;
        let discountAmount = 0;
        if (appliedDirectPromo && !appliedDirectPromo.free_delivery) {
          if (appliedDirectPromo.discount_type === 'percentage') {
            discountAmount = Math.round((cartTotal * appliedDirectPromo.discount_value) / 100);
          } else if (appliedDirectPromo.discount_type === 'fixed') {
            discountAmount = Math.min(cartTotal, appliedDirectPromo.discount_value);
          }
        }
        const finalTotal = Math.max(0, cartTotal - discountAmount) + deliveryPrice;

        const compName = selectedDeliveryCompanyName || (compSelect?.options[compSelect.selectedIndex]?.textContent || 'شركة التوصيل').replace(' (الافتراضية)', '').trim();
        const typeLabel = selectedDeliveryType === 'desk' ? 'استلام من المكتب (Stopdesk)' : 'توصيل للمنزل';
        const formattedAddress = `[شركة: ${compName}] [${typeLabel}] ${trimmedAddress}`.trim();

        const requestData = {
          shippingName: trimmedPhone,
          shippingAddress: formattedAddress,
          city: selectedCity,
          province: selectedCity,
          street: trimmedAddress,
          department: compName,
          postalCode: '',
          firstName: trimmedName.split(' ')[0] || trimmedName,
          lastName: trimmedName.split(' ').slice(1).join(' ') || '-',
          items: [{
            id: currentProduct.id,
            name: currentProduct.name,
            quantity: currentQuantity,
            price: currentProduct.price
          }],
          cartTotal: cartTotal,
          deliveryCost: deliveryPrice,
          deliveryType: selectedDeliveryType,
          deliveryCompanyId: selectedDeliveryCompanyId,
          deliveryCompanyName: compName,
          finalTotal: finalTotal,
          promoCode: appliedDirectPromo ? appliedDirectPromo.code : null,
          _csrf: csrfToken
        };

        // Rate limiting check
        const lastSubmitTime = localStorage.getItem('last_checkout_submit');
        const now = Date.now();
        if (lastSubmitTime && (now - parseInt(lastSubmitTime, 10)) < 15000) {
          showDirectCartMessage('الرجاء الانتظار قليلاً قبل إرسال طلب آخر', 'error');
          return;
        }
        localStorage.setItem('last_checkout_submit', now.toString());

        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جاري المعالجة...';

        const response = await fetch('/api/guest-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify(requestData)
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'حدث خطأ أثناء معالجة الطلب');
        }

        showDirectCartMessage('تم تقديم طلبك بنجاح! سنتواصل معك هاتفياً لتأكيد الطلبية.', 'success');
        form.reset();
        form.classList.remove('was-validated');
        localStorage.removeItem('checkout_csrf_token');

        // Reset to defaults
        currentQuantity = 1;
        if (quantityInput) quantityInput.value = 1;
        if (compSelect && selectedDeliveryCompanyId) compSelect.value = selectedDeliveryCompanyId;
        populateDirectCityDropdown();
        updateDirectSummary();

      } catch (error) {
        showDirectCartMessage(error.message, 'error');
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="bi bi-check-lg me-1"></i>تأكيد الطلب';
        if (window.FormProtection) FormProtection.endSubmit();
      }
    };
  }
}

// Show alert message in direct checkout form
function showDirectCartMessage(message, type = 'success') {
  const container = document.getElementById('cart-message-container');
  if (!container) {
    alert(message);
    return;
  }
  const alert = document.createElement('div');
  alert.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
  const icon = type === 'success' ? '<i class="bi bi-check-circle-fill me-2"></i>' : '<i class="bi bi-exclamation-triangle-fill me-2"></i>';
  alert.innerHTML = `<span>${icon} ${message}</span><button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
  container.appendChild(alert);
  setTimeout(() => {
    alert.classList.remove('show');
    setTimeout(() => alert.remove(), 150);
  }, 6000);
}

// Initialize as soon as DOM loads so dropdowns are always populated
document.addEventListener('DOMContentLoaded', () => {
  setupDirectDeliveryListeners();
  initDeliveryCompanies();
});

// Also trigger immediately if script loads after DOM ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setupDirectDeliveryListeners();
  initDeliveryCompanies();
}

window.initDirectCheckout = initDirectCheckout;
