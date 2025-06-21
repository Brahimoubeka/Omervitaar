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
  "Adrar": 400,
  "Chlef": 350,
  "Laghouat": 420,
  "Oum El Bouaghi": 390,
  "Batna": 410,
  "Béjaïa": 370,
  "Biskra": 430,
  "Béchar": 450,
  "Blida": 320,
  "Bouira": 360,
  "Tamanrasset": 600,
  "Tébessa": 440,
  "Tlemcen": 380,
  "Tiaret": 370,
  "Tizi Ouzou": 340,
  "Algiers": 300,
  "Djelfa": 410,
  "Jijel": 370,
  "Sétif": 360,
  "Saïda": 390,
  "Skikda": 380,
  "Sidi Bel Abbès": 370,
  "Annaba": 400,
  "Guelma": 390,
  "Constantine": 350,
  "Médéa": 330,
  "Mostaganem": 340,
  "M'Sila": 400,
  "Mascara": 370,
  "Ouargla": 500,
  "Oran": 350,
  "El Bayadh": 470,
  "Illizi": 650,
  "Bordj Bou Arréridj": 360,
  "Boumerdès": 320,
  "El Tarf": 420,
  "Tindouf": 700,
  "Tissemsilt": 390,
  "El Oued": 520,
  "Khenchela": 430,
  "Souk Ahras": 410,
  "Tipaza": 310,
  "Mila": 380,
  "Aïn Defla": 340,
  "Naâma": 480,
  "Aïn Témouchent": 370,
  "Ghardaïa": 530,
  "Relizane": 350,
  "Timimoun": 600,
  "Bordj Badji Mokhtar": 750,
  "Ouled Djellal": 480,
  "Béni Abbès": 650,
  "In Salah": 700,
  "In Guezzam": 800,
  "Touggourt": 550,
  "Djanet": 750,
  "El M'Ghair": 540,
  "El Menia": 600
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
  
  document.getElementById('cart-total').innerHTML = `₺${cartTotal.toFixed(2)}`;
  updateDeliveryCost(); // Update totals whenever cart is calculated
}

// Updates the delivery cost and final total based on the selected city
function updateDeliveryCost() {
  const selectedCity = document.getElementById('city').value;
  const deliveryCost = deliveryCosts[selectedCity] || 0;
  const cartTotalText = document.getElementById('cart-total').textContent;
  const cartTotal = parseFloat(cartTotalText.replace('₺', ''));
  
  const finalTotal = cartTotal + deliveryCost;
  
  document.getElementById('delivery-cost').innerHTML = `₺${deliveryCost.toFixed(2)}`;
  document.getElementById('final-total').innerHTML = `₺${finalTotal.toFixed(2)}`;
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
    const cartTotal = parseFloat(document.getElementById('cart-total').textContent.replace('₺', ''));
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
    document.getElementById('checkout-form').addEventListener('submit', async (e) => {
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
            showMessage('الاسم والكنية مطلوبان.', 'danger');
            return;
        }
        
        const phonePattern = /^0\d{10}$/;
        if (!phonePattern.test(shippingName)) {
            showMessage('يرجى إدخال رقم هاتف صالح يبدأ بـ 0 ويتكون من 11 رقمًا.', 'danger');
            document.getElementById('shippingName').focus();
            return;
        }
        
        if (!shippingAddress) {
            showMessage('يرجى إدخال عنوان التوصيل.', 'danger');
            document.getElementById('shippingAddress').focus();
            return;
        }
        
        if (!city || !province) {
            showMessage('المدينة والمنطقة مطلوبان.', 'danger');
            return;
        }

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
        const cartTotal = parseFloat(document.getElementById('cart-total').textContent.replace('₺', ''));
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
        }
    });
}

// Displays success or error messages to the user
function showMessage(message, type = 'success') {
  const container = document.getElementById('checkout-message');
  container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
    </div>
  `;
}