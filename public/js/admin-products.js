// --- Helper for showing Bootstrap notifications (success/danger) ---
function showNotification(message, type = 'success', timeout = 3000) {
  let container = document.getElementById('admin-alert-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'admin-alert-container';
    container.style.position = 'fixed';
    container.style.top = '30px';
    container.style.right = '30px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.role = 'alert';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
  `;
  container.appendChild(alertDiv);
  setTimeout(() => {
    if (alertDiv) alertDiv.classList.remove('show');
    setTimeout(() => { if (alertDiv) alertDiv.remove(); }, 300);
  }, timeout);
}

function isValidImageFile(file) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return file && allowedTypes.includes(file.type);
}


// -------- Category Support --------

let allCategories = [];
let productsMap = {}; // Holds all products by ID

async function loadCategories() {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch('/api/admin/categories', {
      headers: { Authorization: `Bearer ${token}` }
    });
    allCategories = await response.json();
    renderCategoryCheckboxes();
  } catch (error) {
    showNotification('تعذر تحميل الفئات.', 'danger');
    allCategories = [];
  }
}

function renderCategoryCheckboxes(selected = []) {
  const catDiv = document.getElementById('category-checkboxes');
  if (!catDiv) return;
  catDiv.innerHTML = allCategories.map(cat => `
    <div class="form-check form-check-inline">
      <input class="form-check-input" type="checkbox" id="cat-${cat.id}" name="categories" value="${cat.id}" ${selected.includes(cat.id) ? "checked" : ""}>
      <label class="form-check-label" for="cat-${cat.id}">${cat.name}</label>
    </div>
  `).join('');
}

// -------- Products Display/CRUD --------

async function loadProducts() {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch('/api/admin/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const products = await response.json();
    productsMap = {}; // Reset
    const container = document.getElementById('products-container');
    if (!container) {
      showNotification('عنصر المنتجات غير موجود في الصفحة (products-container).', 'danger');
      return;
    }
    container.innerHTML = `
      <table class="admin-products-table">
        <thead>
          <tr>
            <th>الصورة</th>
            <th>اسم المنتج</th>
            <th>الفئات</th>
            <th>السعر</th>
            <th>المخزون</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody id="admin-products-table-body"></tbody>
      </table>
    `;

    const tbody = document.getElementById('admin-products-table-body');
    for (const product of products) {
      productsMap[product.id] = product; // Store in map for updates
      // Fetch all images for product
      let images = [];
      try {
        const imagesResp = await fetch(`/api/products/${product.id}/images`);
        images = await imagesResp.json();
      } catch { images = []; }
      const thumbnail = images.length > 0 ? images[0] : (product.imagePath || 'images/default-product.jpg');
      const categoryLabels = (product.categories || []).map(cat => `<span class="badge bg-secondary me-1">${cat.name}</span>`).join('');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img src="${thumbnail}" alt="${product.name}" class="product-thumb-img"></td>
        <td class="product-title-cell">${product.name}</td>
        <td>${categoryLabels}</td>
        <td><span style="color:var(--orange-accent,#ffbf00); font-weight:600;">₺${product.price}</span></td>
        <td>${product.stock}</td>
        <td class="action-btns">
          <button onclick="deleteProduct(${product.id})" class="btn btn-danger btn-sm" title="حذف"><i class="bi bi-trash"></i></button>
          <button onclick="showUpdateForm(${product.id})" class="btn btn-secondary btn-sm" title="تحديث"><i class="bi bi-pencil-square"></i></button>
          <div id="update-form-${product.id}" style="display:none;"></div>
        </td>
      `;
      tbody.appendChild(tr);
    }
  } catch (error) {
    showNotification('حدث خطأ أثناء تحميل المنتجات: ' + error.message, 'danger');
    console.error('حدث خطأ أثناء تحميل المنتجات:', error);
  }
}

let deleteProductId = null;

// ----------- DELETE PRODUCT WITH MODAL -----------
window.openDeleteModal = function(productId, productName) {
  deleteProductId = productId;
  document.getElementById('delete-product-name').innerHTML = productName;
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteProductModal'));
  deleteModal.show();
};

document.getElementById('confirmDeleteBtn').addEventListener('click', async function() {
  if (!deleteProductId) return;
  await deleteProduct(deleteProductId);
  deleteProductId = null;
  const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteProductModal'));
  deleteModal.hide();
});

// a modal to delete product
async function deleteProduct(productId) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`/api/admin/products/${productId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    let result = {};
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      result = await response.json();
    } else {
      if (response.status === 404) {
        showNotification('المنتج غير موجود أو تم حذفه بالفعل.', 'danger');
        return;
      } else {
        throw new Error('الخادم لم يرجع JSON أو حدث خطأ غير متوقع.');
      }
    }
    if (response.status === 404) {
      showNotification('المنتج غير موجود أو تم حذفه بالفعل.', 'danger');
      return;
    }
    if (!response.ok) throw new Error(result.error || result.message || 'تعذر الحذف');
    showNotification(result.message || 'تم الحذف!', 'success');
    loadProducts();
  } catch (error) {
    showNotification('حدث خطأ أثناء حذف المنتج: ' + error.message, 'danger');
    console.error('حدث خطأ أثناء حذف المنتج:', error);
  }
}

// ----------- UPDATE PRODUCT WITH MODAL -----------
window.showUpdateForm = function(productId) {
  const product = productsMap[productId];
  let productCategories = (product.categories || []).map(cat => cat.id);

  // Render the form in the modal body, not inline in table
  const container = document.getElementById('update-product-form-container');
  container.innerHTML = `
    <form id="update-form-${productId}-form">
      <div class="mb-3">
        <label class="form-label">الاسم:</label>
        <input type="text" name="name" required value="${product.name || ''}" class="form-control">
      </div>
      <div class="mb-3">
        <label class="form-label">الوصف:</label>
        <textarea name="description" class="form-control">${product.description || ''}</textarea>
      </div>
      <div class="mb-3">
        <label class="form-label">السعر:</label>
        <input type="number" name="price" required step="0.01" inputmode="decimal" value="${product.price || ''}" class="form-control">
      </div>
      <div class="mb-3">
        <label class="form-label">المخزون:</label>
        <input type="number" name="stock" required value="${product.stock || ''}" class="form-control">
        
      </div>
      <div class="mb-3">
        <label class="form-label">الفئات:</label>
        <div id="update-category-checkboxes-${productId}"></div>
      </div>
      <div class="mb-3">
        <label class="form-label">الصور (حد أقصى 5):</label>
        <input type="file" name="images" accept="image/*" multiple class="form-control">
      </div>
      <button type="submit" class="btn btn-success"><i class="bi bi-pencil-square"></i> تحديث</button>
      <div id="update-message-${productId}" class="mt-3"></div>
    </form>
  `;
  renderUpdateCategoryCheckboxes(productId, productCategories);

  // Attach submit event
  document.getElementById(`update-form-${productId}-form`).addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const form = e.target;
    const imageInput = form.querySelector('input[type="file"][name="images"]');
    const files = imageInput.files;
    if (files.length > 5) {
      showNotification('يمكنك تحميل 5 صور كحد أقصى.', 'danger');
      return;
    }
    for (const file of files) {
      if (!isValidImageFile(file)) {
        showNotification('نوع ملف الصورة غير صالح. يرجى تحميل صورة بصيغة jpeg أو png أو gif أو webp.', 'danger');
        imageInput.value = '';
        return;
      }
    }
    const formData = new FormData(form);
    formData.delete('categories');
    Array.from(document.querySelectorAll(`#update-category-checkboxes-${productId} input[name="categories"]:checked`)).forEach(checkbox => {
      formData.append('categories', checkbox.value);
    });
    formData.delete('images');
    Array.from(files).forEach(file => {
      formData.append('images', file);
    });
    
    // Validate price
    const priceValue = form.querySelector('input[name="price"]').value.replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(priceValue) || parseFloat(priceValue) < 0) {
      showNotification('حقل السعر يجب أن يكون رقمًا موجبًا فقط (مثال: 12.34).', 'danger');
      return;
    }
    
    // Validate stock
    const stockValue = form.querySelector('input[name="stock"]').value;
    if (!/^\d+$/.test(stockValue) || parseInt(stockValue) < 0) {
      showNotification('حقل المخزون يجب أن يكون عددًا صحيحًا موجبًا فقط (مثال: 5).', 'danger');
      return;
    }
    
    formData.set('price', parseFloat(priceValue));
    formData.set('stock', parseInt(stockValue));
    
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || result.message || 'تعذر التحديث!');
      showNotification(result.message || 'تم التحديث!', 'success');
      loadProducts();
      // Hide modal after success
      setTimeout(() => {
        const updateModal = bootstrap.Modal.getInstance(document.getElementById('updateProductModal'));
        if (updateModal) updateModal.hide();
      }, 1300);
    } catch (error) {
      showNotification('حدث خطأ أثناء تحديث المنتج: ' + error.message, 'danger');
      console.error('حدث خطأ أثناء تحديث المنتج:', error);
    }
  });

  setTimeout(() => renderUpdateCategoryCheckboxes(productId, productCategories), 0);

  // Show modal
  const updateModal = new bootstrap.Modal(document.getElementById('updateProductModal'));
  updateModal.show();
};

// --- Update products table to use new modals for action buttons ---
async function loadProducts() {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch('/api/admin/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const products = await response.json();
    productsMap = {};
    const container = document.getElementById('products-container');
    if (!container) {
      showNotification('عنصر المنتجات غير موجود في الصفحة (products-container).', 'danger');
      return;
    }
     // Sort products to show newest first
    products.sort((a, b) => {
      
      // sort by ID (assuming higher ID = newer)
      return b.id - a.id;
    });
    container.innerHTML = `
      <table class="admin-products-table">
        <thead>
          <tr>
            <th>الصورة</th>
            <th>اسم المنتج</th>
            <th>الفئات</th>
            <th>السعر</th>
            <th>المخزون</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody id="admin-products-table-body"></tbody>
      </table>
    `;
    const tbody = document.getElementById('admin-products-table-body');
    for (const product of products) {
      productsMap[product.id] = product;
      let images = [];
      try {
        const imagesResp = await fetch(`/api/products/${product.id}/images`);
        images = await imagesResp.json();
      } catch { images = []; }
      const thumbnail = images.length > 0 ? images[0] : (product.imagePath || 'images/default-product.jpg');
      const categoryLabels = (product.categories || []).map(cat => `<span class="badge bg-secondary me-1">${cat.name}</span>`).join('');
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img src="${thumbnail}" alt="${product.name}" class="product-thumb-img"></td>
        <td class="product-title-cell">${product.name}</td>
        <td>${categoryLabels}</td>
        <td><span style="color:var(--orange-accent,#ffbf00); font-weight:600;">₺${product.price}</span></td>
        <td>${product.stock}</td>
        <td class="action-btns">
          <button onclick="openDeleteModal(${product.id}, '${product.name.replace(/'/g, "\\'")}')" class="btn btn-danger btn-sm mb-1" title="حذف"><i class="bi bi-trash"></i></button>
          <button onclick="showUpdateForm(${product.id})" class="btn btn-success btn-sm mb-1" title="تحديث"><i class="bi bi-pencil-square"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    }
  } catch (error) {
    showNotification('حدث خطأ أثناء تحميل المنتجات: ' + error.message, 'danger');
    console.error('حدث خطأ أثناء تحميل المنتجات:', error);
  }
}


function renderUpdateCategoryCheckboxes(productId, selected = []) {
  const catDiv = document.getElementById(`update-category-checkboxes-${productId}`);
  if (!catDiv) return;
  catDiv.innerHTML = allCategories.map(cat => `
    <div class="form-check form-check-inline">
      <input class="form-check-input" type="checkbox" id="update-cat-${productId}-${cat.id}" name="categories" value="${cat.id}" ${selected.includes(cat.id) ? "checked" : ""}>
      <label class="form-check-label" for="update-cat-${productId}-${cat.id}">${cat.name}</label>
    </div>
  `).join('');
}

//add product
document.getElementById('add-product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const form = e.target;
  const imageInput = form.querySelector('input[type="file"][name="images"]');
  const files = imageInput.files;
  if (files.length > 5) {
    showNotification('يمكنك تحميل 5 صور كحد أقصى.', 'danger');
    return;
  }
  for (const file of files) {
    if (!isValidImageFile(file)) {
      showNotification('نوع ملف الصورة غير صالح. يرجى تحميل صورة بصيغة jpeg أو png أو gif أو webp.', 'danger');
      imageInput.value = '';
      return;
    }
  }
  const formData = new FormData(form);
  // Categories
  formData.delete('categories');
  Array.from(document.querySelectorAll('#category-checkboxes input[name="categories"]:checked')).forEach(checkbox => {
    formData.append('categories', checkbox.value);
  });
  formData.delete('images');
  Array.from(files).forEach(file => {
    formData.append('images', file);
  });
  
  // Validate price
  const priceValue = form.querySelector('input[name="price"]').value.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(priceValue) || parseFloat(priceValue) < 0) {
    showNotification('حقل السعر يجب أن يكون رقمًا موجبًا فقط (مثال: 12.34).', 'danger');
    return;
  }
  
  // Validate stock
  const stockValue = form.querySelector('input[name="stock"]').value;
  if (!/^\d+$/.test(stockValue) || parseInt(stockValue) < 0) {
    showNotification('حقل المخزون يجب أن يكون عددًا صحيحًا موجبًا فقط (مثال: 5).', 'danger');
    return;
  }

  formData.set('price', parseFloat(priceValue));
  formData.set('stock', parseInt(stockValue));
  
  try {
    const response = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'تعذر الإضافة!');
    showNotification(result.message || 'تمت الإضافة!', 'success');
    form.reset();
    loadProducts();
    setTimeout(() => {
      const modalEl = document.getElementById('addProductModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }, 1500);
  } catch (error) {
    showNotification('حدث خطأ أثناء إضافة المنتج: ' + error.message, 'danger');
    console.error('حدث خطأ أثناء إضافة المنتج:', error);
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  await loadCategories();
  loadProducts();
});





// --- Upload new logo ---
async function uploadLogo(file) {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('logo', file);
    try {
        const response = await fetch('/api/admin/logo', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || result.message);
        showNotification('تم تحديث الشعار بنجاح!', 'success');
        setTimeout(() => location.reload(), 1500);
    } catch (error) {
        showNotification('حدث خطأ أثناء تحديث الشعار: ' + error.message, 'danger');
    }
}

// --- Upload new slide image ---
async function uploadSlide(file, index) {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('slide', file);
    formData.append('index', index); // cover1.png, cover2.png, etc.
    try {
        const response = await fetch('/api/admin/slide', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || result.message);
        showNotification(`تم تحديث صورة السلايد رقم ${index} بنجاح!`, 'success');
        setTimeout(() => location.reload(), 1500);
    } catch (error) {
        showNotification('حدث خطأ أثناء تحديث صورة السلايد: ' + error.message, 'danger');
    }
}


// --- Logo Upload ---
document.getElementById('logoUploadForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const file = this.logo.files[0];
    if (!file || !isValidImageFile(file)) {
        showNotification('يرجى اختيار صورة شعار صالحة.', 'danger');
        return;
    }
    uploadLogo(file);
});

// --- Slide Uploads ---
document.getElementById('slideUploadForm1').addEventListener('submit', function(e) {
    e.preventDefault();
    const file = this.slide.files[0];
    if (!file || !isValidImageFile(file)) {
        showNotification('يرجى اختيار صورة سلايد صالحة.', 'danger');
        return;
    }
    uploadSlide(file, 1);
});
document.getElementById('slideUploadForm2').addEventListener('submit', function(e) {
    e.preventDefault();
    const file = this.slide.files[0];
    if (!file || !isValidImageFile(file)) {
        showNotification('يرجى اختيار صورة سلايد صالحة.', 'danger');
        return;
    }
    uploadSlide(file, 2);
});
document.getElementById('slideUploadForm3').addEventListener('submit', function(e) {
    e.preventDefault();
    const file = this.slide.files[0];
    if (!file || !isValidImageFile(file)) {
        showNotification('يرجى اختيار صورة سلايد صالحة.', 'danger');
        return;
    }
    uploadSlide(file, 3);
});




// Load current branding info into the modal
async function loadBrandingInfo() {
  const res = await fetch('/api/branding');
  const data = await res.json();
  document.getElementById('facebookLink').value = data.facebook || '';
  document.getElementById('instagramLink').value = data.instagram || '';
  document.getElementById('tiktokLink').value = data.tiktok || '';
  document.getElementById('phoneNumber').value = data.phone || '';
}

// Show branding modal and load data
document.getElementById('brandingLinksModal').addEventListener('show.bs.modal', loadBrandingInfo);

// Save branding info
document.getElementById('brandingLinksForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const payload = {
    facebook: document.getElementById('facebookLink').value,
    instagram: document.getElementById('instagramLink').value,
    tiktok: document.getElementById('tiktokLink').value,
    phone: document.getElementById('phoneNumber').value
  };
  try {
    const res = await fetch('/api/admin/branding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message);
    showNotification('تم تحديث الروابط ورقم الهاتف بنجاح!', 'success');
    setTimeout(() => location.reload(), 1500);
  } catch (error) {
    showNotification('حدث خطأ أثناء التحديث: ' + error.message, 'danger');
  }
});

// --- Delivery Prices Modal Logic (Persistent) ---
let deliveryCosts = {};

async function fetchDeliveryCosts() {
  try {
    const res = await fetch('/api/delivery-costs');
    deliveryCosts = await res.json();
  } catch {
    // fallback default
    deliveryCosts = {
      "Adrar": 400, "Chlef": 350, "Laghouat": 420, "Oum El Bouaghi": 390, "Batna": 410, "Béjaïa": 370, "Biskra": 430, "Béchar": 450, "Blida": 320, "Bouira": 360, "Tamanrasset": 600, "Tébessa": 440, "Tlemcen": 380, "Tiaret": 370, "Tizi Ouzou": 340, "Algiers": 300, "Djelfa": 410, "Jijel": 370, "Sétif": 360, "Saïda": 390, "Skikda": 380, "Sidi Bel Abbès": 370, "Annaba": 400, "Guelma": 390, "Constantine": 350, "Médéa": 330, "Mostaganem": 340, "M'Sila": 400, "Mascara": 370, "Ouargla": 500, "Oran": 350, "El Bayadh": 470, "Illizi": 650, "Bordj Bou Arréridj": 360, "Boumerdès": 320, "El Tarf": 420, "Tindouf": 700, "Tissemsilt": 390, "El Oued": 520, "Khenchela": 430, "Souk Ahras": 410, "Tipaza": 310, "Mila": 380, "Aïn Defla": 340, "Naâma": 480, "Aïn Témouchent": 370, "Ghardaïa": 530, "Relizane": 350, "Timimoun": 600, "Bordj Badji Mokhtar": 750, "Ouled Djellal": 480, "Béni Abbès": 650, "In Salah": 700, "In Guezzam": 800, "Touggourt": 550, "Djanet": 750, "El M'Ghair": 540, "El Menia": 600
    };
  }
}

function populateDeliveryPricesTable() {
  const tbody = document.getElementById('delivery-prices-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  Object.keys(deliveryCosts).forEach(city => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${city}</td>
      <td><input type="number" class="form-control form-control-sm text-center" name="${city}" value="${deliveryCosts[city]}" min="0" style="max-width:120px;"></td>
    `;
    tbody.appendChild(tr);
  });
}

document.addEventListener('DOMContentLoaded', async function() {
  await fetchDeliveryCosts();
  const deliveryPricesModal = document.getElementById('deliveryPricesModal');
  if (deliveryPricesModal) {
    deliveryPricesModal.addEventListener('show.bs.modal', populateDeliveryPricesTable);
  }
  const deliveryPricesForm = document.getElementById('delivery-prices-form');
  if (deliveryPricesForm) {
    deliveryPricesForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const token = localStorage.getItem('token');
      const inputs = deliveryPricesForm.querySelectorAll('input[type="number"]');
      const updatedCosts = {};
      inputs.forEach(input => {
        const city = input.name;
        const value = parseInt(input.value, 10);
        if (!isNaN(value) && value >= 0) {
          updatedCosts[city] = value;
        }
      });
      try {
        const res = await fetch('/api/admin/delivery-costs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(updatedCosts)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message);
        deliveryCosts = updatedCosts;
        showNotification('تم تحديث أسعار التوصيل بنجاح!', 'success');
      } catch (error) {
        showNotification('حدث خطأ أثناء تحديث أسعار التوصيل: ' + error.message, 'danger');
      }
    });
  }
});
z