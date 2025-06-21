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
            href: "cart.html",
            icon: "bi-cart",
            text: "سلتي",
            counter: "(0)"
        });

        // Orders link
        if (userData && userData.role === 'admin') {
            ul.innerHTML += buildNavLink({
                href: "admin-orders.html",
                icon: "bi-truck",
                text: "الطلبات"
            });
        } else {
            ul.innerHTML += buildNavLink({
                href: "orders.html",
                icon: "bi-clipboard-check",
                text: "طلباتي"
            });
        }
        // Admin Panel link (only for admins)
        if (userData && userData.role === 'admin') {
            ul.innerHTML += buildNavLink({
                href: "admin-products.html",
                icon: "bi-speedometer2",
                text: "لوحة الإدارة"
            });
        }

        // Logout link
        ul.innerHTML += buildNavLink({
            href: "logout.html",
            icon: "bi-box-arrow-right",
            text: "تسجيل الخروج"
        });

        
    } else {
        // Not logged in: Login/Register and MyCart links
        ul.innerHTML += buildNavLink({
            href: "login.html",
            icon: "bi-person",
            text: "تسجيل الدخول/إنشاء حساب"
        });
        ul.innerHTML += buildNavLink({
            href: "cart.html",
            icon: "bi-cart",
            text: "سلتي",
            counter: "(0)"
        });
    }

    updateCartCounter();
}

// Run updateHeader on page load
document.addEventListener('DOMContentLoaded', updateHeader);
