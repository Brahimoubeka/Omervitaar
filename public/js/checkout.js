// City and Province data
const cityProvinceData = {
  "Adrar": [],
  "Chlef": [],
  "Laghouat": [],
  "Oum El Bouaghi": [],
  "Batna": [],
  "Béjaïa": [],
  "Biskra": [],
  "Béchar": [],
  "Blida": [],
  "Bouira": [],
  "Tamanrasset": [],
  "Tébessa": [],
  "Tlemcen": [],
  "Tiaret": [],
  "Tizi Ouzou": [],
  "Algiers": [],
  "Djelfa": [],
  "Jijel": [],
  "Sétif": [],
  "Saïda": [],
  "Skikda": [],
  "Sidi Bel Abbès": [],
  "Annaba": [],
  "Guelma": [],
  "Constantine": [],
  "Médéa": [],
  "Mostaganem": [],
  "M'Sila": [],
  "Mascara": [],
  "Ouargla": [],
  "Oran": [],
  "El Bayadh": [],
  "Illizi": [],
  "Bordj Bou Arréridj": [],
  "Boumerdès": [],
  "El Tarf": [],
  "Tindouf": [],
  "Tissemsilt": [],
  "El Oued": [],
  "Khenchela": [],
  "Souk Ahras": [],
  "Tipaza": [],
  "Mila": [],
  "Aïn Defla": [],
  "Naâma": [],
  "Aïn Témouchent": [],
  "Ghardaïa": [],
  "Relizane": [],
  "Timimoun": [],
  "Bordj Badji Mokhtar": [],
  "Ouled Djellal": [],
  "Béni Abbès": [],
  "In Salah": [],
  "In Guezzam": [],
  "Touggourt": [],
  "Djanet": [],
  "El M'Ghair": [],
  "El Menia": []
};


// Delivery costs by city (Algerian wilayas)
const deliveryCosts = {
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

// Initialize page when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  calculateCartTotal();
  setupCityProvinceHandlers();
  setupFormSubmitHandler();
});

// Populates city dropdown only
function setupCityProvinceHandlers() {
  const citySelect = document.getElementById('city');
  // Province is now a free text input, so no JS population needed

  // Populate city dropdown with cityProvinceData keys
  citySelect.innerHTML = '<option value="">اختر الولاية</option>';
  Object.keys(cityProvinceData).forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    option.innerHTML = city;
    citySelect.appendChild(option);
  });

  citySelect.addEventListener('change', function() {
    updateDeliveryCost();
  });
}

// Calculates the total cost of items in the cart from localStorage
function calculateCartTotal() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  let cartTotal = 0;
  
  cart.forEach(item => {
    cartTotal += (item.price * item.quantity);
  });
  
  document.getElementById('cart-total').innerHTML = `دج${cartTotal.toFixed(2)}`;
  updateDeliveryCost(); // Update totals whenever cart is calculated
}

// Updates the delivery cost and final total based on the selected city
function updateDeliveryCost() {
  const selectedCity = document.getElementById('city').value;
  const deliveryCost = deliveryCosts[selectedCity] || 0;
  const cartTotalText = document.getElementById('cart-total').textContent;
  const cartTotal = parseFloat(cartTotalText.replace('دج', ''));
  
  const finalTotal = cartTotal + deliveryCost;
  
  document.getElementById('delivery-cost').innerHTML = `دج${deliveryCost.toFixed(2)}`;
  document.getElementById('final-total').innerHTML = `دج${finalTotal.toFixed(2)}`;
}

// New function to show stock confirmation dialog
function showStockConfirmationDialog(outOfStockProducts, availableItems) {
  const outOfStockList = outOfStockProducts.map(product => `• ${product.name || 'منتج غير محدد'}`).join('<br>');
  
  const container = document.getElementById('checkout-message');
  container.innerHTML = `
    <div class="alert alert-warning" role="alert">
      <h5 class="alert-heading">تنبيه: بعض المنتجات غير متوفرة في المخزون</h5>
      <p>المنتجات التالية غير متوفرة حالياً:</p>
      <div class="mb-3">${outOfStockList}</div>
      <p>هل تريد المتابعة مع المنتجات المتوفرة فقط أم إلغاء الطلب بالكامل؟</p>
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-success" onclick="proceedWithAvailableItems(${JSON.stringify(availableItems).replace(/"/g, '&quot;')})">
          متابعة مع المنتجات المتوفرة
        </button>
        <button type="button" class="btn btn-danger" onclick="cancelOrder()">
          إلغاء الطلب بالكامل
        </button>
      </div>
    </div>
  `;
}

// New function to proceed with only available items
async function proceedWithAvailableItems(availableItems) {
  try {
    // Update cart with only available items
    localStorage.setItem('cart', JSON.stringify(availableItems));
    
    // Recalculate totals
    calculateCartTotal();
    
    // Get form data again
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const shippingName = document.getElementById('shippingName').value.trim();
    const shippingAddress = document.getElementById('shippingAddress').value.trim();
    const city = document.getElementById('city').value;
    const province = document.getElementById('province').value;
    const department = document.getElementById('department').value.trim();
    const postalCode = document.getElementById('postalCode').value.trim();
    const street = document.getElementById('street').value.trim();

    const deliveryCost = deliveryCosts[city] || 0;
    const cartTotal = parseFloat(document.getElementById('cart-total').textContent.replace('دج', ''));
    const finalTotal = cartTotal + deliveryCost;

    const orderData = {
      firstName, 
      lastName, 
      shippingName, 
      shippingAddress, 
      city, 
      province, 
      street, 
      department, 
      postalCode, 
      items: availableItems,
      cartTotal,
      deliveryCost,
      finalTotal
    };

    const token = localStorage.getItem('token');
    
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(orderData)
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || 'تعذر معالجة الطلب.');

    localStorage.removeItem('cart');
    showMessage('شكرًا لك! تم استلام طلبك بنجاح.', 'success');
    setTimeout(() => window.location.href = 'orders.html', 2000);
    
  } catch (error) {
    console.error('Error processing checkout:', error);
    showMessage(`خطأ: ${error.message}`, 'danger');
  }
}

// New function to cancel order and redirect to products page
function cancelOrder() {
  window.location.href = 'products.html';
}

// Sets up the main form submission logic
function setupFormSubmitHandler() {
    const form = document.getElementById('checkout-form');
    const submitBtn = document.querySelector('button[type="submit"][form="checkout-form"]');
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Retrieve all form fields
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const shippingName = document.getElementById('shippingName').value.trim();
        const shippingAddress = document.getElementById('shippingAddress').value.trim();
        const city = document.getElementById('city').value;
        const province = document.getElementById('province').value;
        const department = document.getElementById('department').value.trim();
        const postalCode = document.getElementById('postalCode').value.trim();
        const street = document.getElementById('street').value.trim(); // Kept for data structure consistency

        // --- Validation ---
        if (!firstName || !lastName) {
            showMessage('الاسم واللقب مطلوبان.', 'danger');
            return;
        }
        // Phone number: exactly 10 digits
        const phonePattern = /^\d{10}$/;
        if (!phonePattern.test(shippingName)) {
            showMessage('يرجى إدخال رقم هاتف صالح مكون من 10 أرقام.', 'danger');
            document.getElementById('shippingName').focus();
            return;
        }
        if (!city || !province) {
            showMessage('المدينة والمنطقة مطلوبان.', 'danger');
            return;
        }
        // Optional fields validation (if filled)
        const postalPattern = /^\d{1,5}$/;
        if (postalCode && !postalPattern.test(postalCode)) {
            showMessage('يجب أن يتكون الرمز البريدي من 5 أرقام كحد أقصى ويحتوي على أرقام فقط.', 'danger');
            document.getElementById('postalCode').focus();
            return;
        }
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        if (cart.length === 0) {
            showMessage('سلتك فارغة.', 'danger');
            return;
        }
        // --- Prepare Order Data ---
        const deliveryCost = deliveryCosts[city] || 0;
        const cartTotal = parseFloat(document.getElementById('cart-total').textContent.replace('دج', ''));
        const finalTotal = cartTotal + deliveryCost;
        const orderData = {
            firstName, 
            lastName, 
            shippingName, 
            shippingAddress, 
            city, 
            province, 
            street, 
            department, 
            postalCode, 
            items: cart,
            cartTotal,
            deliveryCost,
            finalTotal
        };
        const token = localStorage.getItem('token');
        // --- API Request ---
        try {
            // Show spinner inside the button and disable it
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>جاري تأكيد الطلب...';
            }
            showMessage('', 'info'); // Clear message area
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify(orderData)
            });
            const result = await response.json();
            if (!response.ok) {
                // Check if the error is related to stock issues
                if (result.error && (result.error.includes('Yeterli stok yok') || result.error.includes('stok') || result.error.toLowerCase().includes('stock'))) {
                    // Extract product name from error message
                    const errorMessage = result.error;
                    const productName = errorMessage.split(':')[1]?.trim() || 'منتج غير محدد';
                    // Filter out the out-of-stock product from cart
                    const cart = JSON.parse(localStorage.getItem('cart')) || [];
                    const outOfStockProducts = [];
                    const availableItems = [];
                    cart.forEach(item => {
                        if (item.name && item.name.toLowerCase().includes(productName.toLowerCase())) {
                            outOfStockProducts.push({name: item.name});
                        } else {
                            availableItems.push(item);
                        }
                    });
                    // If we couldn't match by name, assume the first item is out of stock
                    if (outOfStockProducts.length === 0 && cart.length > 0) {
                        outOfStockProducts.push({name: productName});
                        availableItems.push(...cart.slice(1));
                    }
                    // Show confirmation dialog for stock issues
                    showStockConfirmationDialog(outOfStockProducts, availableItems);
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalBtnHTML;
                    }
                    return;
                }
                throw new Error(result.error || 'تعذر معالجة الطلب.');
            }
            localStorage.removeItem('cart');
            showMessage('شكرًا لك! تم استلام طلبك بنجاح.', 'success');
            setTimeout(() => window.location.href = 'orders.html', 2000); // Reload to clear the form and cart display
        } catch (error) {
            console.error('Error processing checkout:', error);
            showMessage(`خطأ: ${error.message}`, 'danger');
        } finally {
            // Restore button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHTML;
            }
        }
    });
}

// Displays success or error messages to the user
async function showMessage(message, type = 'success') {
  const container = document.getElementById('checkout-message');
  // If the message is about login required, append WhatsApp option, clickable login link, and copy order info button
  if (message && (message.includes('تسجيل الدخول') || message.includes('login'))) {
    // Make the login/create account part clickable
    message = message.replace(
      /(الرجاء تسجيل الدخول او انشاء حساب أولا|you must be logged in|يجب عليك تسجيل الدخول)/gi,
      `<a href='login.html' style='color:#0d6efd;text-decoration:underline;font-weight:600;'>تسجيل الدخول أو إنشاء حساب</a>`
    );
    try {
      const res = await fetch('/api/branding');
      const branding = await res.json();
      const phone = branding.phone ? branding.phone.replace(/[^\d+]/g, '') : '';
      if (phone) {
        const whatsappUrl = `https://wa.me/${phone.replace(/^\+/, '')}`;
        message += `<br><span style="font-size:1.08em;color:#0a7c3a;font-weight:500;">أو يمكنك الطلب مباشرة من هذا الرقم على <a href='${whatsappUrl}' target='_blank' style='color:#25d366;text-decoration:underline;'><i class='bi bi-whatsapp'></i> واتساب</a>: <b dir='ltr'>${phone}</b></span>`;
      }
    } catch {}
    // Add copy order info button
    message += `<br><button id='copy-order-info-btn' class='btn btn-outline-secondary btn-sm mt-2' type='button'><i class='bi bi-clipboard'></i> نسخ تفاصيل الطلب</button>`;
  }
  container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
    </div>
  `;
  // Add copy-to-clipboard logic if button exists
  setTimeout(() => {
    const btn = document.getElementById('copy-order-info-btn');
    if (btn) {
      btn.onclick = function() {
        // Gather checkout info from form and cart
        const getVal = id => (document.getElementById(id)?.value || '').trim();
        const firstName = getVal('firstName');
        const lastName = getVal('lastName');
        const shippingName = getVal('shippingName');
        const shippingAddress = getVal('shippingAddress');
        const city = getVal('city');
        const province = getVal('province');
        const street = getVal('street');
        const department = getVal('department');
        const postalCode = getVal('postalCode');
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        let orderDetails = `تفاصيل الطلب:\n`;
        orderDetails += `الاسم الكامل: ${firstName} ${lastName}\n`;
        orderDetails += `رقم الهاتف: ${shippingName}\n`;
        orderDetails += `العنوان: ${shippingAddress}, ${city}, ${province}, ${street}, ${department}, ${postalCode}\n`;
        orderDetails += `\nالمنتجات:\n`;
        cart.forEach(item => {
          orderDetails += `- ${item.name} x ${item.quantity}\n`;
        });
        orderDetails += `\nمجموع المنتجات: ${document.getElementById('cart-total')?.textContent || ''}\n`;
        orderDetails += `تكلفة التوصيل: ${document.getElementById('delivery-cost')?.textContent || ''}\n`;
        orderDetails += `المجموع النهائي: ${document.getElementById('final-total')?.textContent || ''}`;
        // Copy to clipboard
        navigator.clipboard.writeText(orderDetails).then(() => {
          btn.innerHTML = "<i class='bi bi-clipboard-check'></i> تم النسخ!";
          btn.classList.remove('btn-outline-secondary');
          btn.classList.add('btn-success');
          setTimeout(() => {
            btn.innerHTML = "<i class='bi bi-clipboard'></i> نسخ تفاصيل الطلب";
            btn.classList.remove('btn-success');
            btn.classList.add('btn-outline-secondary');
          }, 2000);
        });
      };
    }
  }, 0);
}