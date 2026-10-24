// This file manages the admin orders view.
// It loads all orders, groups them, and allows for status updates and archiving.
// It includes pagination to show orders in increments.

// --- Helper for handling 401 authentication errors ---
function handleAuthError(response) {
  if (response.status === 401) {
    localStorage.removeItem('token');
    // Show Bootstrap alert instead of basic alert
    if (typeof showBootstrapAlert === 'function') {
      showBootstrapAlert('انتهت صلاحية جلسة العمل. سيتم تحويلك إلى صفحة تسجيل الدخول...', 'warning', 3000);
      setTimeout(() => {
        window.location.href = '/login?expired=true';
      }, 3500);
    } else {
      alert('انتهت صلاحية جلسة العمل. سيتم تحويلك إلى صفحة تسجيل الدخول.');
      window.location.href = '/login?expired=true';
    }
    return true;
  }
  return false;
}

let allOrdersGrouped = {}; // Store grouped orders globally for recalculation
let orderKeys = []; // Store the keys (group IDs) of the orders to manage pagination
let displayedCount = 0; // Keep track of how many orders are currently shown
const ordersIncrement = 5; // How many orders to show at a time
let allOrdersRaw = []; // Store all raw orders data from the API

/**
 * Renders a single order group item and appends it to the container.
 * @param {string} group - The order_group ID.
 */
function renderOrderGroup(group) {
    const groupOrders = allOrdersGrouped[group];
    if (!groupOrders || groupOrders.length === 0) return;
    
    const firstOrder = groupOrders[0];
    const container = document.getElementById('admin-orders-container');

    const div = document.createElement('div');
    div.className = 'd-flex justify-content-between align-items-center list-group-item list-group-item-action mb-2';

    const groupBtn = document.createElement('button');
    groupBtn.type = 'button';
    groupBtn.className = 'btn btn-link text-start flex-grow-1';
    groupBtn.innerHTML = `مجموعة الطلب: ${group}`;
    groupBtn.dataset.orderGroup = group;
    groupBtn.setAttribute('data-bs-toggle', 'modal');
    groupBtn.setAttribute('data-bs-target', '#orderDetailsModal');
    groupBtn.addEventListener('click', () => populateOrderModal(group));

    const dateSpan = document.createElement('span');
    dateSpan.className = 'badge bg-primary rounded-pill me-3';
    dateSpan.innerHTML = new Date(firstOrder.order_date).toLocaleString();

    const archiveBtn = document.createElement('button');
    archiveBtn.className = 'btn btn-warning btn-sm me-2';
    archiveBtn.innerHTML = 'أرشفة';
    archiveBtn.onclick = () => {
        document.getElementById('archive-order-modal-group').innerHTML = group;
        document.getElementById('archive-order-confirm-btn').dataset.group = group;
        const archiveModal = new bootstrap.Modal(document.getElementById('archiveOrderModal'));
        archiveModal.show();
    };
    
    // Copy Order Button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-info btn-sm text-white';
    copyBtn.innerHTML = '<i class="bi bi-clipboard me-1"></i>نسخ';
    copyBtn.setAttribute('title', 'نسخ تفاصيل الطلب');
    copyBtn.onclick = () => copyOrderDetails(group);

    div.appendChild(groupBtn);
    div.appendChild(dateSpan);
    div.appendChild(copyBtn);
    div.appendChild(archiveBtn);
    container.appendChild(div);
}

/**
 * Updates the visibility of the 'Show More' and 'Show Less' buttons
 * based on the number of orders displayed.
 */
function updatePaginationButtons() {
    const showMoreBtn = document.getElementById('show-more-btn');
    const showLessBtn = document.getElementById('show-less-btn');
    const paginationControls = document.getElementById('pagination-controls');

    // Hide all controls if there are not enough orders to paginate
    if (orderKeys.length <= ordersIncrement) {
        paginationControls.style.display = 'none';
        return;
    }

    paginationControls.style.display = 'block';

    // Logic for "Show More" button
    showMoreBtn.style.display = (displayedCount >= orderKeys.length) ? 'none' : 'inline-block';

    // Logic for "Show Less" button
    showLessBtn.style.display = (displayedCount > ordersIncrement) ? 'inline-block' : 'none';
}

/**
 * Re-renders the list of order groups to reflect changes (like archiving)
 * without resetting the pagination.
 */
function refreshDisplayedOrderGroups() {
    const targetCount = displayedCount;

    const container = document.getElementById('admin-orders-container');
    container.innerHTML = '';
    displayedCount = 0;

    const newEnd = Math.min(targetCount, orderKeys.length);
    for (let i = 0; i < newEnd; i++) {
        renderOrderGroup(orderKeys[i]);
    }
    displayedCount = newEnd;

    updatePaginationButtons();
}


/**
 * Displays the next set of orders.
 */
function showMoreOrders() {
    const end = Math.min(displayedCount + ordersIncrement, orderKeys.length);
    for (let i = displayedCount; i < end; i++) {
        const groupKey = orderKeys[i];
        renderOrderGroup(groupKey);
    }
    displayedCount = end;
    updatePaginationButtons();
}

/**
 * Main function to fetch orders from the API, group them, and render the first page.
 */
async function loadAdminOrders() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('admin-orders-container');
    const paginationControls = document.getElementById('pagination-controls');
    const dateFilter = document.getElementById('date-filter').value;
    
    container.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">جارٍ التحميل...</span></div></div>';
    paginationControls.style.display = 'none'; // Hide buttons while loading

    try {
        const response = await fetch('/api/admin/orders', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        // Handle 401 Unauthorized error
        if (handleAuthError(response)) return;
        
        const orders = await response.json();
        container.innerHTML = '';

        if (orders.length === 0) {
            container.innerHTML = '<p class="text-center">لم يتم العثور على أي طلب.</p>';
            document.getElementById('total-orders-count').textContent = '0';
            return;
        }
        
        // Store all raw orders data
        allOrdersRaw = orders;
        
        // Apply date filter
        const filteredOrders = filterOrdersByDate(orders, dateFilter);
        
        // Process and display filtered orders
        processAndDisplayOrders(filteredOrders);

    } catch (error) {
        console.error('Error loading admin orders:', error);
        container.innerHTML = '<p class="text-center text-danger">حدث خطأ اثناء اضافة الطلبيات.</p>';
        document.getElementById('total-orders-count').textContent = '0';
    }
}

/**
 * Shows a  Bootstrap alert notification
 * @param {string} message - The message to display
 * @param {string} type - The type of alert (success, danger, warning, info)
 */
function showAlert(message, type = 'info') {
    const existingAlerts = document.querySelectorAll('.custom-alert');
    existingAlerts.forEach(alert => alert.remove());

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show custom-alert`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border: none;
        border-radius: 8px;
    `;
    
    const iconClass = type === 'success' ? 'bi-check-circle-fill' : 
                     type === 'danger' ? 'bi-exclamation-triangle-fill' :
                     type === 'warning' ? 'bi-exclamation-circle-fill' : 'bi-info-circle-fill';
    
    alertDiv.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi ${iconClass} me-2"></i>
            <div class="flex-grow-1">${message}</div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        if (alertDiv && alertDiv.parentNode) {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 150);
        }
    }, 5000);
}

/**
 * Refreshes the order data for a specific group from the database
 * @param {string} group - The order_group ID to refresh
 */
async function refreshGroupData(group) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/admin/orders', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        // Handle 401 Unauthorized error
        if (handleAuthError(response)) return;
        
        const orders = await response.json();
        
        const groupOrders = orders.filter(order => order.order_group === group);
        if (groupOrders.length > 0) {
            allOrdersGrouped[group] = groupOrders;
        }
    } catch (error) {
        console.error('Error refreshing group data:', error);
    }
}

/**
 * Populates the order details modal with information for a specific order group.
 * @param {string} group - The order_group ID.
 */
// Algerian Wilayas dictionary for admin orders
const ADMIN_WILAYAS_MAP = {
  'adrar': 'أدرار (Adrar)', 'chlef': 'الشلف (Chlef)', 'laghouat': 'الأغواط (Laghouat)',
  'oum el bouaghi': 'أم البواقي (Oum El Bouaghi)', 'batna': 'باتنة (Batna)',
  'béjaïa': 'بجاية (Béjaïa)', 'bejaia': 'بجاية (Béjaïa)', 'biskra': 'بسكرة (Biskra)',
  'béchar': 'بشار (Béchar)', 'bechar': 'بشار (Béchar)', 'blida': 'البليدة (Blida)',
  'bouira': 'البويرة (Bouira)', 'tamanrasset': 'تمنراست (Tamanrasset)',
  'tébessa': 'تبسة (Tébessa)', 'tebessa': 'تبسة (Tébessa)', 'tlemcen': 'تلمسان (Tlemcen)',
  'tiaret': 'تيارت (Tiaret)', 'tizi ouzou': 'تيزي وزو (Tizi Ouzou)',
  'algiers': 'الجزائر العاصمة (Alger)', 'alger': 'الجزائر العاصمة (Alger)',
  'djelfa': 'الجلفة (Djelfa)', 'jijel': 'جيجل (Jijel)', 'sétif': 'سطيف (Sétif)',
  'setif': 'سطيف (Sétif)', 'saïda': 'سعيدة (Saïda)', 'saida': 'سعيدة (Saïda)',
  'skikda': 'سكيكدة (Skikda)', 'sidi bel abbès': 'سيدي بلعباس (Sidi Bel Abbès)',
  'sidi bel abbes': 'سيدي بلعباس (Sidi Bel Abbès)', 'annaba': 'عنابة (Annaba)',
  'guelma': 'قالمة (Guelma)', 'constantine': 'قسنطينة (Constantine)',
  'médéa': 'المدية (Médéa)', 'medea': 'المدية (Médéa)', 'mostaganem': 'مستغانم (Mostaganem)',
  'm\'sila': 'المسيلة (M\'Sila)', 'msila': 'المسيلة (M\'Sila)', 'mascara': 'معسكر (Mascara)',
  'ouargla': 'ورقلة (Ouargla)', 'oran': 'وهران (Oran)', 'el bayadh': 'البيض (El Bayadh)',
  'illizi': 'إليزي (Illizi)', 'bordj bou arréridj': 'برج بوعريريج (Bordj Bou Arréridj)',
  'bordj bou arreridj': 'برج بوعريريج (Bordj Bou Arréridj)', 'boumerdès': 'بومرداس (Boumerdès)',
  'boumerdes': 'بومرداس (Boumerdès)', 'el tarf': 'الطارف (El Tarf)',
  'tindouf': 'تندوف (Tindouf)', 'tissemsilt': 'تيسمسيلت (Tissemsilt)',
  'el oued': 'الوادي (El Oued)', 'khenchela': 'خنشلة (Khenchela)',
  'souk ahras': 'سوق أهراس (Souk Ahras)', 'tipaza': 'تيبازة (Tipaza)',
  'mila': 'ميلة (Mila)', 'aïn defla': 'عين الدفلى (Aïn Defla)',
  'ain defla': 'عين الدفلى (Aïn Defla)', 'naâma': 'النعامة (Naâma)',
  'naama': 'النعامة (Naâma)', 'aïn témouchent': 'عين تموشنت (Aïn Témouchent)',
  'ain temouchent': 'عين تموشنت (Aïn Témouchent)', 'ghardaïa': 'غرداية (Ghardaïa)',
  'ghardaia': 'غرداية (Ghardaïa)', 'relizane': 'غليزان (Relizane)',
  'timimoun': 'تيميمون (Timimoun)', 'bordj badji mokhtar': 'برج باجي مختار (Bordj Badji Mokhtar)',
  'ouled djellal': 'أولاد جلال (Ouled Djellal)', 'béni abbès': 'بني عباس (Béni Abbès)',
  'beni abbes': 'بني عباس (Béni Abbès)', 'in salah': 'عين صالح (In Salah)',
  'in guezzam': 'عين قزام (In Guezzam)', 'touggourt': 'تقرت (Touggourt)',
  'djanet': 'جانت (Djanet)', 'el m\'ghair': 'المغير (El M\'Ghair)',
  'el mghair': 'المغير (El M\'Ghair)', 'el meniaa': 'المنيعة (El Meniaa)'
};

function formatAdminWilaya(city) {
  if (!city) return '--';
  const clean = String(city).trim().toLowerCase();
  return ADMIN_WILAYAS_MAP[clean] || city;
}

function parseOrderShippingDetails(rawAddress, city) {
  let address = String(rawAddress || '').trim();
  let company = '';
  let type = 'توصيل للمنزل (Door to Door)';
  let funnelPath = '';

  const companyMatch = address.match(/\[شركة:\s*([^\]]+)\]/);
  if (companyMatch) {
    company = companyMatch[1].trim();
    address = address.replace(companyMatch[0], '').trim();
  }

  if (address.includes('Stopdesk') || address.includes('المكتب')) {
    type = 'استلام من المكتب (Stopdesk)';
    address = address.replace(/\[استلام من المكتب - Stopdesk\]/g, '')
                     .replace(/\[Stopdesk\]/g, '')
                     .replace(/\[استلام من المكتب\]/g, '')
                     .trim();
  }

  const pathMatch = address.match(/\[مسار الطلب:\s*([^\]]+)\]/);
  if (pathMatch) {
    funnelPath = pathMatch[1].trim();
    address = address.replace(pathMatch[0], '').trim();
  }

  // Remove duplicate wilaya name if it equals city
  if (city && address.toLowerCase() === city.toLowerCase()) {
    address = '';
  }

  address = address.replace(/\[\s*\]/g, '').trim();

  return {
    company: company || 'Yalidine Express',
    type,
    funnelPath,
    cleanAddress: address
  };
}

/**
 * Populates the order details modal with information for a specific order group.
 * @param {string} group - The order_group ID.
 */
function populateOrderModal(group) {
    const groupOrders = allOrdersGrouped[group];
    const firstOrder = groupOrders[0];
    const modalBody = document.getElementById('modal-order-details');
    
    const currentTotal = firstOrder.total_price || 0;
    const productsTotal = firstOrder.products_price || 0;
    const deliveryPrice = firstOrder.delivery_price || 0;
    
    const discountAmount = firstOrder.discount_amount || 0;
    const promoCode = firstOrder.promo_code;

    const shippingInfo = parseOrderShippingDetails(firstOrder.shipping_address, firstOrder.city);
    const wilayaDisplay = formatAdminWilaya(firstOrder.city);

    let headerHtml = `
      <div class="row mb-3" dir="rtl">
        <div class="col-md-6">
          <p class="mb-1"><strong>العميل:</strong> ${firstOrder.first_name || ''} ${firstOrder.last_name || ''}</p>
          <p class="mb-1"><strong>الهاتف:</strong> <a href="tel:${firstOrder.shipping_name}" class="text-decoration-none fw-bold" style="color:var(--military-green); direction:ltr; display:inline-block;">${firstOrder.shipping_name}</a></p>
          <p class="mb-1"><strong>الولاية:</strong> <span class="fw-bold">${wilayaDisplay}</span></p>
          <p class="mb-1"><strong>شركة التوصيل:</strong> <span class="badge bg-primary-subtle text-primary border border-primary px-2 py-1">${shippingInfo.company}</span></p>
          <p class="mb-1"><strong>طريقة الاستلام:</strong> <span class="badge bg-secondary-subtle text-secondary border px-2 py-1">${shippingInfo.type}</span></p>
          
          ${shippingInfo.funnelPath ? `
            <div class="alert alert-info py-2 px-3 my-2 small">
              <i class="bi bi-diagram-3-fill me-1 text-primary"></i>
              <strong>مسار صفحة الهبوط:</strong>
              <div class="fw-bold text-dark mt-1" style="word-break: break-word;">${escapeHtml(shippingInfo.funnelPath)}</div>
            </div>
          ` : ''}

          ${shippingInfo.cleanAddress ? `<p class="mb-1"><strong>العنوان / ملاحظات:</strong> ${escapeHtml(shippingInfo.cleanAddress)}</p>` : ''}
          <p class="mb-1 text-muted small"><strong>نوع الحساب:</strong> ${firstOrder.userEmail ? `${firstOrder.userName || ''} (${firstOrder.userEmail})` : 'طلب زائر (بدون تسجيل حساب)'}</p>
        </div>
        <div class="col-md-6 text-md-end">
            <p class="mb-1"><strong>تاريخ الطلب:</strong> ${new Date(firstOrder.order_date).toLocaleString('ar-DZ')}</p>
            <p class="mb-1"><strong>مجموع المنتجات والعروض:</strong> دج${productsTotal.toFixed(2)}</p>
            ${discountAmount > 0 ? `
            <p class="mb-1 text-success fw-bold">
              <i class="bi bi-ticket-perforated me-1"></i>خصم الكوبون (${promoCode || 'PROMO'}): 
              <span>-دج${discountAmount.toFixed(2)}</span>
            </p>` : ''}
            <p class="mb-1"><strong>تكلفة التوصيل:</strong> ${deliveryPrice === 0 ? '<span class="badge bg-success">0 دج (مجاني 🚚)</span>' : `دج${deliveryPrice.toFixed(2)}`}</p>
            <h5 class="mt-2 text-primary"><strong>المجموع النهائي الواجب تحصيله:</strong> <span id="modal-current-total">دج${currentTotal.toFixed(2)}</span></h5>
        </div>
      </div>
      <hr />
      <h4>المنتجات والعروض المطلوبة</h4>
    `;
    modalBody.innerHTML = headerHtml;

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

    groupOrders.forEach(order => {
        const orderDiv = document.createElement('div');
        orderDiv.classList.add('mb-3', 'border-bottom', 'pb-2', 'order-item-row');
        orderDiv.id = `order-item-${order.orderId}`;
        
        const isFunnelRoot = order.productName && order.productName.includes(' / ');
        const productDisplayHtml = isFunnelRoot 
            ? `<span class="badge bg-success-subtle text-success-emphasis border border-success me-1"><i class="bi bi-diagram-3-fill me-1"></i>عرض صفحة هبوط:</span> <strong class="text-dark">${escapeHtml(order.productName)}</strong>`
            : `<strong>${escapeHtml(order.productName)}</strong>`;

        orderDiv.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <p class="mb-1"><strong>معرف الطلب:</strong> ${order.orderId} | <strong>المنتج:</strong> ${productDisplayHtml}</p>
                <p class="mb-1"><strong>الكمية:</strong> ${order.quantity} | <strong>سعر الوحدة:</strong> دج${(order.price || 0).toFixed(2)}</p>
            </div>
            <div>
                <strong>الحالة:</strong> <span id="status-span-${order.orderId}">${order.status}</span>
            </div>
        </div>
        <div class="mt-2">
            <button class="btn btn-outline-danger btn-sm me-1" onclick="updateOrderStatus(${order.orderId}, 'إلغاء', '${group}')">إلغاء</button>
            <button class="btn btn-outline-primary btn-sm me-1" onclick="updateOrderStatus(${order.orderId}, 'تم التأكيد', '${group}')">تأكيد</button>
            <button class="btn btn-outline-warning btn-sm me-1" onclick="updateOrderStatus(${order.orderId}, 'قيد الشحن', '${group}')">قيد الشحن</button>
            <button class="btn btn-outline-success btn-sm" onclick="updateOrderStatus(${order.orderId}, 'تم التسليم', '${group}')">تم التسليم</button>
        </div>
        `;
        modalBody.appendChild(orderDiv);
    });
}

/**
 * Updates the status of a specific order item and refreshes the modal total.
 * @param {number} orderId - The ID of the order to update.
 * @param {string} newStatus - The new status.
 * @param {string} group - The order_group ID this item belongs to.
 */
window.updateOrderStatus = async function(orderId, newStatus, group) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status: newStatus })
        });
        const result = await response.json();
        
        if (!response.ok) {
            showAlert(result.error || 'تعذر تحديث الحالة!', 'danger');
            return;
        }

        showAlert('تم تحديث حالة الطلب بنجاح!', 'success');
        await refreshGroupData(group);
        document.getElementById(`status-span-${orderId}`).innerHTML = newStatus;

        const refreshedGroupOrders = allOrdersGrouped[group];
        if (refreshedGroupOrders && refreshedGroupOrders.length > 0) {
            const updatedTotal = refreshedGroupOrders[0].total_price || 0;
            const updatedProductsPrice = refreshedGroupOrders[0].products_price || 0;
            const updatedDeliveryPrice = refreshedGroupOrders[0].delivery_price || 0;
            
            document.getElementById('modal-current-total').innerHTML = `دج${updatedTotal.toFixed(2)}`;
            
            const productsElement = document.querySelector('.col-md-6.text-md-end p:nth-child(2)');
            const deliveryElement = document.querySelector('.col-md-6.text-md-end p:nth-child(3)');
            
            if (productsElement) {
                productsElement.innerHTML = `<strong>إجمالي المنتجات:</strong> دج${updatedProductsPrice.toFixed(2)}`;
            }
            if (deliveryElement) {
                deliveryElement.innerHTML = `<strong>تكلفة الشحن:</strong> دج${updatedDeliveryPrice.toFixed(2)}`;
            }
        }
        
    } catch (err) {
        showAlert('حدث خطأ أثناء تحديث الحالة: ' + err.message, 'danger');
    }
};

/**
 * Copies the order details to the clipboard and shows a success message.
 * @param {string} group - The order_group ID.
 */
function copyOrderDetails(group) {
    const groupOrders = allOrdersGrouped[group];
    if (!groupOrders || groupOrders.length === 0) return;
    
    const firstOrder = groupOrders[0];
    const shippingInfo = parseOrderShippingDetails(firstOrder.shipping_address, firstOrder.city);
    const wilayaDisplay = formatAdminWilaya(firstOrder.city);

    // Create a clean, beautifully formatted Arabic text for copy/paste
    let orderText = `=== تفاصيل الطلب #${group} ===\n\n`;
    
    // Customer information
    orderText += "--- بيانات العميل والشحن ---\n";
    orderText += `الاسم الكامل: ${firstOrder.first_name || ''} ${firstOrder.last_name || ''}\n`;
    orderText += `رقم الهاتف: ${firstOrder.shipping_name}\n`;
    orderText += `الولاية: ${wilayaDisplay}\n`;
    orderText += `شركة التوصيل: ${shippingInfo.company}\n`;
    orderText += `طريقة الاستلام: ${shippingInfo.type}\n`;
    if (shippingInfo.cleanAddress) {
        orderText += `العنوان: ${shippingInfo.cleanAddress}\n`;
    }
    if (shippingInfo.funnelPath) {
        orderText += `مسار صفحة الهبوط: ${shippingInfo.funnelPath}\n`;
    }
    orderText += `تاريخ الطلب: ${new Date(firstOrder.order_date).toLocaleString('ar-DZ')}\n\n`;
    
    // Order items
    orderText += "--- المنتجات والعروض ---\n";
    groupOrders.forEach((order, index) => {
        orderText += `${index + 1}. ${order.productName}\n`;
        orderText += `   الكمية: ${order.quantity} | السعر: دج${(order.price || 0).toFixed(2)}\n`;
        orderText += `   الحالة: ${order.status}\n\n`;
    });
    
    // Totals
    const productsTotal = firstOrder.products_price || 0;
    const deliveryPrice = firstOrder.delivery_price || 0;
    const currentTotal = firstOrder.total_price || 0;
    const discountAmount = firstOrder.discount_amount || 0;
    const promoCode = firstOrder.promo_code;
    
    orderText += "--- الحساب المالي ---\n";
    orderText += `مجموع المنتجات: دج${productsTotal.toFixed(2)}\n`;
    if (discountAmount > 0) {
        orderText += `خصم الكوبون (${promoCode || 'PROMO'}): -دج${discountAmount.toFixed(2)}\n`;
    }
    orderText += `تكلفة التوصيل: ${deliveryPrice === 0 ? 'مجاني (0 دج)' : `دج${deliveryPrice.toFixed(2)}`}\n`;
    orderText += `المجموع النهائي المطلوب تحصيله: دج${currentTotal.toFixed(2)}\n`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(orderText)
        .then(() => {
            showCopySuccessNotification();
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
            alert('فشل نسخ تفاصيل الطلب');
        });
}

/**
 * Shows a success notification when order details are copied.
 */
function showCopySuccessNotification() {
    // Check if notification element already exists
    let notification = document.getElementById('copy-success-notification');
    
    if (!notification) {
        // Create notification element
        notification = document.createElement('div');
        notification.id = 'copy-success-notification';
        notification.className = 'copy-notification';
        notification.innerHTML = `
            <div class="alert alert-success d-flex align-items-center" role="alert">
                <i class="bi bi-clipboard-check me-2"></i>
                <div>تم نسخ تفاصيل الطلب بنجاح!</div>
            </div>
        `;
        
        // Style the notification
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease-in-out';
        
        // Add to document
        document.body.appendChild(notification);
        
        // Show the notification (delay to allow transition)
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
}

/**
 * Filters orders based on the selected date range
 * @param {Array} orders - The original orders array to filter
 * @param {string} dateFilter - The date filter type (24h, 7d, 1m, all)
 * @returns {Array} - Filtered orders array
 */
function filterOrdersByDate(orders, dateFilter) {
    if (dateFilter === 'all') return orders;
    
    const now = new Date();
    let cutoffDate;
    
    switch(dateFilter) {
        case '24h':
            cutoffDate = new Date(now.getTime() - (24 * 60 * 60 * 1000));
            break;
        case '7d':
            cutoffDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
            break;
        case '1m':
            cutoffDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
            break;
        default:
            return orders;
    }
    
    return orders.filter(order => new Date(order.order_date) >= cutoffDate);
}

/**
 * Groups and sorts orders, then displays them
 * @param {Array} filteredOrders - The filtered orders to group and display
 */
function processAndDisplayOrders(filteredOrders) {
    const container = document.getElementById('admin-orders-container');
    container.innerHTML = '';
    
    if (filteredOrders.length === 0) {
        container.innerHTML = '<p class="text-center py-4">لم يتم العثور على أي طلب في هذه الفترة.</p>';
        document.getElementById('pagination-controls').style.display = 'none';
        document.getElementById('total-orders-count').textContent = '0';
        return;
    }
    
    // Group orders by order_group
    allOrdersGrouped = filteredOrders.reduce((acc, order) => {
        if (!acc[order.order_group]) acc[order.order_group] = [];
        acc[order.order_group].push(order);
        return acc;
    }, {});
    
    // Update the orders count
    document.getElementById('total-orders-count').textContent = Object.keys(allOrdersGrouped).length;
    
    // Get the keys and sort by most recent date first
    orderKeys = Object.keys(allOrdersGrouped).sort((a, b) => {
        const dateA = new Date(allOrdersGrouped[a][0].order_date);
        const dateB = new Date(allOrdersGrouped[b][0].order_date);
        return dateB - dateA;
    });
    
    displayedCount = 0; // Reset the displayed count
    showMoreOrders(); // Display the initial set of orders
}

/**
 * Sets up event listeners when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Load the initial set of orders
    loadAdminOrders();

    // Event listener for date filter changes
    document.getElementById('date-filter').addEventListener('change', function() {
        const dateFilter = this.value;
        
        // Add animation class
        this.classList.add('filter-changed');
        setTimeout(() => this.classList.remove('filter-changed'), 1000);
        
        // Apply date filter to orders
        if (allOrdersRaw.length > 0) {
            const filteredOrders = filterOrdersByDate(allOrdersRaw, dateFilter);
            processAndDisplayOrders(filteredOrders);
        }
    });

    // Event listener for the "Show More" button
    document.getElementById('show-more-btn').addEventListener('click', showMoreOrders);

    // Event listener for the "Show Less" button
    document.getElementById('show-less-btn').addEventListener('click', () => {
        const container = document.getElementById('admin-orders-container');
        container.innerHTML = ''; // Clear current orders from view
        displayedCount = 0; // Reset the counter
        showMoreOrders(); // Show the first page again
    });
    
    // Event listener for the archive confirmation button
    document.getElementById('archive-order-confirm-btn').addEventListener('click', async function () {
        const group = this.dataset.group;
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`/api/admin/orders/group/${group}/archive`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
            });
            
            // Handle 401 Unauthorized error
            if (handleAuthError(response)) return;
            
            if (!response.ok) {
              const result = await response.json();
              throw new Error(result.error || 'خطأ اثناء الأرشفة!');
            }
            
            const archiveModal = bootstrap.Modal.getInstance(document.getElementById('archiveOrderModal'));
            archiveModal.hide();
            showAlert('تم أرشفة مجموعة الطلبات بنجاح!', 'success');
            
            // --- THE FIX ---
            // Instead of reloading the page, remove the group from our local data
            // and refresh the view, preserving the user's scroll position.
            delete allOrdersGrouped[group];
            orderKeys = orderKeys.filter(key => key !== group);
            refreshDisplayedOrderGroups();
            // --- END OF FIX ---

        } catch (err) {
            showAlert('حدث خطأ أثناء الأرشفة: ' + err.message, 'danger');
        }
    });
});
