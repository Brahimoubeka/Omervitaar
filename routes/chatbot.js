const express = require('express');
const router = express.Router();
const { getGeminiResponse } = require('../utils/gemini-ai');
const supabase = require('../supabase');
const fs = require('fs').promises;
const path = require('path');
const rateLimit = require('express-rate-limit');
const timeout = require('connect-timeout');

// Rate limiting middleware
const chatbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

// Request size limit middleware
const requestSizeLimit = express.json({
  limit: '10kb' // Limit request size to 10KB
});

// Request timeout middleware
const TIMEOUT = '10s';

// Input validation middleware
function validateInput(req, res, next) {
  // Check for timeout
  if (req.timedout) {
    return res.status(408).json({ error: 'Request timeout' });
  }

  const message = req.body.message;
  
  // Check if message exists and is a string
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid message format' });
  }

  // Check message length
  if (message.length < 1 || message.length > 500) {
    return res.status(400).json({ error: 'Message length must be between 1 and 500 characters' });
  }

  // Check for potential harmful content
  const harmfulPatterns = /(<script|javascript:|data:|file:|vbscript:|onload=)/i;
  if (harmfulPatterns.test(message)) {
    return res.status(400).json({ error: 'Invalid message content' });
  }

  next();
}

// Function to get product data from the database
async function getProducts() {
  const { data, error } = await supabase
    .from('Products')
    .select('id, name, description, price, ProductImages(imagePath)');

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  // Map the data to include a single imagePath for simplicity
  return data.map(p => ({
    ...p,
    imagePath: p.ProductImages && p.ProductImages.length > 0 ? p.ProductImages[0].imagePath : null,
    ProductImages: undefined // Clean up the original array
  }));
}

// Function to get branding data from the JSON file
async function getBranding() {
  try {
    const brandingPath = path.join(__dirname, '../branding.json');
    const brandingData = await fs.readFile(brandingPath, 'utf-8');
    return JSON.parse(brandingData);
  } catch (error) {
    console.error('Error reading branding.json:', error);
    return {};
  }
}

// Sanitize products data before sending to client
function sanitizeProducts(products) {
  return products.map(p => ({
    id: p.id,
    name: p.name ? String(p.name).slice(0, 200) : '',
    description: p.description ? String(p.description).slice(0, 1000) : '',
    price: typeof p.price === 'number' ? p.price : 0,
    imagePath: p.imagePath ? String(p.imagePath).slice(0, 500) : null
  }));
}

// Helper: Get all categories
async function getAllCategories() {
  const { data, error } = await supabase.from('Categories').select('id, name');
  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data;
}

// Helper: Get category IDs by names
async function getCategoryIdsByNames(names) {
  if (!names.length) return [];
  const { data, error } = await supabase
    .from('Categories')
    .select('id, name')
    .in('name', names);
  if (error) {
    console.error('Error fetching category IDs:', error);
    return [];
  }
  return data.map(c => c.id);
}

// Helper: Get product IDs by category IDs
async function getProductIdsByCategoryIds(categoryIds) {
  if (!categoryIds.length) return [];
  const { data, error } = await supabase
    .from('ProductCategories')
    .select('product_id')
    .in('category_id', categoryIds);
  if (error) {
    console.error('Error fetching product IDs:', error);
    return [];
  }
  // Remove duplicates
  return [...new Set(data.map(pc => pc.product_id))];
}

// Helper: Get products by IDs
async function getProductsByIds(productIds) {
  if (!productIds.length) return [];
  const { data, error } = await supabase
    .from('Products')
    .select('id, name, description, price, ProductImages(imagePath)')
    .in('id', productIds);
  if (error) {
    console.error('Error fetching products by IDs:', error);
    return [];
  }
  return data.map(p => ({
    ...p,
    imagePath: p.ProductImages && p.ProductImages.length > 0 ? p.ProductImages[0].imagePath : null,
    ProductImages: undefined
  }));
}

// Keywords to detect 'more suggestions' intent
const moreSuggestionsKeywords = [
  'more', 'another', 'else', 'other', 'suggestion', 'اقتراح', 'آخر', 'ثاني', 'مزيد', 'غيره', 'غيرها', 'شيء آخر', 'شي اخر', 'منتج آخر', 'منتج اخر', 'هل لديك المزيد', 'هل يوجد غير', 'هل يوجد منتج آخر', 'هل يوجد منتج اخر'
];

// Apply rate limiting, input validation, request size limit, and timeout to chatbot endpoint
router.post('/chatbot', 
  chatbotLimiter, 
  requestSizeLimit, 
  timeout(TIMEOUT), 
  validateInput, 
  async (req, res) => {
    const userMessage = req.body.message;
    const lastProductId = req.body.lastProductId || null;

    // Detect contact info requests (Arabic and English keywords)
    const contactKeywords = [
      'contact', 'phone', 'email', 'اتصال', 'هاتف', 'بريد', 'تواصل', 'رقم', 'facebook', 'فيسبوك', 'انستغرام', 'instagram', 'tiktok', 'تيك توك'
    ];
    if (contactKeywords.some(word => userMessage.toLowerCase().includes(word))) {
      return res.json({ response: 'يمكنك الذهاب إلى صفحة التواصل الخاصة بنا وستجد جميع معلومات الاتصال هناك.', products: [] });
    }

    // Detect 'more suggestions' intent
    const isMoreSuggestions = moreSuggestionsKeywords.some(word => userMessage.toLowerCase().includes(word));

    try {
      // 1. Get all categories
      const allCategories = await getAllCategories();
      const categoryNames = allCategories.map(c => c.name);

      // 2. Ask Gemini to classify the message into category names
      const categoryPrompt = `Given the following list of product categories: [${categoryNames.join(', ')}],\nClassify the user's request into the most relevant categories (return as a JSON array of category names, in English or Arabic, no explanation):\nUser message: ${userMessage}`;
      let aiCategoryNames = [];
      try {
        const catResp = await getGeminiResponse(categoryPrompt);
        aiCategoryNames = JSON.parse(catResp.match(/\[.*\]/s)?.[0] || '[]');
      } catch (e) {
        console.error('AI category classification failed:', e);
      }
      if (!Array.isArray(aiCategoryNames) || !aiCategoryNames.length) {
        aiCategoryNames = categoryNames;
      }

      // 3. Get category IDs
      const categoryIds = await getCategoryIdsByNames(aiCategoryNames);
      // 4. Get product IDs for those categories
      const productIds = await getProductIdsByCategoryIds(categoryIds);
      // 5. Get products for those IDs
      let products = await getProductsByIds(productIds);
      const branding = await getBranding();

      // If user wants more suggestions, exclude last suggested product
      let excludedProduct = null;
      if (isMoreSuggestions && lastProductId) {
        products = products.filter(p => p.id !== Number(lastProductId));
        excludedProduct = Number(lastProductId);
      }

      // Sanitize products before using in prompt
      const sanitizedProducts = sanitizeProducts(products);
      const productsForPrompt = sanitizedProducts.map(p => 
        `ID: ${p.id} | Name: ${p.name} | Price: ${p.price} SAR | Description: ${p.description.substring(0, 100)}...`
      ).join('\n');

      const orderInstructions = `\nللشراء: يرجى النظر إلى القسم الموجود في أعلى صفحة المنتجات حيث ستجد شرح تفصيلي لخطوات الطلب والدفع.\n      `;
      const contactInfo = `\nهاتف: ${branding.phone || ''}\nبريد إلكتروني: ${branding.email || ''}\nفيسبوك: فيسبوك Omervita\nانستغرام: انستغرام Omervita\nتيك توك: تيك توك Omervita\n      `;
      const unrelatedQueryResponse = `\nعذراً، أنا هنا فقط لمساعدتك في العثور على المنتجات المناسبة لك وحل المشكلات المتعلقة بالتسوق. إذا كان لديك أسئلة أخرى، يرجى التواصل معنا عبر صفحة التواصل هنا على الموقع.`;
      const noOtherProductResponse = 'لم أجد منتجات أخرى مثل هذا المنتج، لكن قد لا أكون فهمتك جيدًا. يمكنك البحث يدويًا أو التواصل معنا عبر واتساب.';

      // If user wants more suggestions and there are no other products
      if (isMoreSuggestions && sanitizedProducts.length === 0) {
        return res.json({ response: noOtherProductResponse, products: [] });
      }

      // 6. Construct prompt with only relevant products
      let prompt = `You are a helpful customer service bot for Omervita (${branding.companyName || 'Omervita'}), \n                     and you are speaking to customers directly from our website's product page.\n                     Please respond in Arabic language only.\n                     \n                     IMPORTANT: Below is the list of our products with their IDs. \n                     When you mention a product, you MUST use the numeric ID in this format: [PRODUCT:{\"id\":1}]\n                     Never use text in the product ID field, only numbers.\n                     \n                     Products:\n                     ${productsForPrompt}\n                     \n                     Contact information:\n                     ${contactInfo}\n                     `;

      // Add special instruction for more suggestions (make it high priority)
      if (isMoreSuggestions && excludedProduct) {
        prompt += `\nVERY IMPORTANT: The user is asking for another suggestion. You MUST suggest a different product from the list above that serves a similar purpose, and DO NOT suggest the product with ID ${excludedProduct}. If there are no other products, reply with this exact message in Arabic: لم أجد منتجات أخرى مثل هذا المنتج، لكن قد لا أكون فهمتك جيدًا. يمكنك البحث يدويًا أو التواصل معنا عبر واتساب. Do NOT use any other message in this case.`;
      }

      prompt += `\n\nVERY IMPORTANT INSTRUCTIONS:\n1. You are a chatbot embedded IN our website's products page.\n2. When someone asks about how to buy, purchase, or order, respond with this exact message:${orderInstructions}\n3. CRUCIAL: When recommending or discussing products, you MUST:\n   - Use ONLY numeric IDs in the product reference\n   - Format must be exactly: [PRODUCT:{\"id\":1}] where 1 is replaced with the product's numeric ID\n   - NEVER use product names as IDs, ONLY use numbers\n   - NEVER use Arabic text in the ID field\n4. When someone asks for contact information, provide the full contact details listed above.\n   IMPORTANT: Use plain text only for contact information. DO NOT use bold text, links, HTML tags, or any special formatting.\n5. If the user's message is random, unclear, or not related to our products, ordering, or customer service, you MUST FIRST try to match the user's request to the closest available product category (even if the request is indirect or implicit, such as a symptom or a problem). Only if you cannot match to any category, then respond with this exact message:${unrelatedQueryResponse}\n6. If the user asks for a cure, solution, or treatment, DO NOT use medical disclaimers or say you cannot provide advice. Instead, say: 'هنا ما يمكنك استخدامه لمشكلتك، ولكن أنصحك بالتواصل مع فريقنا أولاً لإرشادك بشكل أفضل.' before suggesting products.\n7. Only engage with queries about:\n   - Our products and their uses\n   - How to purchase\n   - Order status\n   - Contact information\n   - Basic customer service\n8. For any other topics, use the unrelated query response above.\n\nUser message: ${userMessage}`;

      const response = await getGeminiResponse(prompt);

      res.json({
        response: String(response).slice(0, 2000),
        products: sanitizedProducts
      });
    } catch (error) {
      console.error('Error in chatbot route:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        response: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
      });
    }
  }
);

module.exports = router;
