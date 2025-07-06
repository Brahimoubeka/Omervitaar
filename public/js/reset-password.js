document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const token = new URLSearchParams(window.location.search).get('token');

    if (!token) {
        showMessage('رابط إعادة تعيين كلمة المرور غير صالح.', 'danger');
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage('كلمات المرور غير متطابقة.', 'danger');
        return;
    }

    if (newPassword.length < 8) {
        showMessage('يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل.', 'danger');
        return;
    }

    try {
        const response = await fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error);
        }

        showMessage('تم تحديث كلمة المرور بنجاح! سيتم تحويلك إلى صفحة تسجيل الدخول...', 'success');
        
        // Redirect to login page after 2 seconds
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);

    } catch (error) {
        showMessage(error.message, 'danger');
    }
});

function showMessage(message, type) {
    const alertClass = `alert alert-${type} alert-dismissible fade show`;
    document.getElementById('reset-message').innerHTML = `
        <div class="${alertClass}" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}
