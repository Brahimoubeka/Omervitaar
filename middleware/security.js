const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const xss = require('xss');

// Rate limiting middleware
const createRateLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: { error: message },
        standardHeaders: true,
        legacyHeaders: false
    });
};

// Order submission rate limit - 5 orders per 15 minutes
const orderLimiter = createRateLimiter(
    15 * 60 * 1000,
    5,
    'تم تجاوز الحد المسموح به من الطلبات. الرجاء المحاولة لاحقاً'
);

// Guest orders validation middleware
const validateGuestOrder = [
    body('shippingName')
        .trim()
        .matches(/^\d{9,10}$/)
        .withMessage('رقم الهاتف غير صالح'),
    
    body('firstName')
        .trim()
        .matches(/^[\u0600-\u06FFa-zA-Z\s]{3,50}$/)
        .withMessage('الاسم غير صالح'),
    
    body('lastName')
        .trim()
        .matches(/^[\u0600-\u06FFa-zA-Z\s]{0,50}$/)
        .withMessage('اللقب غير صالح'),
    
    body('shippingAddress')
        .trim()
        .isLength({ min: 3, max: 200 })
        .matches(/^[\u0600-\u06FFa-zA-Z0-9\s,.-]*$/)
        .withMessage('العنوان غير صالح'),
    
    body('city')
        .trim()
        .notEmpty()
        .withMessage('الرجاء اختيار المدينة'),
    
    body('items')
        .isArray()
        .withMessage('المنتجات غير صالحة')
        .notEmpty()
        .withMessage('الرجاء إضافة منتج واحد على الأقل'),
    
    body('items.*.id')
        .isInt()
        .withMessage('معرف المنتج غير صالح'),
    
    body('items.*.quantity')
        .isInt({ min: 1, max: 10 })
        .withMessage('الكمية غير صالحة'),
    
    body('cartTotal')
        .isFloat({ min: 0 })
        .withMessage('المجموع غير صالح'),
    
    body('deliveryCost')
        .isFloat({ min: 0 })
        .withMessage('تكلفة التوصيل غير صالحة'),
    
    body('finalTotal')
        .isFloat({ min: 0 })
        .withMessage('المجموع النهائي غير صالح')
];

// Sanitize all text inputs
const sanitizeInputs = (req, res, next) => {
    for (let key in req.body) {
        if (typeof req.body[key] === 'string') {
            req.body[key] = xss(req.body[key].trim());
        }
    }
    next();
};

// Validate CSRF token
const validateCSRFToken = (req, res, next) => {
    const token = req.headers['x-csrf-token'];
    if (!token) {
        return res.status(403).json({ error: 'CSRF token missing' });
    }
    // Add additional token validation if needed
    next();
};

// Size limit middleware
const sizeLimit = (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length']);
    if (contentLength > 10000) { // 10KB limit
        return res.status(413).json({ error: 'حجم الطلب كبير جداً' });
    }
    next();
};

// Validate order totals middleware
const validateOrderTotals = (req, res, next) => {
    const { items, cartTotal, deliveryCost, finalTotal, city } = req.body;
    
    // Get delivery cost from cities list
    const cities = require('../public/js/direct-checkout').cities;
    const expectedDeliveryCost = cities[city] || 0;
    
    // Calculate expected total
    let expectedCartTotal = 0;
    items.forEach(item => {
        expectedCartTotal += item.price * item.quantity;
    });
    
    const expectedFinalTotal = expectedCartTotal + expectedDeliveryCost;
    
    // Compare with 1% tolerance for floating-point arithmetic
    const isClose = (a, b) => Math.abs(a - b) < Math.max(a, b) * 0.01;
    
    if (!isClose(cartTotal, expectedCartTotal) || 
        !isClose(deliveryCost, expectedDeliveryCost) || 
        !isClose(finalTotal, expectedFinalTotal)) {
        return res.status(400).json({ error: 'مجاميع الطلب غير صحيحة' });
    }
    
    next();
};

module.exports = {
    orderLimiter,
    validateGuestOrder,
    sanitizeInputs,
    validateCSRFToken,
    sizeLimit,
    validateOrderTotals
};
