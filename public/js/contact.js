document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Collect all fields
  const full_name = document.getElementById('full_name').value.trim();
  const phone_number = document.getElementById('phone_number').value.trim();
  const subject = document.getElementById('subject').value.trim();
  const message_text = document.getElementById('message_text').value.trim();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جارٍ الإرسال...';

  // Validation: Name (at least 3 chars, only Turkish letters and space)
  if (!/^[a-zA-Z\u011f\u00fc\u015f\u0131\u00f6\u00e7\u011E\u00DC\u015E\u0130\u00D6\u00C7 ]{3,}$/.test(full_name)) {
    showMessage('يجب أن يكون الاسم الكامل 3 أحرف على الأقل ويحتوي فقط على أحرف ومسافة.', 'danger');
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
    return;
  }
  // Validation: Phone (9 or 10 digits)
  if (!/^\d{9,10}$/.test(phone_number)) {
    showMessage('يرجى إدخال رقم هاتف صالح مكون من 9 أو 10 أرقام.', 'danger');
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
    return;
  }
  // Validation: Subject (at least 3 chars)
  if (subject.length < 3) {
    showMessage('يجب أن يكون الموضوع 3 أحرف على الأقل.', 'danger');
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
    return;
  }
  // Validation: Message required
  if (!message_text) {
    showMessage('يرجى كتابة رسالتك.', 'danger');
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
    return;
  }
  

  // Guest validation: If no token, require full_name & phone_number (already covered above)
  const token = localStorage.getItem('token');
  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        full_name, phone_number, subject, message_text
      })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'تعذر إرسال الرسالة.');
    }
    showMessage(result.message, 'success');
    document.getElementById('contact-form').reset();
    setTimeout(() => {
            window.location.href = '/';
        }, 3000);
  } catch (error) {
    showMessage(`خطأ: ${error.message}`, 'danger');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
  }
});

function showMessage(message, type = 'success') {
  const container = document.getElementById('contact-message');
  container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
    </div>
  `;
}
