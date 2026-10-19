// This file loads and displays the user's order history.
// Orders are grouped by their `order_group` ID.

document.addEventListener('DOMContentLoaded', loadOrders);

// Pagination variables
let allOrderElements = [];
let currentlyShowing = 3;
const ordersPerPage = 3;

/**
 * Fetches and displays the user's order history.
 */
async function loadOrders() {
    const token = localStorage.getItem('token');
    if (!token) {
        // Handle case where user is not logged in
        document.getElementById('orders-container').innerHTML = '<p>لمشاهدة طلباتك، يرجى <a href="/login">تسجيل الدخول</a>.</p>';
        return;
    }

    try {
        const response = await fetch('/api/orders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            // For orders page, redirect to login since orders require authentication
            if (typeof showBootstrapAlert === 'function') {
                showBootstrapAlert('انتهت صلاحية جلسة العمل. سيتم تحويلك إلى صفحة تسجيل الدخول...', 'warning', 3000);
                setTimeout(() => {
                    window.location.href = '/login?expired=true';
                }, 3500);
            } else {
                alert('انتهت صلاحية جلسة العمل. سيتم تحويلك إلى صفحة تسجيل الدخول.');
                window.location.href = '/login?expired=true';
            }
            return;
        }

        if (!response.ok) {
            throw new Error('تعذر تحميل الطلبات.');
        }

        const orders = await response.json();
        const container = document.getElementById('orders-container');
        container.innerHTML = '';

        if (orders.length === 0) {
            container.innerHTML = '<p>لم تقم بأي طلب بعد.</p>';
            return;
        }

        // Group orders by order_group
        const groupedOrders = orders.reduce((acc, order) => {
            if (!acc[order.order_group]) {
                acc[order.order_group] = {
                    items: [],
                    // Store group-level details from the first item
                    order_group: order.order_group,
                    order_date: order.order_date,
                    products_price: order.products_price,
                    delivery_price: order.delivery_price,
                    total_price: order.total_price,
                    promo_code: order.promo_code,
                    discount_amount: order.discount_amount || 0
                };
            }
            acc[order.order_group].items.push(order);
            return acc;
        }, {});

        // Create a card for each order group and store them
        allOrderElements = [];
        for (const groupId in groupedOrders) {
            const group = groupedOrders[groupId];
            const card = createOrderCard(group);
            allOrderElements.push(card);
        }

        // Reset pagination and display initial orders
        currentlyShowing = ordersPerPage;
        displayOrdersWithPagination();

    } catch (error) {
        console.error('حدث خطأ أثناء تحميل الطلبات:', error);
        container.innerHTML = `<p class="text-danger">حدث خطأ أثناء تحميل الطلبات: ${error.message}</p>`;
    }
}

/**
 * Creates an HTML card element for an order group.
 * @param {object} group - The grouped order object.
 * @returns {HTMLElement} A div element representing the order card.
 */
function createOrderCard(group) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';

    const card = document.createElement('div');
    card.className = 'order-card h-100';

    const currentTotal = group.total_price || 0;
    const productsTotal = group.products_price || 0;
    const deliveryPrice = group.delivery_price || 0;
    const discountAmount = group.discount_amount || 0;
    const promoCode = group.promo_code;

    const productsHtml = group.items.map(item => `
        <li class="d-flex justify-content-between align-items-center mb-1">
            <span>${item.productName} (x${item.quantity})</span>
            ${getStatusBadge(item.status)}
        </li>
    `).join('');

    card.innerHTML = `
        <div class="order-header">
            <span class="order-id"><i class="bi bi-hash me-1"></i>مجموعة الطلب: ${group.order_group}</span>
            <span class="order-date"><i class="bi bi-calendar-event me-1"></i>${new Date(group.order_date).toLocaleDateString('ar-DZ')}</span>
        </div>
        <div class="order-products">
            <ul class="list-unstyled ps-0 mb-2">
                ${productsHtml}
            </ul>
        </div>
        <div class="order-footer">
             <div class="price-info d-flex flex-column gap-1 mb-2">
                <div class="d-flex justify-content-between">
                    <span>مجموع المنتجات:</span>
                    <strong>دج${productsTotal.toFixed(2)}</strong>
                </div>
                ${discountAmount > 0 ? `
                <div class="d-flex justify-content-between text-success fw-bold">
                    <span><i class="bi bi-ticket-perforated me-1"></i>خصم الكوبون (${promoCode || 'PROMO'}):</span>
                    <span>-دج${discountAmount.toFixed(2)}</span>
                </div>` : ''}
                <div class="d-flex justify-content-between">
                    <span>تكلفة الشحن:</span>
                    <strong>${deliveryPrice === 0 ? '<span class="text-success">مجاني 🚚</span>' : `دج${deliveryPrice.toFixed(2)}`}</strong>
                </div>
            </div>
            <div class="total-price mb-2 d-flex justify-content-between align-items-center border-top pt-2">
                <span class="fw-bold">المجموع الكلي:</span>
                <span class="price fw-bold text-primary fs-5">دج${currentTotal.toFixed(2)}</span>
            </div>
            <div class="text-end mt-2">
                <button class="btn btn-sm btn-outline-secondary archive-order-btn" 
                        onclick="archiveOrderGroup('${group.order_group}', this)">
                    <i class="bi bi-archive me-1"></i>أرشفة الطلب
                </button>
            </div>
        </div>
    `;

    col.appendChild(card);
    return col;
}

/**
 * Generates a Bootstrap badge for a given order status.
 * @param {string} statusRaw - The raw status string from the database.
 * @returns {string} HTML string for the badge.
 */
function getStatusBadge(statusRaw) {
    const status = (statusRaw || 'غير معروف').toLowerCase();
    let badgeClass = 'bg-secondary';
    let icon = 'bi-question-circle';
    let text = statusRaw;

    switch (status) {
        case 'iptal':
        case 'iptal edildi':
            badgeClass = 'bg-danger';
            icon = 'bi-x-octagon';
            text = 'تم الإلغاء';
            break;
        case 'onayladı':
        case 'onaylandi':
        case 'onaylandı':
            badgeClass = 'bg-warning text-dark';
            icon = 'bi-hourglass-split';
            text = 'تم التأكيد';
            break;
        case 'kargoda':
            badgeClass = 'bg-info';
            icon = 'bi-truck';
            text = 'قيد الشحن';
            break;
        case 'teslim edildi':
            badgeClass = 'bg-success';
            icon = 'bi-check-circle';
            text = 'تم التسليم';
            break;
        case 'pending':
        case 'sipariş alındı':
            badgeClass = 'bg-warning text-dark';
            icon = 'bi-clock';
            text = 'قيد الانتظار';
            break;
    }
      return `<span class="badge rounded-pill ${badgeClass}" style="min-width: 100px; font-size: 0.85em;"><i class="bi ${icon} me-1"></i>${text}</span>`;
}

/**
 * Displays orders with pagination controls
 */
function displayOrdersWithPagination() {
    const container = document.getElementById('orders-container');
    container.innerHTML = '';

    // Create orders row container
    const ordersRow = document.createElement('div');
    ordersRow.className = 'row';
    ordersRow.id = 'orders-row';
    
    // Display the current set of orders
    const ordersToShow = allOrderElements.slice(0, currentlyShowing);
    ordersToShow.forEach(orderElement => {
        ordersRow.appendChild(orderElement.cloneNode(true));
    });
    
    container.appendChild(ordersRow);
    
    // Add pagination controls if there are more than 3 orders
    if (allOrderElements.length > ordersPerPage) {
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'text-center mt-4';
        paginationDiv.id = 'pagination-controls';
        
        // Show More button
        if (currentlyShowing < allOrderElements.length) {
            const showMoreBtn = document.createElement('button');
            showMoreBtn.className = 'btn btn-primary me-2';
            showMoreBtn.innerHTML = '<i class="bi bi-arrow-down me-1"></i>عرض المزيد';
            showMoreBtn.onclick = showMoreOrders;
            paginationDiv.appendChild(showMoreBtn);
        }
        // Show Less button (only show if we're showing more than initial 3)
        if (currentlyShowing > ordersPerPage) {
            const showLessBtn = document.createElement('button');
            showLessBtn.className = 'btn btn-outline-secondary';
            showLessBtn.innerHTML = '<i class="bi bi-arrow-up me-1"></i>عرض أقل';
            showLessBtn.onclick = showLessOrders;
            paginationDiv.appendChild(showLessBtn);
        }
        // Orders count info
        const countInfo = document.createElement('div');
        countInfo.className = 'text-muted mt-2 small';
        countInfo.innerHTML = `${currentlyShowing} / ${allOrderElements.length} طلب معروض`;
        paginationDiv.appendChild(countInfo);
        
        container.appendChild(paginationDiv);
    }
}

/**
 * Shows 3 more orders
 */
function showMoreOrders() {
    currentlyShowing = Math.min(currentlyShowing + ordersPerPage, allOrderElements.length);
    displayOrdersWithPagination();
}

/**
 * Shows only the first 3 orders
 */
function showLessOrders() {
    currentlyShowing = ordersPerPage;
    displayOrdersWithPagination();
}

/**
 * Shows the archive confirmation modal and sets up the confirmation action
 * @param {string} orderGroupId - The ID of the order group to archive.
 * @param {HTMLElement} btn - The button element that was clicked.
 */
function archiveOrderGroup(orderGroupId, btn) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('يرجى تسجيل الدخول أولاً.');
        return;
    }

    // Get the modal and its elements
    const modal = new bootstrap.Modal(document.getElementById('archiveConfirmModal'));
    const confirmBtn = document.getElementById('confirmArchiveBtn');

    // Set up the confirm button click handler
    const handleConfirm = async () => {
        try {
            // Disable confirm button and show loading state
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>جارٍ الأرشفة...';
            btn.disabled = true;
            btn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>جارٍ الأرشفة...';

            const response = await fetch(`/api/orders/group/${orderGroupId}/archive`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('فشلت عملية الأرشفة');
            }

            // Hide modal
            modal.hide();

            // Find and remove the archived order's card with animation
            const orderCard = btn.closest('.col-md-6');
            if (orderCard) {
                orderCard.style.opacity = '0';
                setTimeout(() => {
                    orderCard.remove();
                    // Remove from allOrderElements array
                    allOrderElements = allOrderElements.filter(el => 
                        !el.querySelector(`[onclick*="${orderGroupId}"]`));
                    // Refresh the display
                    displayOrdersWithPagination();
                }, 300);
            }

        } catch (error) {
            console.error('خطأ في أرشفة الطلب:', error);
            const errorModal = new bootstrap.Modal(document.getElementById('archiveConfirmModal'));
            document.querySelector('#archiveConfirmModal .modal-body').innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    حدث خطأ أثناء محاولة أرشفة الطلب.
                </div>`;
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-archive me-1"></i>أرشفة الطلب';
        } finally {
            // Reset confirm button state
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="bi bi-archive me-1"></i>نعم، أرشفة الطلب';
        }
    };

    // Remove any existing click handlers
    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    // Get the new button and add the click handler
    document.getElementById('confirmArchiveBtn').addEventListener('click', handleConfirm);

    // Show the modal
    modal.show();
}