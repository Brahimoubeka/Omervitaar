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

// Apply rate limiting, input validation, request size limit, and timeout to chatbot endpoint
router.post('/chatbot', 
  chatbotLimiter, 
  requestSizeLimit, 
  timeout(TIMEOUT), 
  validateInput, 
  async (req, res) => {
    const userMessage = req.body.message;

    // Detect contact info requests (Arabic and English keywords)
    const contactKeywords = [
      'contact', 'phone', 'email', 'اتصال', 'هاتف', 'بريد', 'تواصل', 'رقم', 'facebook', 'فيسبوك', 'انستغرام', 'instagram', 'tiktok', 'تيك توك'
    ];
    if (contactKeywords.some(word => userMessage.toLowerCase().includes(word))) {
      return res.json({ response: 'يمكنك الذهاب إلى صفحة التواصل الخاصة بنا وستجد جميع معلومات الاتصال هناك.', products: [] });
    }

    try {
      const products = await getProducts();
      const branding = await getBranding();

      // Sanitize products before using in prompt
      const sanitizedProducts = sanitizeProducts(products);
      
      // Prepare individual product data with clear IDs for the prompt
      const productsForPrompt = sanitizedProducts.map(p => 
        `ID: ${p.id} | Name: ${p.name} | Price: ${p.price} SAR | Description: ${p.description.substring(0, 100)}...`
      ).join('\n');

      const orderInstructions = `
للشراء: يرجى النظر إلى القسم الموجود في أعلى صفحة المنتجات حيث ستجد شرح تفصيلي لخطوات الطلب والدفع.
      `;

      const contactInfo = `
هاتف: ${branding.phone || ''}
بريد إلكتروني: ${branding.email || ''}
فيسبوك: فيسبوك Omervita
انستغرام: انستغرام Omervita
تيك توك: تيك توك Omervita
      `;

      const unrelatedQueryResponse = `
عذراً، أنا هنا فقط لمساعدتك في العثور على المنتجات المناسبة لك وحل المشكلات المتعلقة بالتسوق. إذا كان لديك أسئلة أخرى، يرجى التواصل معنا عبر صفحة التواصل هنا على الموقع.`;

      // Construct prompt with sanitized data and context-aware instructions
      const prompt = `You are a helpful customer service bot for Omervita (${branding.companyName || 'Omervita'}), 
                     and you are speaking to customers directly from our website's product page.
                     Please respond in Arabic language only.
                     
                     IMPORTANT: Below is the list of our products with their IDs. 
                     When you mention a product, you MUST use the numeric ID in this format: [PRODUCT:{"id":1}]
                     Never use text in the product ID field, only numbers.
                     
                     Products:
                     ${productsForPrompt}
                     
                     Contact information:
                     ${contactInfo}
                     
                     VERY IMPORTANT INSTRUCTIONS:
                     1. You are a chatbot embedded IN our website's products page.
                     2. When someone asks about how to buy, purchase, or order, respond with this exact message:${orderInstructions}
                     3. CRUCIAL: When recommending or discussing products, you MUST:
                        - Use ONLY numeric IDs in the product reference
                        - Format must be exactly: [PRODUCT:{"id":1}] where 1 is replaced with the product's numeric ID
                        - NEVER use product names as IDs, ONLY use numbers
                        - NEVER use Arabic text in the ID field
                     4. When someone asks for contact information, provide the full contact details listed above.
                        IMPORTANT: Use plain text only for contact information. DO NOT use bold text, links, HTML tags, or any special formatting.
                     5. If the user's message is random, unclear, or not related to our products, ordering, or customer service,
                        ALWAYS respond with this exact message:${unrelatedQueryResponse}
                     6. Only engage with queries about:
                        - Our products and their uses
                        - How to purchase
                        - Order status
                        - Contact information
                        - Basic customer service
                     7. For any other topics, use the unrelated query response above.
                     
                     User message: ${userMessage}`;

      const response = await getGeminiResponse(prompt);

      // Send sanitized response
      res.json({
        response: String(response).slice(0, 2000), // Limit response length
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
