/**
 * Algerian Wilayas dictionary for clean Arabic display
 */
const WILAYA_TRANSLATIONS = {
  'adrar': 'أدرار (Adrar)',
  'chlef': 'الشلف (Chlef)',
  'laghouat': 'الأغواط (Laghouat)',
  'oum el bouaghi': 'أم البواقي (Oum El Bouaghi)',
  'batna': 'باتنة (Batna)',
  'béjaïa': 'بجاية (Béjaïa)',
  'bejaia': 'بجاية (Béjaïa)',
  'biskra': 'بسكرة (Biskra)',
  'béchar': 'بشار (Béchar)',
  'bechar': 'بشار (Béchar)',
  'blida': 'البليدة (Blida)',
  'bouira': 'البويرة (Bouira)',
  'tamanrasset': 'تمنراست (Tamanrasset)',
  'tébessa': 'تبسة (Tébessa)',
  'tebessa': 'تبسة (Tébessa)',
  'tlemcen': 'تلمسان (Tlemcen)',
  'tiaret': 'تيارت (Tiaret)',
  'tizi ouzou': 'تيزي وزو (Tizi Ouzou)',
  'algiers': 'الجزائر العاصمة (Alger)',
  'alger': 'الجزائر العاصمة (Alger)',
  'djelfa': 'الجلفة (Djelfa)',
  'jijel': 'جيجل (Jijel)',
  'sétif': 'سطيف (Sétif)',
  'setif': 'سطيف (Sétif)',
  'saïda': 'سعيدة (Saïda)',
  'saida': 'سعيدة (Saïda)',
  'skikda': 'سكيكدة (Skikda)',
  'sidi bel abbès': 'سيدي بلعباس (Sidi Bel Abbès)',
  'sidi bel abbes': 'سيدي بلعباس (Sidi Bel Abbès)',
  'annaba': 'عنابة (Annaba)',
  'guelma': 'قالمة (Guelma)',
  'constantine': 'قسنطينة (Constantine)',
  'médéa': 'المدية (Médéa)',
  'medea': 'المدية (Médéa)',
  'mostaganem': 'مستغانم (Mostaganem)',
  'm\'sila': 'المسيلة (M\'Sila)',
  'msila': 'المسيلة (M\'Sila)',
  'mascara': 'معسكر (Mascara)',
  'ouargla': 'ورقلة (Ouargla)',
  'oran': 'وهران (Oran)',
  'el bayadh': 'البيض (El Bayadh)',
  'illizi': 'إليزي (Illizi)',
  'bordj bou arréridj': 'برج بوعريريج (Bordj Bou Arréridj)',
  'bordj bou arreridj': 'برج بوعريريج (Bordj Bou Arréridj)',
  'boumerdès': 'بومرداس (Boumerdès)',
  'boumerdes': 'بومرداس (Boumerdès)',
  'el tarf': 'الطارف (El Tarf)',
  'tindouf': 'تندوف (Tindouf)',
  'tissemsilt': 'تيسمسيلت (Tissemsilt)',
  'el oued': 'الوادي (El Oued)',
  'khenchela': 'خنشلة (Khenchela)',
  'souk ahras': 'سوق أهراس (Souk Ahras)',
  'tipaza': 'تيبازة (Tipaza)',
  'mila': 'ميلة (Mila)',
  'aïn defla': 'عين الدفلى (Aïn Defla)',
  'ain defla': 'عين الدفلى (Aïn Defla)',
  'naâma': 'النعامة (Naâma)',
  'naama': 'النعامة (Naâma)',
  'aïn témouchent': 'عين تموشنت (Aïn Témouchent)',
  'ain temouchent': 'عين تموشنت (Aïn Témouchent)',
  'ghardaïa': 'غرداية (Ghardaïa)',
  'ghardaia': 'غرداية (Ghardaïa)',
  'relizane': 'غليزان (Relizane)',
  'timimoun': 'تيميمون (Timimoun)',
  'bordj badji mokhtar': 'برج باجي مختار (Bordj Badji Mokhtar)',
  'ouled djellal': 'أولاد جلال (Ouled Djellal)',
  'béni abbès': 'بني عباس (Béni Abbès)',
  'beni abbes': 'بني عباس (Béni Abbès)',
  'in salah': 'عين صالح (In Salah)',
  'in guezzam': 'عين قزام (In Guezzam)',
  'touggourt': 'تقرت (Touggourt)',
  'djanet': 'جانت (Djanet)',
  'el m\'ghair': 'المغير (El M\'Ghair)',
  'el mghair': 'المغير (El M\'Ghair)',
  'el meniaa': 'المنيعة (El Meniaa)'
};

function formatWilayaName(cityStr) {
  if (!cityStr) return '--';
  const clean = String(cityStr).trim();
  const lower = clean.toLowerCase();
  if (WILAYA_TRANSLATIONS[lower]) {
    return WILAYA_TRANSLATIONS[lower];
  }
  // If already Arabic or has non-latin characters
  return clean;
}

/**
 * Parses tags from shipping_address:
 * e.g. "[شركة: Yalidine Express] [استلام من المكتب - Stopdesk] [مسار الطلب: skinsolutions / ...] حي السلام"
 */
function parseShippingInfo(shippingAddress, defaultCompany, defaultType) {
  let address = String(shippingAddress || '').trim();
  let company = defaultCompany || '';
  let type = defaultType || 'home';
  let funnelPath = '';

  // Extract Company tag
  const companyMatch = address.match(/\[شركة:\s*([^\]]+)\]/);
  if (companyMatch) {
    if (!company) company = companyMatch[1].trim();
    address = address.replace(companyMatch[0], '').trim();
  }

  // Extract Stopdesk tag
  if (address.includes('[استلام من المكتب - Stopdesk]') || address.includes('Stopdesk')) {
    type = 'desk';
    address = address.replace(/\[استلام من المكتب - Stopdesk\]/g, '').replace(/\[Stopdesk\]/g, '').trim();
  }

  // Extract Funnel Path tag
  const pathMatch = address.match(/\[مسار الطلب:\s*([^\]]+)\]/);
  if (pathMatch) {
    funnelPath = pathMatch[1].trim();
    address = address.replace(pathMatch[0], '').trim();
  }

  // Clean any remaining orphan brackets
  address = address.replace(/\[\s*\]/g, '').trim();

  return {
    cleanAddress: address,
    company: company || 'Yalidine Express',
    type,
    funnelPath
  };
}

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
  const parsed = parseShippingInfo(shippingAddress, deliveryCompanyName, deliveryType);
  const effectiveCompany = parsed.company;
  const effectiveType = parsed.type;
  const funnelPath = parsed.funnelPath;
  const cleanAddress = parsed.cleanAddress;

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

      let itemName = item.name || 'منتج';
      let optionsListHtml = '';

      // If funnel path in item name, format elegantly
      if (itemName.includes(' / ')) {
        const parts = itemName.split(' / ');
        const mainOffer = parts[parts.length - 1];
        const categoryPath = parts.slice(0, -1).join(' ‹ ');
        itemName = `
          <div style="font-weight: 700; color: #1f2937;">${mainOffer}</div>
          <div style="font-size: 11px; color: #715100; margin-top: 2px; direction: ltr; text-align: right;">
            📁 <strong>المسار:</strong> ${categoryPath}
          </div>
        `;
      } else {
        itemName = `<div style="font-weight: 700; color: #1f2937;">${itemName}</div>`;
      }

      if (Array.isArray(item.selected_options) && item.selected_options.length > 0) {
        const opts = item.selected_options.map(o => o.name ? (o.name + (o.price ? ` (+${o.price} دج)` : '')) : '').filter(Boolean);
        if (opts.length > 0) {
          optionsListHtml = `
            <div style="font-size: 11px; color: #15803d; margin-top: 4px; background: #f0fdf4; padding: 3px 6px; border-radius: 4px; display: inline-block;">
              ✦ خيارات مختارة: ${opts.join(' | ')}
            </div>
          `;
        }
      }

      itemsHtml += `
        <tr style="background-color: ${bg}; border-bottom: 1px solid #f0f0f0;">
          <td style="padding: 12px 14px; text-align: right;">
            ${itemName}
            ${optionsListHtml}
          </td>
          <td style="padding: 12px 14px; text-align: center; color: #555; font-weight: bold;">${qty}</td>
          <td style="padding: 12px 14px; text-align: left; color: #715100; font-weight: 700;">${sub.toFixed(2)} دج</td>
        </tr>
      `;
    });
  }

  const deliveryTypeLabel = effectiveType === 'desk' 
    ? 'استلام من مكتب الشركة (Stopdesk)' 
    : 'توصيل للمنزل (Door-to-Door)';

  const formattedWilaya = formatWilayaName(city);

  return `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; text-align: right; background-color: #f8fafc; padding: 25px 10px;">
    <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #715100, #b48500); padding: 26px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff;">Omervita</h1>
        <p style="margin: 6px 0 0; font-size: 14px; color: #ffffff; opacity: 0.95;">
          ${isGuest ? 'طلب جديد من المتجر / صفحة الهبوط' : 'فاتورة تأكيد الطلب'}
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

        ${funnelPath ? `
        <!-- Funnel Hierarchy Notice -->
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px;">
          <div style="font-size: 12px; color: #1e40af; font-weight: bold; margin-bottom: 4px;">
            📌 مصدر الطلب (مسار صفحة الهبوط):
          </div>
          <div style="font-size: 13px; color: #1e3a8a; font-weight: 600; line-height: 1.5; direction: rtl; text-align: right;">
            ${funnelPath}
          </div>
        </div>
        ` : ''}

        <!-- Customer & Delivery Info -->
        <h3 style="font-size: 15px; color: #715100; border-bottom: 2px solid #ffbf00; padding-bottom: 6px; margin-top: 0; margin-bottom: 14px;">
          معلومات العميل والشحن
        </h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 14px;">
          <tr>
            <td style="padding: 7px 0; color: #666; width: 35%;"><strong>الاسم الكامل:</strong></td>
            <td style="padding: 7px 0; color: #222; font-weight: 600;">${firstName || ''} ${lastName || ''}</td>
          </tr>
          <tr>
            <td style="padding: 7px 0; color: #666;"><strong>رقم الهاتف:</strong></td>
            <td style="padding: 7px 0; color: #222; direction: ltr; text-align: right; font-weight: 600;">
              <a href="tel:${shippingName || ''}" style="color: #715100; text-decoration: none;">${shippingName || ''}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 7px 0; color: #666;"><strong>الولاية:</strong></td>
            <td style="padding: 7px 0; color: #222; font-weight: 600;">${formattedWilaya}</td>
          </tr>
          <tr>
            <td style="padding: 7px 0; color: #666;"><strong>شركة التوصيل:</strong></td>
            <td style="padding: 7px 0; color: #222; font-weight: 600;">${effectiveCompany}</td>
          </tr>
          <tr>
            <td style="padding: 7px 0; color: #666;"><strong>طريقة الاستلام:</strong></td>
            <td style="padding: 7px 0; color: #222; font-weight: 600;">${deliveryTypeLabel}</td>
          </tr>
          ${cleanAddress && cleanAddress !== city ? `
          <tr>
            <td style="padding: 7px 0; color: #666;"><strong>تفاصيل العنوان:</strong></td>
            <td style="padding: 7px 0; color: #222;">${cleanAddress}</td>
          </tr>` : ''}
        </table>

        <!-- Products Table -->
        <h3 style="font-size: 15px; color: #715100; border-bottom: 2px solid #ffbf00; padding-bottom: 6px; margin-top: 0; margin-bottom: 12px;">
          المنتجات والعروض المطلوبة
        </h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 13px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 10px 14px; text-align: right; border-bottom: 2px solid #dee2e6; color: #555;">المنتج / العرض</th>
              <th style="padding: 10px 14px; text-align: center; border-bottom: 2px solid #dee2e6; color: #555; width: 60px;">الكمية</th>
              <th style="padding: 10px 14px; text-align: left; border-bottom: 2px solid #dee2e6; color: #555; width: 100px;">السعر</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Receipt Financial Breakdown -->
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: #fffdf5; border: 1px solid #ffeeba; border-radius: 10px; overflow: hidden;">
          <tr>
            <td style="padding: 11px 16px; color: #555;">مجموع المنتجات والعروض:</td>
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
            <td style="padding: 11px 16px; color: #555;">تكلفة التوصيل (${effectiveCompany} - ${effectiveType === 'desk' ? 'مكتب' : 'منزل'}):</td>
            <td style="padding: 11px 16px; text-align: left; font-weight: 600; color: #222;">
              ${numDeliveryCost === 0 ? '<span style="color: #1b5e20; font-weight: bold;">مجاني 🚚</span>' : `${numDeliveryCost.toFixed(2)} دج`}
            </td>
          </tr>
          <tr style="border-top: 2px solid #ffbf00; background: #fff8e1;">
            <td style="padding: 14px 16px; font-size: 16px; font-weight: bold; color: #715100;">المجموع الكلي المطلوب:</td>
            <td style="padding: 14px 16px; text-align: left; font-size: 18px; font-weight: 800; color: #715100;">${numFinalTotal.toFixed(2)} دج</td>
          </tr>
        </table>

        <!-- Footer Note -->
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; text-align: center; color: #777; font-size: 12px; line-height: 1.6;">
          <p style="margin: 0;">شكراً لثقتكم بـ <strong>Omervita</strong>! سيتم التواصل معكم هاتفياً لتأكيد إرسال الطلبية.</p>
        </div>
      </div>
    </div>
  </div>
  `;
}

module.exports = { generateOrderEmailHtml, formatWilayaName, parseShippingInfo };

