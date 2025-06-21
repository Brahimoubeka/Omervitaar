// cart.js

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
        <p class="text-secondary">لمواصلة التسوق <a href="products.html" style="color:var(--orange-accent,#ffbf00);text-decoration:underline;">تصفح المنتجات</a>.</p>
      </div>
    `;
    document.getElementById('cart-total').innerHTML = '';
    return;
  }

  let total = 0;
  cart.forEach((item, index) => {
    const col = document.createElement('div');
    col.className = 'col-12';

    const card = document.createElement('div');
    card.className = 'cart-item-card d-flex flex-row align-items-center mb-3 p-3';

    const cardBody = document.createElement('div');
    cardBody.className = 'flex-grow-1';

    // Product block WITHOUT image
    cardBody.innerHTML = `
      <div class="d-flex align-items-center mb-2">
        <div>
          <h5 class="card-title mb-1 fw-bold" style="color:var(--military-green,#715100);font-size:1.13em;">
            <i class="bi bi-box2 me-1"></i>${item.name}
          </h5>
          <div class="product-card-price text-warning mb-0" style="font-weight:700;">
            <i class="bi bi-tag"></i> ₺${item.price.toFixed(2)}
          </div>
        </div>
      </div>
      <div class="d-flex align-items-center mb-3 quantity-controls">
        <button class="btn btn-outline-secondary btn-sm me-2" aria-label="إنقاص" title="إنقاص الكمية"><i class="bi bi-dash-lg"></i></button>
        <input type="number" min="1" value="${item.quantity}" class="form-control form-control-sm mx-1 text-center fw-semibold" style="width: 56px;" aria-label="الكمية" />
        <button class="btn btn-outline-secondary btn-sm ms-2" aria-label="زيادة" title="زيادة الكمية"><i class="bi bi-plus-lg"></i></button>
      </div>
      <button class="btn btn-danger btn-sm w-100" style="font-weight:600;"><i class="bi bi-trash me-1"></i> إزالة</button>
    `;

    // Quantity handlers
    const minusBtn = cardBody.querySelector('button.btn-outline-secondary[aria-label="إنقاص"]');
    const plusBtn = cardBody.querySelector('button.btn-outline-secondary[aria-label="زيادة"]');
    const qtyInput = cardBody.querySelector('input[type="number"]');
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
    qtyInput.addEventListener('change', () => {
      let val = parseInt(qtyInput.value);
      if (!val || val < 1) val = 1;
      item.quantity = val;
      saveCartAndReload(cart);
    });

    // Remove handler
    const removeBtn = cardBody.querySelector('.btn-danger');
    removeBtn.addEventListener('click', () => {
      card.classList.add('animate__animated', 'animate__fadeOutRight');
      setTimeout(() => {
        cart.splice(index, 1);
        saveCartAndReload(cart);
      }, 330);
    });

    card.appendChild(cardBody);
    col.appendChild(card);
    container.appendChild(col);

    total += item.price * item.quantity;
  });

  document.getElementById('cart-total').innerHTML = `
    <span class="fw-bold" style="color:var(--military-green,#715100);font-size:1.18em;">
      <i class="bi bi-cash-coin me-1"></i>المجموع: ₺${total.toFixed(2)}
    </span>
  `;
}

function saveCartAndReload(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  loadCart();
  updateCartCounter();
}

function updateCartCounter() {
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  let total = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const el = document.getElementById('cart-counter');
  if (el) el.innerHTML = `(${total})`;
}

document.getElementById('checkout-button').addEventListener('click', function () {
  window.location.href = "checkout.html";
});

document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  updateCartCounter();
});
