/**
 * Generates a clean, professional HTML receipt for customer & admin emails.
 */
function generateOrderEmailHtml({
  orderRef,
  date,
  firstName,
  lastName,
  shippingName,
  city,
  deliveryCompanyName,
  deliveryType,
  shippingAddress,
  items,
  cartTotal,
  deliveryCost,
  discountAmount,
  promoCode,
  finalTotal,
  isGuest = false
}) {
  const dateStr = date ? new Date(date).toLocaleString('ar-DZ') : new Date().toLocaleString('ar-DZ');
  const numCartTotal = parseFloat(cartTotal) || 0;
  const numDeliveryCost = parseFloat(deliveryCost) || 0;
  const numDiscount = parseFloat(discountAmount) || 0;
  const numFinalTotal = parseFloat(finalTotal) || Math.max(0, numCartTotal - numDiscount) + numDeliveryCost;

  let itemsHtml = '';
  if (Array.isArray(items)) {
    items.forEach((item, index) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.quantity, 10) || 1;
      const sub = price * qty;
      const bg = index % 2 === 0 ? '#ffffff' : '#fcfcfc';
      itemsHtml += `
        <tr style="background-color: ${bg}; border-bottom: 1px solid #f0f0f0;">
          <td style="padding: 10px 12px; font-weight: 600; color: #2c2c2c;">${item.name}</td>
          <td style="padding: 10px 12px; text-align: center; color: #555;">${qty}</td>
          <td style="padding: 10px 12px; text-align: left; color: #715100; font-weight: 600;">${sub.toFixed(2)} دج</td>
        </tr>
      `;
    });
  }

  const deliveryTypeLabel = deliveryType === 'desk' 
    ? 'استلام من المكتب (Stopdesk)' 
    : 'توصيل للمنزل';

  return `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; text-align: right; background-color: #f4f6f8; padding: 25px 10px;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #715100, #ffbf00); padding: 28px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff;">Omervita</h1>
        <p style="margin: 6px 0 0; font-size: 15px; color: #ffffff; opacity: 0.95;">
          ${isGuest ? 'طلب جديد من زائر' : 'فاتورة تأكيد الطلب'}
        </p>
      </div>

      <div style="padding: 24px;">
        <!-- Order Reference Bar -->
        <div style="background: #fdfbf7; border: 1px solid #fae6b2; border-radius: 10px; padding: 12px 16px; margin-bottom: 22px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="font-size: 14px; color: #715100; font-weight: bold;">
                <span style="color: #666; font-weight: normal;">رقم الطلب:</span> #${orderRef}
              </td>
              <td style="font-size: 13px; color: #666; text-align: left;">
                ${dateStr}
              </td>
            </tr>
          </table>
        </div>

        <!-- Customer & Delivery Info -->
        <h3 style="font-size: 15px; color: #715100; border-bottom: 2px solid #ffbf00; padding-bottom: 6px; margin-top: 0; margin-bottom: 14px;">
          معلومات العميل والشحن
        </h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #666; width: 35%;"><strong>الاسم الكامل:</strong></td>
            <td style="padding: 6px 0; color: #222; font-weight: 600;">${firstName || ''} ${lastName || ''}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666;"><strong>رقم الهاتف:</strong></td>
            <td style="padding: 6px 0; color: #222; direction: ltr; text-align: right; font-weight: 600;">${shippingName || ''}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666;"><strong>الولاية:</strong></td>
            <td style="padding: 6px 0; color: #222; font-weight: 600;">${city || ''}</td>
          </tr>
          ${deliveryCompanyName ? `
          <tr>
            <td style="padding: 6px 0; color: #666;"><strong>شركة التوصيل:</strong></td>
            <td style="padding: 6px 0; color: #222;">${deliveryCompanyName}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 0; color: #666;"><strong>طريقة التوصيل:</strong></td>
            <td style="padding: 6px 0; color: #222;">${deliveryTypeLabel}</td>
          </tr>
          ${shippingAddress && !shippingAddress.startsWith('[شركة:') ? `
          <tr>
            <td style="padding: 6px 0; color: #666;"><strong>العنوان:</strong></td>
            <td style="padding: 6px 0; color: #222;">${shippingAddress}</td>
          </tr>` : ''}
        </table>

        <!-- Products Table -->
        <h3 style="font-size: 15px; color: #715100; border-bottom: 2px solid #ffbf00; padding-bottom: 6px; margin-top: 0; margin-bottom: 12px;">
          المنتجات المطلوبة
        </h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 13px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 10px 12px; text-align: right; border-bottom: 2px solid #dee2e6; color: #555;">المنتج</th>
              <th style="padding: 10px 12px; text-align: center; border-bottom: 2px solid #dee2e6; color: #555; width: 60px;">الكمية</th>
              <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #dee2e6; color: #555; width: 90px;">السعر</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Receipt Financial Breakdown -->
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: #fffdf5; border: 1px solid #ffeeba; border-radius: 10px; overflow: hidden;">
          <tr>
            <td style="padding: 11px 16px; color: #555;">مجموع المنتجات:</td>
            <td style="padding: 11px 16px; text-align: left; font-weight: 600; color: #222;">${numCartTotal.toFixed(2)} دج</td>
          </tr>
          ${numDiscount > 0 ? `
          <tr style="background: #e8f5e9;">
            <td style="padding: 11px 16px; color: #1b5e20; font-weight: bold;">
              خصم الكوبون ${promoCode ? `(${promoCode})` : ''}:
            </td>
            <td style="padding: 11px 16px; text-align: left; font-weight: bold; color: #1b5e20;">
              -${numDiscount.toFixed(2)} دج
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding: 11px 16px; color: #555;">تكلفة التوصيل:</td>
            <td style="padding: 11px 16px; text-align: left; font-weight: 600; color: #222;">
              ${numDeliveryCost === 0 ? '<span style="color: #1b5e20; font-weight: bold;">مجاني 🚚</span>' : `${numDeliveryCost.toFixed(2)} دج`}
            </td>
          </tr>
          <tr style="border-top: 2px solid #ffbf00; background: #fff8e1;">
            <td style="padding: 14px 16px; font-size: 16px; font-weight: bold; color: #715100;">المجموع الكلي للطلب:</td>
            <td style="padding: 14px 16px; text-align: left; font-size: 18px; font-weight: 800; color: #715100;">${numFinalTotal.toFixed(2)} دج</td>
          </tr>
        </table>

        <!-- Footer Note -->
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; text-align: center; color: #777; font-size: 12px; line-height: 1.6;">
          <p style="margin: 0;">شكراً لثقتكم بـ <strong>Omervita</strong>! سنقوم بالتواصل معكم هاتفياً لتأكيد إرسال الطلبية.</p>
        </div>
      </div>
    </div>
  </div>
  `;
}

module.exports = { generateOrderEmailHtml };
