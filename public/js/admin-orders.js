// This file manages the admin orders view.
// It loads all orders, groups them, and allows for status updates and archiving.
// It includes pagination to show orders in increments.

let allOrdersGrouped = {}; // Store grouped orders globally for recalculation
let orderKeys = []; // Store the keys (group IDs) of the orders to manage pagination
let displayedCount = 0; // Keep track of how many orders are currently shown
const ordersIncrement = 5; // How many orders to show at a time

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
    archiveBtn.className = 'btn btn-warning btn-sm';
    archiveBtn.innerHTML = 'أرشفة';
    archiveBtn.onclick = () => {
        document.getElementById('archive-order-modal-group').innerHTML = group;
        document.getElementById('archive-order-confirm-btn').dataset.group = group;
        const archiveModal = new bootstrap.Modal(document.getElementById('archiveOrderModal'));
        archiveModal.show();
    };

    div.appendChild(groupBtn);
    div.appendChild(dateSpan);
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
    
    container.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">جارٍ التحميل...</span></div></div>';
    paginationControls.style.display = 'none'; // Hide buttons while loading

    try {
        const response = await fetch('/api/admin/orders', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const orders = await response.json();
        container.innerHTML = '';

        if (orders.length === 0) {
            container.innerHTML = '<p class="text-center">لم يتم العثور على أي طلب.</p>';
            return;
        }

        // Group orders by order_group and store globally
        allOrdersGrouped = orders.reduce((acc, order) => {
            if (!acc[order.order_group]) acc[order.order_group] = [];
            acc[order.order_group].push(order);
            return acc;
        }, {});

        // Get the keys and sort by most recent date first
        orderKeys = Object.keys(allOrdersGrouped).sort((a, b) => {
            const dateA = new Date(allOrdersGrouped[a][0].order_date);
            const dateB = new Date(allOrdersGrouped[b][0].order_date);
            return dateB - dateA;
        });

        displayedCount = 0; // Reset the displayed count
        showMoreOrders(); // Display the initial set of orders

    } catch (error) {
        console.error('Error loading admin orders:', error);
        container.innerHTML = '<p class="text-center text-danger">حدث خطأ اثناء اضافة الطلبيات.</p>';
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
function populateOrderModal(group) {
    const groupOrders = allOrdersGrouped[group];
    const firstOrder = groupOrders[0];
    const modalBody = document.getElementById('modal-order-details');
    
    const currentTotal = firstOrder.total_price || 0;
    const productsTotal = firstOrder.products_price || 0;
    const deliveryPrice = firstOrder.delivery_price || 0;
    
    let headerHtml = `
      <div class="row mb-3">
        <div class="col-md-6">
          <p><strong>المستخدم:</strong> ${firstOrder.userName} (${firstOrder.userEmail})</p>
          <p><strong>الاسم الكامل:</strong> ${firstOrder.first_name || ''} ${firstOrder.last_name || ''}</p>
          <p><strong>الهاتف:</strong> ${firstOrder.shipping_name}</p>
          <p><strong>العنوان:</strong> ${firstOrder.shipping_address}</p>
          <p><strong>المنطقة:</strong> ${firstOrder.city || ''}, ${firstOrder.province || ''}</p>
          <p><strong>الرمز البريدي:</strong> ${firstOrder.postal_code}</p>
        </div>
        <div class="col-md-6 text-md-end">
            <p><strong>تاريخ الطلب:</strong> ${new Date(firstOrder.order_date).toLocaleString()}</p>
            <p><strong>إجمالي المنتجات:</strong> دج${productsTotal.toFixed(2)}</p>
            <p><strong>تكلفة الشحن:</strong> دج${deliveryPrice.toFixed(2)}</p>
            <h5 class="mt-2"><strong>الإجمالي الحالي:</strong> <span id="modal-current-total">دج${currentTotal.toFixed(2)}</span></h5>
        </div>
      </div>
      <hr />
      <h4>المنتجات</h4>
    `;
    modalBody.innerHTML = headerHtml;

    groupOrders.forEach(order => {
        const orderDiv = document.createElement('div');
        orderDiv.classList.add('mb-3', 'border-bottom', 'pb-2', 'order-item-row');
        orderDiv.id = `order-item-${order.orderId}`;
        orderDiv.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <p class="mb-1"><strong>معرف الطلب:</strong> ${order.orderId} | <strong>المنتج:</strong> ${order.productName}</p>
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
 * Sets up event listeners when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Load the initial set of orders
    loadAdminOrders();

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
