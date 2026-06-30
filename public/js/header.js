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

    if (!document.getElementById('auth-alert-styles')) {
        const style = document.createElement('style');
        style.id = 'auth-alert-styles';
        style.textContent = `
            @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        `;
        document.head.appendChild(style);
    }

    alertContainer.appendChild(alertDiv);
    setTimeout(() => {
        if (alertDiv) {
            alertDiv.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => { if (alertDiv && alertDiv.parentNode) alertDiv.remove(); }, 300);
        }
    }, duration);
}

// Auto-logout if token is expired
function checkTokenExpiry() {
    const token = localStorage.getItem('token');
    if (token && isTokenExpired(token)) {
        localStorage.removeItem('token');
        updateHeader();
        if (!window.location.pathname.includes('cart')) {
            showBootstrapAlert('انتهت صلاحية جلسة العمل. سيتم تحويلك إلى صفحة تسجيل الدخول...', 'warning', 3000);
            setTimeout(() => { window.location.href = '/login?expired=true'; }, 3500);
        }
    }
}

// Update cart counter visually
function updateCartCounter() {
    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem('cart')) || [];
    } catch (e) {
        cart = [];
    }
    let totalCount = cart.reduce((acc, item) => acc + (parseInt(item.quantity, 10) || 0), 0);
    const cartCounter = document.getElementById('cart-counter');
    if (cartCounter) {
        cartCounter.innerHTML = totalCount;
        cartCounter.style.display = totalCount === 0 ? 'none' : 'inline-block';
    }
}

// Build a modern nav link (with icons)
function buildNavLink({ href, icon, text, counter = null, extraClass = "" }) {
    return `
        <li class="nav-item">
            <a class="nav-link d-flex align-items-center ${extraClass}" href="${href}">
                ${icon ? `<i class="bi ${icon} me-1"></i>` : ""}
                ${text}
                ${counter !== null ? `<span id="cart-counter" class="badge bg-danger rounded-pill ms-2" style="display:none;">0</span>` : ""}
            </a>
        </li>
    `;
}

// Dynamically load categories into navbar dropdown
async function loadCategoriesDropdown() {
    try {
        const res = await fetch('/api/categories');
        const categories = await res.json();
        const menu = document.getElementById('categoriesDropdownMenu');
        if (!menu) return;
        menu.innerHTML = '';
        if (Array.isArray(categories) && categories.length > 0) {
            categories.forEach(cat => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.className = 'dropdown-item';
                // Very basic fallback if SlugUtil is missing, though we expect it's loaded in most pages or handled differently
                const slug = cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-');
                a.href = `/categories/${slug}`;
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.location.href = a.href;
                });
                a.textContent = cat.name;
                li.appendChild(a);
                menu.appendChild(li);
            });
        } else {
            menu.innerHTML = '<li><span class="dropdown-item text-muted">لا توجد فئات</span></li>';
        }
    } catch (e) {
        const menu = document.getElementById('categoriesDropdownMenu');
        if (menu) menu.innerHTML = '<li><span class="dropdown-item text-danger">خطأ في التحميل</span></li>';
    }
}

function renderNavbar(userData) {
    let userActions = '';

    if (userData) {
        if (userData.email) {
            userActions += `
                <li class="nav-item me-2 d-none d-lg-block">
                  <span class="nav-link disabled" style="color: #715100; font-weight: 600;">
                    <i class="bi bi-person-circle me-1"></i> مرحبًا، ${userData.email}
                  </span>
                </li>
            `;
        }
        userActions += buildNavLink({ href: "/cart", icon: "bi-cart", text: "سلتي", counter: "(0)" });
        if (userData.role === 'admin') {
            userActions += buildNavLink({ href: "/admin-orders", icon: "bi-truck", text: "الطلبات" });
            userActions += buildNavLink({ href: "/admin-products", icon: "bi-speedometer2", text: "لوحة الإدارة" });
            userActions += buildNavLink({ href: "/admin-messages", icon: "bi-envelope-paper", text: "الرسائل" });
        } else {
            userActions += buildNavLink({ href: "/orders", icon: "bi-clipboard-check", text: "طلباتي" });
        }
        userActions += buildNavLink({ href: "/logout", icon: "bi-box-arrow-right", text: "تسجيل الخروج" });
    } else {
        userActions += buildNavLink({ href: "/login", icon: "bi-person", text: "تسجيل الدخول / إنشاء حساب" });
        userActions += buildNavLink({ href: "/cart", icon: "bi-cart", text: "سلتي", counter: "(0)" });
    }

    return `
  <nav class="navbar navbar-expand-lg navbar-light bg-light shadow-sm fixed-top" dir="rtl">
    <div class="container">
      <a class="navbar-brand d-flex align-items-center fw-bold" href="/">
        <img data-dynamic-logo 
             src="https://lpflwkuvxwuigifmzaxb.supabase.co/storage/v1/object/public/branding/logo.png" 
             alt="Omervita Logo" 
             style="max-width: 50px; max-height: 50px; margin-left: 10px;" 
             class="logo-image critical-image lazy-image"
             loading="eager"
             decoding="async">
        omervita
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
        aria-controls="navbarNav" aria-expanded="false" aria-label="فتح/إغلاق القائمة">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse text-start" id="navbarNav">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0 d-flex flex-column flex-lg-row align-items-start align-items-lg-center gap-2">
          <li class="nav-item"><a class="nav-link" href="/"><i class="bi bi-house me-1"></i> الصفحة الرئيسية</a></li>
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" id="productsDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
              <i class="bi bi-bag me-1"></i> المنتجات
            </a>
            <ul class="dropdown-menu dropdown-menu-end text-start" aria-labelledby="productsDropdown" id="categoriesDropdownMenu">
              <li><span class="dropdown-item text-muted">جاري التحميل...</span></li>
            </ul>
          </li>
          <li class="nav-item"><a class="nav-link" href="/contact"><i class="bi bi-envelope me-1"></i> تواصل معنا</a></li>
        </ul>
        <ul class="navbar-nav ms-auto mb-2 mb-lg-0 user-actions d-flex flex-column flex-lg-row align-items-start align-items-lg-center gap-2">
          ${userActions}
        </ul>
      </div>
    </div>
  </nav>
    `;
}

function renderFooter() {
    return `
  <!-- Footer -->
  <footer class="pt-5 pb-4" dir="ltr" style="background-color: var(--light-gray) !important; border-top: 1px solid rgba(0,0,0,0.05);">
    <div class="container">
      <div class="row text-start">
        <div class="col-md-3 col-12 mb-4">
          <a href="/" class="d-block mb-3">
            <img data-dynamic-logo src="https://lpflwkuvxwuigifmzaxb.supabase.co/storage/v1/object/public/branding/logo.png" alt="Omervita Logo" class="img-fluid" style="max-width: 120px;" />
          </a>
          <p class="text-muted" style="opacity: 0.9;">رضا العملاء أولويتنا</p>
        </div>
        <div class="col-md-3 col-12 mb-4">
          <h5 style="color: var(--military-green);"><i class="bi bi-info-circle me-2"></i>عن Omervita</h5>
          <p class="text-muted" style="opacity: 0.9;">العناية الشخصية من الطبيعة 100٪. استمتعوا بمستوى جديد من الجمال والرفاهية مختارة بعناية بواسطة Omervita</p>
        </div>
        <div class="col-md-3 col-12 mb-4">
          <h5 style="color: var(--military-green);"><i class="bi bi-link-45deg me-2"></i>روابط سريعة</h5>
          <ul class="list-unstyled">
            <li class="mb-2"><a href="/" class="text-decoration-none text-muted"><i class="bi bi-house me-2"></i>الصفحة الرئيسية</a></li>
            <li class="mb-2"><a href="/products" class="text-decoration-none text-muted"><i class="bi bi-bag me-2"></i>المنتجات</a></li>
            <li class="mb-2"><a href="/contact" class="text-decoration-none text-muted"><i class="bi bi-envelope me-2"></i>تواصل معنا</a></li>
          </ul>
        </div>
        <div class="col-md-3 col-12 mb-4">
          <h5 style="color: var(--military-green);"><i class="bi bi-share me-2"></i>تابعنا</h5>
          <div class="d-flex gap-2">
            <a href="https://www.facebook.com/people/Omervita/61568626858755/" class="social-btn facebook social-facebook" aria-label="Facebook"><i class="bi bi-facebook"></i></a>
            <a href="https://www.instagram.com/omervita_" class="social-btn instagram social-instagram" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
            <a href="https://www.tiktok.com/@omervita" class="social-btn tiktok social-tiktok" aria-label="TikTok"><i class="bi bi-tiktok"></i></a>
          </div>
        </div>
      </div>
      <hr style="border-color: rgba(0,0,0,0.1); margin: 2rem 0;">
      <div class="text-center py-2">
        <small class="text-muted" style="font-size: 0.9rem;">
          <i class="bi bi-c-circle me-1" style="color: var(--military-green);"></i>
          2024 Omervita. جميع الحقوق محفوظة
        </small>
      </div>
    </div>
  </footer>
    `;
}

function updateHeader() {
    checkTokenExpiry();
    const token = localStorage.getItem('token');
    let userData = null;
    if (token) {
        userData = parseJwt(token);
    }

    const globalNavbar = document.getElementById('global-navbar');
    if (globalNavbar) {
        globalNavbar.innerHTML = renderNavbar(userData);
    }

    const globalFooter = document.getElementById('global-footer');
    if (globalFooter) {
        globalFooter.innerHTML = renderFooter();
    }

    // Fallback if the page hasn't been refactored yet
    if (!globalNavbar) {
        const userActionsContainer = document.querySelector('.user-actions');
        if (userActionsContainer) {
            let ul;
            if (userActionsContainer.tagName === "UL") {
                ul = userActionsContainer;
            } else {
                userActionsContainer.innerHTML = "";
                ul = document.createElement("ul");
                ul.className = "navbar-nav ms-auto mb-2 mb-lg-0 user-actions d-flex flex-column flex-lg-row align-items-start align-items-lg-center gap-2";
                userActionsContainer.appendChild(ul);
            }
            ul.innerHTML = "";

            // Just manually recreate the userActions string logic
            if (userData) {
                if (userData.email) {
                    ul.innerHTML += `<li class="nav-item me-2 d-none d-lg-block"><span class="nav-link disabled" style="color: #715100; font-weight: 600;"><i class="bi bi-person-circle me-1"></i> مرحبًا، ${userData.email}</span></li>`;
                }
                ul.innerHTML += buildNavLink({ href: "/cart", icon: "bi-cart", text: "سلتي", counter: "(0)" });
                if (userData.role === 'admin') {
                    ul.innerHTML += buildNavLink({ href: "/admin-orders", icon: "bi-truck", text: "الطلبات" });
                    ul.innerHTML += buildNavLink({ href: "/admin-products", icon: "bi-speedometer2", text: "لوحة الإدارة" });
                    ul.innerHTML += buildNavLink({ href: "/admin-messages", icon: "bi-envelope-paper", text: "الرسائل" });
                } else {
                    ul.innerHTML += buildNavLink({ href: "/orders", icon: "bi-clipboard-check", text: "طلباتي" });
                }
                ul.innerHTML += buildNavLink({ href: "/logout", icon: "bi-box-arrow-right", text: "تسجيل الخروج" });
            } else {
                ul.innerHTML += buildNavLink({ href: "/login", icon: "bi-person", text: "تسجيل الدخول / إنشاء حساب" });
                ul.innerHTML += buildNavLink({ href: "/cart", icon: "bi-cart", text: "سلتي", counter: "(0)" });
            }
        }
    }

    updateCartCounter();
    loadCategoriesDropdown();

    // Add scroll listener for fixed navbar
    if (globalNavbar) {
        const nav = globalNavbar.querySelector('.navbar');
        if (nav) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) {
                    nav.classList.add('scrolled');
                } else {
                    nav.classList.add('scrolled'); // Force scrolled background for now since it's thin
                }
            });
        }
    }
}

// Run updateHeader on page load
document.addEventListener('DOMContentLoaded', updateHeader);

// Check token expiry every 5 minutes
setInterval(() => {
    checkTokenExpiry();
}, 5 * 60 * 1000);
