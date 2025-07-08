// Function to decode a JWT token payload
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            window
                .atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Failed to parse JWT:", e);
        return null;
    }
}

// Check if token is expired
function isTokenExpired(token) {
    if (!token) return true;
    
    try {
        const payload = parseJwt(token);
        if (!payload || !payload.exp) return true;
        const currentTime = Date.now() / 1000;
        return payload.exp < currentTime;
    } catch (e) {
        return true;
    }
}

// Helper function to show Bootstrap-styled notifications
function showBootstrapAlert(message, type = 'warning', duration = 4000) {
    // Create alert container if it doesn't exist
    let alertContainer = document.getElementById('auth-alert-container');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'auth-alert-container';
        alertContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
        `;
        document.body.appendChild(alertContainer);
    }

    // Create the alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show shadow-lg`;
    alertDiv.role = 'alert';
    alertDiv.style.cssText = `
        border: none;
        border-radius: 12px;
        font-weight: 500;
        animation: slideInRight 0.3s ease-out;
    `;
    
    alertDiv.innerHTML = `
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        <strong>تنبيه:</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
    `;

    // Add animation styles if not already present
    if (!document.getElementById('auth-alert-styles')) {
        const style = document.createElement('style');
        style.id = 'auth-alert-styles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    alertContainer.appendChild(alertDiv);

    // Auto-remove after duration
    setTimeout(() => {
        if (alertDiv) {
            alertDiv.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (alertDiv && alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 300);
        }
    }, duration);
}

// Auto-logout if token is expired
function checkTokenExpiry() {
    const token = localStorage.getItem('token');
    if (token && isTokenExpired(token)) {
        localStorage.removeItem('token');
        // Update header to show guest state instead of redirecting
        updateHeader();
        // Only show the Bootstrap alert if not on checkout page
        if (!window.location.pathname.includes('checkout')) {
            showBootstrapAlert('انتهت صلاحية جلسة العمل. سيتم تحويلك إلى صفحة تسجيل الدخول...', 'warning', 3000);
            setTimeout(() => {
                window.location.href = '/login?expired=true';
            }, 3500);
        }
    }
}

// Update cart counter visually
function updateCartCounter() {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let totalCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    const cartCounter = document.getElementById('cart-counter');
    if (cartCounter) {
        cartCounter.innerHTML = `(${totalCount})`;
    }
}

// Build a modern nav link (with icons)
function buildNavLink({ href, icon, text, counter = null, extraClass = "" }) {
    return `
        <li class="nav-item">
            <a class="nav-link d-flex align-items-center ${extraClass}" href="${href}">
                ${icon ? `<i class="bi ${icon} me-1"></i>` : ""}
                ${text}
                ${counter ? `<span id="cart-counter" class="ms-1">${counter}</span>` : ""}
            </a>
        </li>
    `;
}

function updateHeader() {
    // Check token expiry first
    checkTokenExpiry();
    
    const token = localStorage.getItem('token');
    const userActionsContainer = document.querySelector('.user-actions');
    if (!userActionsContainer) return;

    // We'll use <ul> inside .user-actions 
    let ul;
    if (userActionsContainer.tagName === "UL") {
        ul = userActionsContainer;
    } else {
        userActionsContainer.innerHTML = "";
        ul = document.createElement("ul");
        ul.className = "navbar-nav ms-auto mb-2 mb-lg-0 user-actions d-flex align-items-center flex-row";
        userActionsContainer.appendChild(ul);
    }
    ul.innerHTML = "";

    if (token) {
        const userData = parseJwt(token);

        //Greeting added a as first <li>
        if (userData && userData.email) {
            ul.innerHTML += `
                <li class="nav-item me-2 d-none d-lg-block">
                  <span class="nav-link disabled" style="color: #715100; font-weight: 600;">
s                    <i class="bi bi-person-circle me-1"></i> مرحبًا، ${userData.email}
                  </span>
                </li>
            `;
        }

        // MyCart link (always present)
        ul.innerHTML += buildNavLink({
            href: "/cart",
            icon: "bi-cart",
            text: "سلتي",
            counter: "(0)"
        });

        // Orders link
        if (userData && userData.role === 'admin') {
            ul.innerHTML += buildNavLink({
                href: "/admin-orders",
                icon: "bi-truck",
                text: "الطلبات"
            });
        } else {
            ul.innerHTML += buildNavLink({
                href: "/orders",
                icon: "bi-clipboard-check",
                text: "طلباتي"
            });
        }
        // Admin Panel link (only for admins)
        if (userData && userData.role === 'admin') {
            ul.innerHTML += buildNavLink({
                href: "/admin-products",
                icon: "bi-speedometer2",
                text: "لوحة الإدارة"
            });
        }

        // Logout link
        ul.innerHTML += buildNavLink({
            href: "/logout",
            icon: "bi-box-arrow-right",
            text: "تسجيل الخروج"
        });

        
    } else {
        // Not logged in: Login/Register and MyCart links
        ul.innerHTML += buildNavLink({
            href: "/login",
            icon: "bi-person",
            text: "تسجيل الدخول/إنشاء حساب"
        });
        ul.innerHTML += buildNavLink({
            href: "/cart",
            icon: "bi-cart",
            text: "سلتي",
            counter: "(0)"
        });
    }

    updateCartCounter();
}

// Run updateHeader on page load
document.addEventListener('DOMContentLoaded', updateHeader);

// Check token expiry every 5 minutes
setInterval(() => {
    checkTokenExpiry();
}, 5 * 60 * 1000);
