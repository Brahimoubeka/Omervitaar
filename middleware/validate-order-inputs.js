const { body } = require('express-validator');

const validateOrderInputs = [
    body('shippingName')
        .trim()
        .notEmpty().withMessage('رقم الهاتف مطلوب')
        .matches(/^[\d\+\-\(\) ]{8,}$/).withMessage('رقم الهاتف غير صالح'),

    body('city')
        .trim()
        .notEmpty().withMessage('المدينة مطلوبة')
        .isLength({ min: 2, max: 50 }).withMessage('اسم المدينة غير صالح'),

    body('firstName')
        .trim()
        .notEmpty().withMessage('الاسم الأول مطلوب')
        .isLength({ min: 2, max: 50 }).withMessage('الاسم الأول غير صالح')
        .matches(/^[a-zA-Zأ-ي\s]+$/).withMessage('الاسم الأول يحتوي على أحرف غير صالحة'),

    body('lastName')
        .trim()
        .notEmpty().withMessage('اللقب مطلوب')
        .isLength({ min: 1, max: 50 }).withMessage('اللقب غير صالح')
        .matches(/^[a-zA-Zأ-ي\s\-]+$/).withMessage('اللقب يحتوي على أحرف غير صالحة'),

    body('items')
        .isArray({ min: 1 }).withMessage('يجب إضافة منتج واحد على الأقل')
        .custom((items) => {
            for (const item of items) {
                if (!item.id || !item.quantity || !item.price || !item.name) {
                    throw new Error('بيانات المنتج غير صالحة');
                }
                if (item.quantity < 1) {
                    throw new Error('الكمية يجب أن تكون أكبر من 0');
                }
                if (item.price < 0) {
                    throw new Error('السعر يجب أن يكون أكبر من 0');
                }
            }
            return true;
        }),

    body('cartTotal')
        .isNumeric().withMessage('المجموع غير صالح')
        .custom((value) => value >= 0).withMessage('المجموع يجب أن يكون أكبر من 0'),

    body('deliveryCost')
        .isNumeric().withMessage('تكلفة التوصيل غير صالحة')
        .custom((value) => value >= 0).withMessage('تكلفة التوصيل يجب أن تكون أكبر من 0'),

    body('finalTotal')
        .isNumeric().withMessage('المجموع النهائي غير صالح')
        .custom((value) => value >= 0).withMessage('المجموع النهائي يجب أن يكون أكبر من 0')
        .custom((value, { req }) => {
            const total = parseFloat(req.body.cartTotal) + parseFloat(req.body.deliveryCost);
            return Math.abs(parseFloat(value) - total) < 0.01; // Allow for small floating point differences
        }).withMessage('المجموع النهائي غير صحيح'),

    // Optional fields
    body('shippingAddress').trim().optional(),
    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('البريد الإلكتروني غير صالح')
];

module.exports = validateOrderInputs;
