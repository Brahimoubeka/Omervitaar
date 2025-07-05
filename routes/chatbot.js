const express = require('express');
const router = express.Router();
const { getGeminiResponse } = require('../utils/gemini-ai');
const supabase = require('../supabase');
const fs = require('fs').promises;
const path = require('path');
const rateLimit = require('express-rate-limit');
const timeout = require('connect-timeout');
const { stringSimilarity } = require('../utils/string-similarity');

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

// Helper: Get product IDs by category ID
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

// In-memory store for pending typo suggestions (for demo; use Redis or DB for production)
if (!global.chatbotTypoSuggestions) global.chatbotTypoSuggestions = {};

// Apply rate limiting, input validation, request size limit, and timeout to chatbot endpoint
router.post('/chatbot', 
  chatbotLimiter, 
  requestSizeLimit, 
  timeout(TIMEOUT), 
  validateInput, 
  async (req, res) => {
    const userMessage = req.body.message;
    const lastProductId = req.body.lastProductId || null;
    const type = req.body.type;
    const categoryId = req.body.categoryId;
    const typoConfirm = req.body.typoConfirm; // 'yes' or 'no'
    const sessionKey = req.ip + (categoryId ? `_${categoryId}` : '');

    // Handle typo confirmation flow
    if (global.chatbotTypoSuggestions[sessionKey]) {
      const { product, typoText } = global.chatbotTypoSuggestions[sessionKey];
      if (typoConfirm === 'yes') {
        // User confirmed the suggestion, show only that product
        delete global.chatbotTypoSuggestions[sessionKey];
        return res.json({
          response: `تم اختيار المنتج: ${product.name}\nانظري في هذه المنتجات، وإذا احتجت لمساعدة إضافية، انقر على المنتج وانتقل إلى قسم: اسألنا عن هذا المنتج.`,
          products: [sanitizeProducts([product])[0]]
        });
      } else if (typoConfirm === 'no') {
        // User rejected, suggest contacting a real person
        delete global.chatbotTypoSuggestions[sessionKey];
        return res.json({
          response: `يبدو أنني لم أتمكن من فهم طلبك بدقة. يمكنك التواصل مع شخص حقيقي من فريقنا عبر الهاتف: ${(await getBranding()).phone || ''}`,
          products: [],
          showContactButton: true
        });
      }
    }

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

      let aiCategoryNames = [];
      let categoryIds = [];
      let productIds = [];
      let products = [];
      let branding = await getBranding();

      // Track failed attempts for this session (by IP or session ID, here use a simple in-memory object for demo)
      if (!global.chatbotFailedAttempts) global.chatbotFailedAttempts = {};
      const userKey = req.ip + (categoryId ? `_${categoryId}` : '');
      if (!global.chatbotFailedAttempts[userKey]) global.chatbotFailedAttempts[userKey] = 0;

      // If type is 'find_solution' and categoryId is provided, use only that category
      if (type === 'find_solution' && categoryId) {
        categoryIds = [categoryId];
        productIds = await getProductIdsByCategoryIds(categoryIds);
        products = await getProductsByIds(productIds);
        // Improved: Only return products that match at least 2 unique words from the user's message in description or name
        const msg = userMessage.toLowerCase();
        const msgWords = Array.from(new Set(msg.split(/\s+/).filter(Boolean)));
        products = products.filter(p => {
          const desc = (p.description || '').toLowerCase();
          const name = (p.name || '').toLowerCase();
          let matchCount = 0;
          msgWords.forEach(word => {
            if (desc.includes(word) || name.includes(word)) matchCount++;
          });
          return matchCount >= 2;
        });
        // If no products found, ask user to rephrase once, then suggest contacting a real person
        if (products.length === 0) {
          global.chatbotFailedAttempts[userKey]++;
          if (global.chatbotFailedAttempts[userKey] === 1) {
            return res.json({
              response: 'لم أتمكن من إيجاد منتجات مناسبة بناءً على وصفك. هل يمكنك إعادة شرح مشكلتك أو استخدام كلمات أخرى؟',
              products: [],
              tryAgain: true
            });
          } else {
            // Reset counter for next session
            global.chatbotFailedAttempts[userKey] = 0;
            return res.json({
              response: `يبدو أنني لم أتمكن من فهم مشكلتك بدقة. يمكنك التواصل مع شخص حقيقي من فريقنا عبر الهاتف.`,
              products: [],
              showContactButton: true
            });
          }
        } else {
          // Reset counter on success
          global.chatbotFailedAttempts[userKey] = 0;
        }
      } else {
        // 2. Ask Gemini to classify the message into category names
        const categoryPrompt = `Given the following list of product categories: [${categoryNames.join(', ')}],\nClassify the user's request into the most relevant categories (return as a JSON array of category names, in English or Arabic, no explanation):\nUser message: ${userMessage}`;
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
        categoryIds = await getCategoryIdsByNames(aiCategoryNames);
        // 4. Get product IDs for those categories
        productIds = await getProductIdsByCategoryIds(categoryIds);
        // 5. Get products for those IDs
        products = await getProductsByIds(productIds);
        // If no products found, ask user to rephrase once, then suggest contacting a real person
        if (products.length === 0) {
          global.chatbotFailedAttempts[userKey]++;
          if (global.chatbotFailedAttempts[userKey] === 1) {
            return res.json({
              response: 'لم أتمكن من إيجاد منتجات مناسبة بناءً على وصفك. هل يمكنك إعادة شرح مشكلتك أو استخدام كلمات أخرى؟',
              products: [],
              tryAgain: true
            });
          } else {
            // Reset counter for next session
            global.chatbotFailedAttempts[userKey] = 0;
            return res.json({
              response: `يبدو أنني لم أتمكن من فهم مشكلتك بدقة. يمكنك التواصل مع شخص حقيقي من فريقنا عبر الهاتف.`,
              products: [],
              showContactButton: true
            });
          }
        } else {
          // Reset counter on success
          global.chatbotFailedAttempts[userKey] = 0;
        }
      }

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

      // Only keep orderInstructions and contactInfo for the three supported flows
      const orderInstructions = `\nللشراء: يرجى النظر إلى القسم الموجود في أعلى صفحة المنتجات حيث ستجد شرح تفصيلي لخطوات الطلب والدفع.\n      `;
      const contactInfo = `\nهاتف: ${branding.phone || ''}\nبريد إلكتروني: ${branding.email || ''}\nفيسبوك: فيسبوك Omervita\nانستغرام: انستغرام Omervita\nتيك توك: تيك توك Omervita\n      `;
      // Remove unrelatedQueryResponse and noOtherProductResponse (no longer needed)

      // If user wants more suggestions and there are no other products
      if (isMoreSuggestions && sanitizedProducts.length === 0) {
        return res.json({ response: 'لم أجد منتجات أخرى مثل هذا المنتج، لكن قد لا أكون فهمتك جيدًا. يمكنك البحث يدويًا أو التواصل معنا عبر واتساب.', products: [] });
      }

      // 6. Construct prompt with only relevant products
      let prompt = `You are a helpful customer service bot for Omervita (${branding.companyName || 'Omervita'}), 
                     and you are speaking to customers directly from our website's product page.
                     Please respond in Arabic language only.
                     \nIMPORTANT: Below is the list of our products with their IDs. 
                     When you mention a product, you MUST use the numeric ID in this format: [PRODUCT:{"id":1}]
                     Never use text in the product ID field, only numbers.
                     \nProducts:
                     ${productsForPrompt}
                     \nContact information:
                     ${contactInfo}
                     `;

      // Add special instruction for more suggestions (make it high priority)
      if (isMoreSuggestions && excludedProduct) {
        prompt += `\nVERY IMPORTANT: The user is asking for another suggestion. You MUST suggest a different product from the list above that serves a similar purpose, and DO NOT suggest the product with ID ${excludedProduct}. If there are no other products, reply with this exact message in Arabic: لم أجد منتجات أخرى مثل هذا المنتج، لكن قد لا أكون فهمتك جيدًا. يمكنك البحث يدويًا أو التواصل معنا عبر واتساب. Do NOT use any other message in this case.`;
      }

      // --- STRICT INSTRUCTION: After suggesting products, output ONLY the standard message, no advice, intro, or summary ---
      prompt += `\n\nIMPORTANT: After suggesting products, you MUST NOT write any extra explanation, product description, advice, summary, or intro. ONLY output the product cards and then this exact sentence: 'انظري في هذه المنتجات، وإذا احتجت لمساعدة إضافية، انقر على المنتج وانتقل إلى قسم: اسألنا عن هذا المنتج.' Do NOT add any other text, advice, or explanation before or after the product cards. Do NOT use phrases like 'قد يفيدك استخدام' or any variable intro.`;

      // --- Remove fuzzy matching/typo suggestion instructions (no longer needed for current flows) ---
      // --- Remove any instruction to treat all messages as solution requests (handled by frontend options now) ---

      prompt += `\n\nVERY IMPORTANT INSTRUCTIONS:\n1. You are a chatbot embedded IN our website's products page.\n2. When someone asks about how to buy, purchase, or order, respond with this exact message:${orderInstructions}\n3. CRUCIAL: When recommending or discussing products, you MUST:\n   - Use ONLY numeric IDs in the product reference\n   - Format must be exactly: [PRODUCT:{\"id\":1}] where 1 is replaced with the product's numeric ID\n   - NEVER use product names as IDs, ONLY use numbers\n   - NEVER use Arabic text in the ID field\n4. When someone asks for contact information, provide the full contact details listed above.\n   IMPORTANT: Use plain text only for contact information. DO NOT use bold text, links, HTML tags, or any special formatting.\n5. If the user's message is random, unclear, or not related to our products, ordering, or customer service, reply with: 'عذراً، أنا هنا فقط لمساعدتك في العثور على المنتجات المناسبة لك وحل المشكلات المتعلقة بالتسوق. إذا كان لديك أسئلة أخرى، يرجى التواصل معنا عبر صفحة التواصل هنا على الموقع.'\n6. If the user asks for a cure, solution, or treatment, DO NOT use medical disclaimers or say you cannot provide advice.\n7. Only engage with queries about:\n   - Our products and their uses\n   - How to purchase\n   - Order status\n   - Contact information\n   - Basic customer service\n8. For any other topics, use the unrelated query response above.\n\nUser message: ${userMessage}`;

      const response = await getGeminiResponse(prompt);

      // --- Typo suggestion detection ---
      const typoMatch = String(response).match(/هل تقصد: ([^؟]+)؟/);
      if (typoMatch) {
        // Try to find the suggested product by name (fuzzy, but here exact for demo)
        const suggestedName = typoMatch[1].trim();
        const foundProduct = sanitizedProducts.find(p => p.name.trim() === suggestedName);
        if (foundProduct) {
          // Store pending suggestion for this session
          global.chatbotTypoSuggestions[sessionKey] = { product: foundProduct, typoText: suggestedName };
          // Only return the suggestion message, no products yet
          return res.json({
            response: `هل تقصد: ${suggestedName}؟`,
            products: [],
            typoPending: true
          });
        }
      }

      // Always use the standard message if products are found
      if (sanitizedProducts.length > 0) {
        return res.json({
          response: 'انظري في هذه المنتجات، وإذا احتجت لمساعدة إضافية، انقر على المنتج وانتقل إلى قسم: اسألنا عن هذا المنتج.',
          products: sanitizedProducts
        });
      }

      // Otherwise, fallback to the AI response (for unrelated queries or errors)
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
  } // <-- Close the main POST handler
);

// GET /api/categories for chatbot (returns array, not wrapped)
router.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Categories')
      .select('id, name')
      .order('name', { ascending: true });
    if (error) throw error;
    res.json(Array.isArray(data) ? data : []); // Always return an array
  } catch (err) {
    res.status(500).json({ error: 'Error fetching categories' });
  }
});

module.exports = router;
