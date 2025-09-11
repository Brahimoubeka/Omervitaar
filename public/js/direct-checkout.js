// Cities data with delivery prices
const cities = {
  "Adrar": 1200,
  "Chlef": 800,
  "Laghouat": 1100,
  "Oum El Bouaghi": 800,
  "Batna": 800,
  "Béjaïa": 800,
  "Biskra": 1100,
  "Béchar": 1200,
  "Blida": 600,
  "Bouira": 800,
  "Tamanrasset": 1950,
  "Tébessa": 1100,
  "Tlemcen": 800,
  "Tiaret": 800,
  "Tizi Ouzou": 800,
  "Algiers": 500,
  "Djelfa": 1100,
  "Jijel": 800,
  "Sétif": 800,
  "Saïda": 900,
  "Skikda": 900,
  "Sidi Bel Abbès": 800,
  "Annaba": 800,
  "Guelma": 900,
  "Constantine": 800,
  "Médéa": 800,
  "Mostaganem": 800,
  "M'Sila": 800,
  "Mascara": 800,
  "Ouargla": 1100,
  "Oran": 800,
  "El Bayadh": 1200,
  "Illizi": 2000,
  "Bordj Bou Arréridj": 800,
  "Boumerdès": 600,
  "El Tarf": 900,
  "Tindouf": 1950,
  "Tissemsilt": 900,
  "El Oued": 1100,
  "Khenchela": 900,
  "Souk Ahras": 900,
  "Tipaza": 600,
  "Mila": 800,
  "Aïn Defla": 800,
  "Naâma": 1200,
  "Aïn Témouchent": 800,
  "Ghardaïa": 1100,
  "Relizane": 800,
  "Timimoun": 1200,
  "Bordj Badji Mokhtar": 2000,
  "Ouled Djellal": 1100,
  "Béni Abbès": 1200,
  "In Salah": 1950,
  "In Guezzam": 1950,
  "Touggourt": 1100,
  "Djanet": 1950,
  "El M'Ghair": 1100,
  "El Menia": 1100
};

// Initialize the direct checkout UI
function initDirectCheckout(product) {
  let total = product.price;
  let quantity = 1;

  const updateSummary = (deliveryPrice = 0) => {
    const subtotal = product.price * quantity;
    document.getElementById('directCheckoutProductName').textContent = `${product.name} (${quantity}x)`;
    document.getElementById('directCheckoutProductPrice').textContent = `${subtotal} دج`;
    total = subtotal + deliveryPrice;
    document.getElementById('directCheckoutTotalPrice').textContent = `${total} دج`;
  };
  updateSummary();

  // Handle quantity buttons
  const quantityInput = document.getElementById('quantity');
  const decreaseBtn = document.getElementById('decreaseQuantity');
  const increaseBtn = document.getElementById('increaseQuantity');

  decreaseBtn.addEventListener('click', () => {
    if (quantity > 1) {
      quantity--;
      quantityInput.value = quantity;
      const selectedCity = document.getElementById('city').value;
      const deliveryPrice = cities[selectedCity] || 0;
      updateSummary(deliveryPrice);
    }
  });

  increaseBtn.addEventListener('click', () => {
    if (quantity < 10) {
      quantity++;
      quantityInput.value = quantity;
      const selectedCity = document.getElementById('city').value;
      const deliveryPrice = cities[selectedCity] || 0;
      updateSummary(deliveryPrice);
    }
  });

  // Populate city dropdown with prices
  const citySelect = document.getElementById('city');
  citySelect.innerHTML = '<option value="">إختر المدينة...</option>';
  Object.entries(cities).forEach(([cityName, deliveryPrice]) => {
    const option = document.createElement('option');
    option.value = cityName;
    option.textContent = `${cityName} (التوصيل: ${deliveryPrice} دج)`;
    citySelect.appendChild(option);
  });

  // Handle city change and update total
  citySelect.addEventListener('change', function() {
    const selectedCity = this.value;
    const deliveryPrice = cities[selectedCity] || 0;
    updateSummary(deliveryPrice);
  });

  // Form validation and submission
  const form = document.getElementById('directCheckoutForm');
  const submitButton = document.getElementById('submitDirectOrder');

  // Add CSRF token to form
  const csrfToken = InputSecurity.generateCSRFToken();
  localStorage.setItem('checkout_csrf_token', csrfToken);

  submitButton.addEventListener('click', async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (!FormProtection.startSubmit()) {
      return;
    }

    try {
      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
      }

      // Validate and sanitize all inputs
      const nameInput = document.getElementById('name');
      const phoneInput = document.getElementById('phone');
      const addressInput = document.getElementById('address');
      const citySelect = document.getElementById('city');

      // Name validation
      const nameValidation = InputSecurity.validateName(nameInput.value);
      if (!nameValidation.isValid) {
        showCartMessage('الرجاء إدخال اسم صحيح (3-50 حرف، حروف عربية وإنجليزية فقط)', 'error');
        nameInput.focus();
        return;
      }
      nameInput.value = nameValidation.sanitized;

      // Phone validation
      const phoneValidation = InputSecurity.validatePhone(phoneInput.value);
      if (!phoneValidation.isValid) {
        showCartMessage('يرجى إدخال رقم هاتف صالح مكون من 9 أو 10 أرقام.', 'error');
        phoneInput.focus();
        return;
      }
      phoneInput.value = phoneValidation.sanitized;

      // Address validation
      const addressValidation = InputSecurity.validateAddress(addressInput.value);
      if (!addressValidation.isValid) {
        showCartMessage('الرجاء إدخال عنوان صحيح (3-200 حرف)', 'error');
        addressInput.focus();
        return;
      }
      addressInput.value = addressValidation.sanitized;

      // City validation
      const cityValidation = InputSecurity.validateCity(citySelect.value, cities);
      if (!cityValidation.isValid) {
        showCartMessage('الرجاء اختيار المدينة', 'error');
        citySelect.focus();
        return;
      }
      
      const selectedCity = citySelect.value;
      const deliveryPrice = cities[selectedCity] || 0;
      const currentQuantity = parseInt(document.getElementById('quantity').value);
      const cartTotal = product.price * currentQuantity;
      const finalTotal = cartTotal + deliveryPrice;
      
      // Format data for the request
      const requestData = {
        shippingName: phoneValidation.sanitized,
        shippingAddress: addressValidation.sanitized,
        city: cityValidation.sanitized,
        province: cityValidation.sanitized,
        street: addressValidation.sanitized,
        department: '',
        postalCode: '',
        firstName: nameValidation.sanitized.split(' ')[0] || nameValidation.sanitized,
        lastName: nameValidation.sanitized.split(' ').slice(1).join(' ') || '-',
        items: [{
          id: product.id,
          name: product.name,
          quantity: currentQuantity,
          price: product.price
        }],
        cartTotal: cartTotal,
        deliveryCost: deliveryPrice,
        finalTotal: finalTotal,
        _csrf: csrfToken
      };

      // Add rate limiting check
      const lastSubmitTime = localStorage.getItem('last_checkout_submit');
      const now = Date.now();
      if (lastSubmitTime && (now - parseInt(lastSubmitTime)) < 30000) { // 30 seconds
        showCartMessage('الرجاء الانتظار قليلاً قبل إرسال طلب آخر', 'error');
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
      
      // Show success message and close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('directCheckoutModal'));
      modal.hide();
      
      showCartMessage('تم تقديم طلبك بنجاح!', 'success');

      // Reset form
      form.reset();
      form.classList.remove('was-validated');
      localStorage.removeItem('checkout_csrf_token');
    } catch (error) {
      showCartMessage(error.message, 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="bi bi-check-lg me-1"></i>تأكيد الطلب';
      FormProtection.endSubmit();
    }


  });

  // Message handling function
  function showCartMessage(message, type = 'success') {
    const container = document.getElementById('cart-message-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    
    const icon = type === 'success' ? 
      '<i class="bi bi-check-circle-fill"></i>' : 
      '<i class="bi bi-exclamation-triangle-fill"></i>';
    
    const messageContent = document.createElement('span');
    messageContent.innerHTML = `${icon} ${message}`;
    alert.appendChild(messageContent);
    
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close';
    closeButton.setAttribute('data-bs-dismiss', 'alert');
    closeButton.setAttribute('aria-label', 'Close');
    alert.appendChild(closeButton);
    
    container.appendChild(alert);

    // Auto remove after 5 seconds
    setTimeout(() => {
      alert.classList.remove('show');
      setTimeout(() => alert.remove(), 150);
    }, 5000);
  }
}

// Export the initialization function
window.initDirectCheckout = initDirectCheckout;
