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

// Build a modern nav link (with icons) for Desktop
function buildIconLink({ href, icon, text, counter = null, extraClass = "" }) {
    return `
        <a class="nav-link d-flex flex-column align-items-center ${extraClass}" href="${href}" title="${text}" style="color: var(--dark-charcoal); padding: 0.5rem; transition: color 0.2s;">
            <div class="position-relative">
                <i class="bi ${icon}" style="font-size: 1.35rem;"></i>
                ${counter !== null ? `<span class="cart-counter-badge position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="display:none; font-size: 0.65rem;">0</span>` : ""}
            </div>
            <span class="d-none d-xl-block mt-1" style="font-size: 0.75rem; font-weight: 600;">${text}</span>
        </a>
    `;
}

// Build a modern nav link for Mobile Menu
function buildMobileLink({ href, icon, text, counter = null }) {
    return `
        <li class="nav-item border-bottom">
            <a class="nav-link d-flex align-items-center py-2" href="${href}">
                <i class="bi ${icon} me-3" style="font-size: 1.2rem; color: var(--military-green);"></i>
                <span class="fw-medium">${text}</span>
                ${counter !== null ? `<span class="cart-counter-badge badge bg-danger rounded-pill ms-auto" style="display:none;">0</span>` : ""}
            </a>
        </li>
    `;
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
    const cartCounters = document.querySelectorAll('.cart-counter-badge');
    cartCounters.forEach(counter => {
        counter.innerHTML = totalCount;
        counter.style.display = totalCount === 0 ? 'none' : 'inline-block';
    });
}

// Dynamically load categories into navbar dropdown
async function loadCategoriesDropdown() {
    try {
        // Add timeout to prevent hanging forever
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch('/api/categories?_t=' + Date.now(), { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const categories = await res.json();

        const mobileMenu = document.getElementById('categoriesDropdownMenuMobile');
        const desktopMenu = document.getElementById('categoriesDropdownMenuDesktop');

        const renderMenu = (menuElement) => {
            if (!menuElement) return;
            menuElement.innerHTML = '';
            if (Array.isArray(categories) && categories.length > 0) {
                // Add a "All Products" link at the top
                const allLi = document.createElement('li');
                allLi.innerHTML = `<a class="dropdown-item fw-bold text-primary border-bottom pb-2 mb-1" href="/products" style="text-align: right;"><i class="bi bi-collection ms-2"></i>عرض كل المنتجات</a>`;
                menuElement.appendChild(allLi);

                categories.forEach(cat => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.className = 'dropdown-item py-2';
                    a.style.textAlign = 'right';
                    const catName = cat.name || 'بدون اسم';
                    const slug = cat.slug || catName.toLowerCase().replace(/\s+/g, '-');
                    a.href = `/categories/${slug}`;
                    a.addEventListener('click', (e) => {
                        e.preventDefault();
                        window.location.href = a.href;
                    });
                    a.textContent = catName;
                    li.appendChild(a);
                    menuElement.appendChild(li);
                });
            } else {
                menuElement.innerHTML = '<li><span class="dropdown-item text-muted">لا توجد فئات</span></li>';
            }
        };

        renderMenu(mobileMenu);
        renderMenu(desktopMenu);

    } catch (e) {
        console.error('Error loading categories for dropdown:', e);
        const mobileMenu = document.getElementById('categoriesDropdownMenuMobile');
        const desktopMenu = document.getElementById('categoriesDropdownMenuDesktop');

        if (mobileMenu) mobileMenu.innerHTML = `<li><span class="dropdown-item text-danger">خطأ في التحميل</span></li>`;
        if (desktopMenu) desktopMenu.innerHTML = `<li><span class="dropdown-item text-danger">خطأ في التحميل</span></li>`;
    }
}

function renderNavbar(userData) {
    let topIcons = '';
    let bottomLinks = '';
    let mobileLinks = '';

    if (userData) {
        topIcons += buildIconLink({ href: "/cart", icon: "bi-cart3", text: "سلتي", counter: 0 });
        mobileLinks += buildMobileLink({ href: "/cart", icon: "bi-cart3", text: "سلتي", counter: 0 });

        if (userData.role === 'admin') {
            bottomLinks += `<li class="nav-item border-start ps-3 ms-3"><a class="nav-link fw-bold" style="color: var(--orange-accent);" href="/admin-orders"><i class="bi bi-box-seam me-1"></i>الطلبات</a></li>`;
            bottomLinks += `<li class="nav-item"><a class="nav-link fw-bold" style="color: var(--orange-accent);" href="/admin-products"><i class="bi bi-speedometer2 me-1"></i>الإدارة</a></li>`;
            bottomLinks += `<li class="nav-item"><a class="nav-link fw-bold" style="color: var(--orange-accent);" href="/admin-settings"><i class="bi bi-gear me-1"></i>الإعدادات</a></li>`;

            mobileLinks += buildMobileLink({ href: "/admin-orders", icon: "bi-box-seam", text: "الطلبات" });
            mobileLinks += buildMobileLink({ href: "/admin-products", icon: "bi-speedometer2", text: "لوحة الإدارة" });
            mobileLinks += buildMobileLink({ href: "/admin-messages", icon: "bi-envelope-paper", text: "الرسائل" });
            mobileLinks += buildMobileLink({ href: "/admin-settings", icon: "bi-gear", text: "الإعدادات" });
        } else {
            bottomLinks += `<li class="nav-item border-start ps-3 ms-3"><a class="nav-link fw-bold text-primary" href="/orders"><i class="bi bi-clipboard-check me-1"></i>طلباتي</a></li>`;
            mobileLinks += buildMobileLink({ href: "/orders", icon: "bi-clipboard-check", text: "طلباتي" });
        }

        bottomLinks += `<li class="nav-item"><a class="nav-link text-muted" href="/logout"><i class="bi bi-box-arrow-right me-1"></i>خروج</a></li>`;
        mobileLinks += buildMobileLink({ href: "/logout", icon: "bi-box-arrow-right", text: "تسجيل الخروج", extraClass: "text-danger" });
    } else {
        topIcons += buildIconLink({ href: "/login", icon: "bi-person", text: "حسابي" });
        topIcons += buildIconLink({ href: "/cart", icon: "bi-cart3", text: "سلتي", counter: 0 });

        mobileLinks += buildMobileLink({ href: "/login", icon: "bi-person", text: "تسجيل الدخول / إنشاء حساب" });
        mobileLinks += buildMobileLink({ href: "/cart", icon: "bi-cart3", text: "سلتي", counter: 0 });
    }

    // Capture user greeting for mobile menu
    const userGreeting = (userData && userData.email)
        ? `<div class="p-3 bg-light rounded-3 mb-3 text-center border"><i class="bi bi-person-circle fs-3 d-block text-secondary mb-1"></i><span class="fw-bold" style="color: var(--military-green); font-size: 0.9rem;">${userData.email}</span></div>`
        : '';

    const desktopUserGreeting = (userData && userData.email)
        ? `<div class="me-4 pe-4 border-end d-none d-xl-block"><span class="text-muted small d-block" style="line-height: 1;">مرحباً بك</span><span class="fw-bold" style="color: var(--military-green); font-size: 0.95rem;">${userData.email.split('@')[0]}</span></div>`
        : '';

    return `
  <header class="fixed-top shadow-sm bg-white" dir="rtl" style="border-bottom: 3px solid var(--orange-accent);">
    <!-- Top Line (Logo, Search, Core Icons) -->
    <div class="container py-2 py-lg-3 d-flex align-items-center justify-content-between">
      
      <!-- Mobile View (Toggler, Logo, Quick Cart) -->
      <div class="d-flex align-items-center d-lg-none w-100 justify-content-between">
        <button class="navbar-toggler border-0 px-0 focus-ring focus-ring-light bg-transparent" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent" aria-controls="navbarContent" aria-expanded="false" aria-label="Toggle navigation">
          <i class="bi bi-list" style="font-size: 2.2rem; color: var(--dark-charcoal);"></i>
        </button>
        
        <a class="navbar-brand d-flex align-items-center mx-auto fw-bold" href="/" style="text-decoration:none;">
          <img data-dynamic-logo src="https://lpflwkuvxwuigifmzaxb.supabase.co/storage/v1/object/public/branding/logo.png" alt="omervita Logo" style="max-height: 42px; margin-left: 8px;" class="logo-image">
          <span style="color: var(--military-green); font-size: 1.3rem; letter-spacing: 0.5px;">omervita</span>
        </a>
        
        <a href="/cart" class="nav-link" style="color: var(--dark-charcoal); padding: 0.5rem;">
            <div class="position-relative d-inline-block">
              <i class="bi bi-cart3" style="font-size: 1.6rem;"></i>
              <span class="cart-counter-badge position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="display:none; font-size: 0.65rem;">0</span>
            </div>
          </a>
      </div>

      <!-- Desktop Logo -->
      <a class="navbar-brand d-none d-lg-flex align-items-center fw-bold me-0 pe-0" href="/" style="text-decoration:none; min-width: 180px;">
        <img data-dynamic-logo src="https://lpflwkuvxwuigifmzaxb.supabase.co/storage/v1/object/public/branding/logo.png" alt="omervita Logo" style="max-height: 52px; margin-left: 12px;" class="logo-image" loading="eager">
        <span style="color: var(--military-green); font-size: 1.6rem; letter-spacing: 0.5px;">omervita</span>
      </a>

      <!-- Global Search Bar (Desktop Center) -->
      <form class="d-none d-lg-flex flex-grow-1 mx-4 mx-xl-5 position-relative" action="/products" method="GET">
        <div class="input-group" style="border-radius: 24px; overflow: hidden; border: 2px solid var(--orange-accent); box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
          <input type="text" class="form-control border-0 px-4 py-2" name="search" placeholder="ابحث عن منتج ..." aria-label="Search" style="box-shadow: none; font-size: 1.05rem; background: #fafafa;">
          <button class="btn border-0 px-4" type="submit" style="background-color: var(--orange-accent); color: var(--dark-charcoal); border-radius: 0; transition: background 0.2s;" onmouseover="this.style.background='var(--military-green)'; this.style.color='white';" onmouseout="this.style.background='var(--orange-accent)'; this.style.color='var(--dark-charcoal)';">
            <i class="bi bi-search" style="font-size: 1.2rem;"></i>
          </button>
        </div>
      </form>

      <!-- Desktop Icons (Right) -->
      <div class="d-none d-lg-flex align-items-center">
        ${desktopUserGreeting}
        <div class="d-flex gap-3">
          ${topIcons}
        </div>
      </div>
    </div>

    <!-- Bottom Line (Categories & Navigation Links) - Desktop Only -->
    <nav class="navbar navbar-expand-lg py-0 d-none d-lg-block" style="background-color: #f8f9fa; border-top: 1px solid #eee;">
      <div class="container">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0 fw-medium d-flex align-items-center w-100">
          
          <!-- Categories Dropdown -->
          <li class="nav-item dropdown me-4">
            <a class="nav-link dropdown-toggle py-2 px-3 fw-bold text-white d-flex align-items-center" href="#" id="categoriesDropdownDesktop" role="button" data-bs-toggle="dropdown" aria-expanded="false" style="background-color: var(--military-green); border-radius: 0 0 8px 8px;">
              <i class="bi bi-list me-2 fs-5"></i>تصفح الأقسام
            </a>
            <ul class="dropdown-menu shadow border-0 mt-0" aria-labelledby="categoriesDropdownDesktop" id="categoriesDropdownMenuDesktop" style="border-radius: 0 0 8px 8px; border-top: 3px solid var(--military-green) !important; min-width: 220px;">
              <li><span class="dropdown-item text-muted">جاري التحميل...</span></li>
            </ul>
          </li>
          
          <li class="nav-item me-3"><a class="nav-link py-2" href="/"><i class="bi bi-house me-1"></i>الرئيسية</a></li>
          <li class="nav-item me-3"><a class="nav-link py-2" href="/products"><i class="bi bi-bag me-1"></i>المنتجات</a></li>
          <li class="nav-item me-3"><a class="nav-link py-2" href="/contact"><i class="bi bi-headset me-1"></i>تواصل معنا</a></li>
          
          <!-- Push remaining links to the end -->
          <li class="ms-auto"></li>
          ${bottomLinks}
        </ul>
      </div>
    </nav>

    <!-- Collapsible Mobile Menu Content (Mobile Only) -->
    <nav class="navbar navbar-expand-lg p-0 m-0 d-lg-none">
      <div class="container p-0">
        <div class="collapse navbar-collapse bg-white px-3 pb-3" id="navbarContent" style="border-top: 1px solid #eee;">
          <div class="mt-3">
            ${userGreeting}
            
            <!-- Mobile Search -->
            <form class="mb-4" action="/products" method="GET">
              <div class="input-group shadow-sm" style="border-radius: 12px; overflow: hidden; border: 1.5px solid var(--orange-accent);">
                <input type="text" class="form-control border-0 px-3 py-2" name="search" placeholder="ما الذي تبحث عنه؟" style="box-shadow: none;">
                <button class="btn border-0" type="submit" style="background-color: var(--orange-accent); color: var(--dark-charcoal);"><i class="bi bi-search fs-5"></i></button>
              </div>
            </form>

            <ul class="navbar-nav w-100 fw-medium">
              <li class="nav-item border-bottom">
                <a class="nav-link d-flex align-items-center py-2" href="/">
                  <i class="bi bi-house me-3" style="font-size: 1.2rem; color: var(--military-green);"></i>الرئيسية
                </a>
              </li>
              <li class="nav-item dropdown border-bottom">
                <a class="nav-link dropdown-toggle d-flex align-items-center py-2" href="#" id="categoriesDropdownMobile" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i class="bi bi-grid me-3" style="font-size: 1.2rem; color: var(--military-green);"></i>تصفح الأقسام
                </a>
                <ul class="dropdown-menu border-0 shadow-sm rounded-3 mt-1 bg-light" aria-labelledby="categoriesDropdownMobile" id="categoriesDropdownMenuMobile">
                  <li><span class="dropdown-item text-muted small">جاري التحميل...</span></li>
                </ul>
              </li>
              <li class="nav-item border-bottom">
                <a class="nav-link d-flex align-items-center py-2" href="/contact">
                  <i class="bi bi-headset me-3" style="font-size: 1.2rem; color: var(--military-green);"></i>الدعم والمساعدة
                </a>
              </li>
              
              <!-- Spacing -->
              <li class="my-2"></li>
              
              <!-- Mobile User Actions -->
              <li class="nav-item"><h6 class="text-muted ms-2 mt-2 mb-2" style="font-size: 0.8rem;">حسابي</h6></li>
              ${mobileLinks}
            </ul>
          </div>
        </div>
      </div>
    </nav>
  </header>
    `;
}

function renderFooter(settings) {
    const sl = (settings && settings.social_links) ? settings.social_links : {};
    const phones = (settings && settings.phones) ? settings.phones : [];
    const emails = (settings && settings.emails) ? settings.emails : [];

    // Build social links HTML dynamically
    const socialIcons = {
        facebook: 'bi-facebook',
        instagram: 'bi-instagram',
        tiktok: 'bi-tiktok',
        youtube: 'bi-youtube',
        whatsapp: 'bi-whatsapp',
        twitter: 'bi-twitter-x',
        linkedin: 'bi-linkedin'
    };
    const socialColors = {
        facebook: '#1877F2',
        instagram: '#E4405F',
        tiktok: '#000000',
        youtube: '#FF0000',
        whatsapp: '#25D366',
        twitter: '#1DA1F2',
        linkedin: '#0077B5'
    };

    let socialLinksHtml = '';
    Object.entries(sl).forEach(([platform, url]) => {
        if (!url) return;
        const icon = socialIcons[platform] || 'bi-link-45deg';
        const color = socialColors[platform] || '#555';
        socialLinksHtml += `<a href="${url}" class="social-btn social-${platform}" aria-label="${platform}" target="_blank" rel="noopener" style="color:${color}; font-size:1.5rem; margin-right:10px; transition:opacity 0.2s;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'"><i class="bi ${icon}"></i></a>`;
    });
    if (!socialLinksHtml) {
        // Fallback placeholder if no social links set
        socialLinksHtml = '<span class="text-muted small">لم يتم إضافة روابط بعد</span>';
    }

    // Build phones HTML
    let phonesHtml = phones.map(p => `<li class="mb-1"><i class="bi bi-telephone me-2" style="color:var(--military-green);"></i><a href="tel:${p}" class="text-decoration-none text-muted">${p}</a></li>`).join('');
    if (!phonesHtml) phonesHtml = '';

    // Build emails HTML
    let emailsHtml = emails.map(e => `<li class="mb-1"><i class="bi bi-envelope me-2" style="color:var(--military-green);"></i><a href="mailto:${e}" class="text-decoration-none text-muted">${e}</a></li>`).join('');
    if (!emailsHtml) emailsHtml = '';

    const contactSection = (phonesHtml || emailsHtml) ? `
        <div class="col-md-3 col-12 mb-4">
          <h5 style="color: var(--military-green);"><i class="bi bi-telephone me-2"></i>تواصل معنا</h5>
          <ul class="list-unstyled">
            ${phonesHtml}
            ${emailsHtml}
          </ul>
        </div>` : '';

    return `
  <!-- Footer -->
  <footer class="pt-5 pb-4" dir="ltr" style="background-color: var(--light-gray) !important; border-top: 1px solid rgba(0,0,0,0.05);">
    <div class="container">
      <div class="row text-start">
        <div class="col-md-3 col-12 mb-4">
          <a href="/" class="d-block mb-3">
            <img data-dynamic-logo src="https://lpflwkuvxwuigifmzaxb.supabase.co/storage/v1/object/public/branding/logo.png" alt="omervita Logo" class="img-fluid" style="max-width: 120px;" />
          </a>
          <p class="text-muted" style="opacity: 0.9;">رضا العملاء أولويتنا</p>
        </div>

        <div class="col-md-3 col-12 mb-4">
          <h5 style="color: var(--military-green);"><i class="bi bi-link-45deg me-2"></i>روابط سريعة</h5>
          <ul class="list-unstyled">
            <li class="mb-2"><a href="/" class="text-decoration-none text-muted"><i class="bi bi-house me-2"></i>الصفحة الرئيسية</a></li>
            <li class="mb-2"><a href="/products" class="text-decoration-none text-muted"><i class="bi bi-bag me-2"></i>المنتجات</a></li>
            <li class="mb-2"><a href="/contact" class="text-decoration-none text-muted"><i class="bi bi-envelope me-2"></i>تواصل معنا</a></li>
          </ul>
        </div>
        ${contactSection}
        <div class="col-md-3 col-12 mb-4">
          <h5 style="color: var(--military-green);"><i class="bi bi-share me-2"></i>تابعنا</h5>
          <div class="d-flex flex-wrap gap-2 justify-content-center justify-content-md-start" id="footer-social-links">
            ${socialLinksHtml}
          </div>
        </div>
      </div>
      <hr style="border-color: rgba(0,0,0,0.1); margin: 2rem 0;">
      <div class="text-center py-2">
        <small class="text-muted" style="font-size: 0.9rem;">
          <i class="bi bi-c-circle me-1" style="color: var(--military-green);"></i>
          2024 omervita. جميع الحقوق محفوظة
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

    // Render footer with empty settings first, then update dynamically
    const globalFooter = document.getElementById('global-footer');
    if (globalFooter) {
        globalFooter.innerHTML = renderFooter({});
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
                    ul.innerHTML += buildNavLink({ href: "/admin-settings", icon: "bi-gear", text: "إعدادات الموقع" });
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

    // Load site settings and update footer dynamically
    fetch('/api/site-settings')
        .then(r => r.json())
        .then(settings => {
            const globalFooter = document.getElementById('global-footer');
            if (globalFooter) {
                globalFooter.innerHTML = renderFooter(settings);
            }
            // Update logo in navbar too
            if (settings.logo) {
                document.querySelectorAll('img[data-dynamic-logo]').forEach(img => {
                    img.src = settings.logo;
                });
            }
        })
        .catch(() => { /* fail silently, static footer already shown */ });

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

// --- Live Search Proposals (Autocomplete) ---
let searchDebounceTimeout = null;
let allSearchProductsCache = null; // Cache to avoid multiple API calls during the same page visit

async function fetchProductsForSearch() {
    if (allSearchProductsCache) return allSearchProductsCache;
    try {
        const res = await fetch('/api/products');
        if (res.ok) {
            allSearchProductsCache = await res.json();
            return allSearchProductsCache;
        }
    } catch (e) {
        console.error('Error fetching products for search:', e);
    }
    return [];
}

// Event delegation for all search inputs (mobile & desktop)
document.addEventListener('input', (e) => {
    if (e.target && e.target.name === 'search') {
        const input = e.target;
        const query = input.value.trim().toLowerCase();
        const form = input.closest('form');

        if (!form) return;

        // Ensure dropdown container exists inside the form
        let dropdown = form.querySelector('.search-dropdown-container');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.className = 'search-dropdown-container shadow-lg rounded-3';
            // Styling the dropdown with glassmorphism
            dropdown.style.position = 'absolute';
            dropdown.style.top = '100%';
            dropdown.style.left = '0';
            dropdown.style.right = '0';
            dropdown.style.marginTop = '8px';
            dropdown.style.background = 'rgba(255, 255, 255, 0.96)';
            dropdown.style.backdropFilter = 'blur(12px)';
            dropdown.style.WebkitBackdropFilter = 'blur(12px)';
            dropdown.style.zIndex = '1050';
            dropdown.style.maxHeight = '350px';
            dropdown.style.overflowY = 'auto';
            dropdown.style.display = 'none';
            dropdown.style.border = '1px solid rgba(0,0,0,0.08)';
            dropdown.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';

            // Ensure the form can contain the absolute dropdown
            form.style.position = 'relative';
            form.appendChild(dropdown);
        }

        if (query.length < 2) {
            dropdown.style.display = 'none';
            return;
        }

        // Add a small loading indicator while debouncing
        dropdown.innerHTML = `<div class="p-3 text-center text-muted"><span class="spinner-border spinner-border-sm me-2"></span> جاري البحث...</div>`;
        dropdown.style.display = 'block';

        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(async () => {
            const products = await fetchProductsForSearch();

            // Filter products based on search query
            const results = products.filter(p => {
                const nameMatch = p.name && p.name.toLowerCase().includes(query);
                const descMatch = p.description && p.description.toLowerCase().includes(query);
                const catMatch = p.categories && p.categories.some(c => c.name.toLowerCase().includes(query));
                return nameMatch || descMatch || catMatch;
            }).slice(0, 6); // Max 6 results

            if (results.length === 0) {
                dropdown.innerHTML = `<div class="p-3 text-center text-muted fw-bold"><i class="bi bi-search me-2"></i>لا توجد نتائج مطابقة لـ "${query}"</div>`;
            } else {
                dropdown.innerHTML = results.map(p => {
                    const img = (p.images && p.images[0]) ? p.images[0] : (p.imagePath || 'images/default-product.jpg');
                    const slug = p.slug || p.id;
                    return `
                        <a href="/products/${slug}" class="d-flex align-items-center p-3 border-bottom text-decoration-none search-result-item" style="color: var(--dark-charcoal); transition: all 0.2s;">
                            <img src="${img}" alt="${p.name}" style="width: 55px; height: 55px; object-fit: cover; border-radius: 8px; margin-left: 12px; border: 1px solid #eee;">
                            <div class="flex-grow-1">
                                <h6 class="mb-1 fw-bold" style="font-size: 0.95rem; line-height: 1.3;">${p.name}</h6>
                                <span style="color: var(--orange-accent); font-weight: 800; font-size: 0.9rem;">دج${p.price}</span>
                            </div>
                            <i class="bi bi-arrow-left-short text-muted" style="font-size: 1.5rem;"></i>
                        </a>
                    `;
                }).join('');

                // Inject hover style if not already added
                if (!document.getElementById('search-dropdown-style')) {
                    const style = document.createElement('style');
                    style.id = 'search-dropdown-style';
                    style.innerHTML = `
                        .search-result-item:hover {
                            background-color: rgba(255, 191, 0, 0.08) !important;
                            transform: translateX(-4px);
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
        }, 350);
    }
});

// Hide dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-dropdown-container') && !e.target.closest('input[name="search"]')) {
        document.querySelectorAll('.search-dropdown-container').forEach(el => el.style.display = 'none');
    }
});

// Show dropdown again if user clicks back into the input and there's a query
document.addEventListener('focusin', (e) => {
    if (e.target && e.target.name === 'search') {
        const input = e.target;
        if (input.value.trim().length >= 2) {
            const form = input.closest('form');
            if (form) {
                const dropdown = form.querySelector('.search-dropdown-container');
                if (dropdown) dropdown.style.display = 'block';
            }
        }
    }
});
