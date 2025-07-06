function showMessage(element, message, type) {
    element.innerHTML = "";
    const div = document.createElement("div");
    div.className = `alert alert-${type}`;
    div.innerHTML = message;
    element.appendChild(div);
}

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const gender = document.getElementById('gender').value;
    const birth_date = document.getElementById('birth_date').value;
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('register-message');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جارٍ التسجيل...';

    // control name
    if (name.length < 3 || name.length > 25) {
        showMessage(messageDiv, "يجب أن يكون الاسم بين 3 و 25 حرفًا.", "danger");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
        return;
    }

    // email control 
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        showMessage(messageDiv, "يرجى إدخال بريد إلكتروني صالح. (مثال: name@email.com)", "danger");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
        return;
    }

    // gender
    if (!gender) {
        showMessage(messageDiv, "يرجى اختيار الجنس.", "danger");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
        return;
    }

    // birth date
    if (!birth_date) {
        showMessage(messageDiv, "يرجى إدخال تاريخ الميلاد.", "danger");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
        return;
    }
    // Age check: must be at least 18 years old
    const birth = new Date(birth_date);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    if (age < 18) {
        showMessage(messageDiv, "يجب أن يكون عمرك 18 سنة أو أكثر للتسجيل.", "danger");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
        return;
    }

    // phone number 10 digits, start with 0 
    const phonePattern = /^0[0-9]{9}$/;
    if (!phonePattern.test(phone)) {
        showMessage(messageDiv, "يجب أن يكون رقم الهاتف 10 رقمًا ويبدأ بـ 0.", "danger");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
        return;
    }

    // password : min 8, at least 1 big letter, 1 number, 1 symbol
    const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordPattern.test(password)) {
        showMessage(messageDiv, " (مثال: Userme@1)يجب أن تتكون كلمة المرور من 8 أحرف لاتينية على الأقل، وتحتوي على حرف كبير واحد على الأقل، ورقم واحد، ورمز واحد.", "danger");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, gender, birth_date, phone, password })
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'فشل التسجيل.');
        }
        showMessage(messageDiv, result.message + " ...سيتم تحويلك إلى صفحة تسجيل الدخول", "success");
        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);
    } catch (error) {
        showMessage(messageDiv, "خطأ: " + error.message, "danger");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
    }
});
