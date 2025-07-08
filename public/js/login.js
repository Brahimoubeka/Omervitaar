// Forgot Password Modal HTML
document.body.insertAdjacentHTML('beforeend', `
    <div class="modal fade" id="forgotPasswordModal" tabindex="-1" aria-labelledby="forgotPasswordModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="forgotPasswordModalLabel">
                        <i class="bi bi-question-circle me-2"></i>نسيت كلمة المرور
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.</p>
                    <form id="forgot-password-form">
                        <div class="mb-3">
                            <label for="forgot-email" class="form-label">البريد الإلكتروني:</label>
                            <input type="email" class="form-control" id="forgot-email" required>
                        </div>
                        <div id="forgot-password-message"></div>
                        <div class="text-end">
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">إلغاء</button>
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-send me-1"></i>إرسال رابط إعادة التعيين
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
`);

// Handle forgot password link click
document.getElementById('forgot-password-link').addEventListener('click', (e) => {
    e.preventDefault();
    const modal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
    modal.show();
});

// Handle forgot password form submission
document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    const messageDiv = document.getElementById('forgot-password-message');
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>جارٍ الإرسال...';

        const response = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error);
        }

        messageDiv.innerHTML = `
            <div class="alert alert-success mb-3">
                <i class="bi bi-check-circle me-1"></i>${result.message}
            </div>
        `;

        // Clear the form
        e.target.reset();

        // Close modal after 3 seconds
        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal')).hide();
        }, 3000);

    } catch (error) {
        messageDiv.innerHTML = `
            <div class="alert alert-danger mb-3">
                <i class="bi bi-exclamation-triangle me-1"></i>${error.message}
            </div>
        `;
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="bi bi-send me-1"></i>إرسال رابط إعادة التعيين';
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جارٍ الدخول...';
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();
        if (!response.ok) {
            // Clear password field on wrong password
            document.getElementById('password').value = '';
            throw new Error(result.error || 'فشل تسجيل الدخول.');
        }
        // Save the token in localStorage for use in  endpoints (e.g. checkout)
        localStorage.setItem('token', result.token);
        document.getElementById('login-message').innerHTML = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                مرحبا بك...
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
            </div>
            `;

        // Optionally, redirect to home page after a successful login
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    } catch (error) {
        document.getElementById('login-message').innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                خطأ: ${error.message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
            </div>
            `;

    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
    }
});

// Check for expired session parameter and show message
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('expired') === 'true') {
        document.getElementById('login-message').innerHTML = `
            <div class="alert alert-warning alert-dismissible fade show" role="alert">
                <i class="bi bi-exclamation-triangle me-1"></i>انتهت صلاحية جلسة العمل. يرجى تسجيل الدخول مرة أخرى.
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
            </div>
        `;
    }
});
