// Input security utilities
const InputSecurity = {
    // Sanitize text input to prevent XSS
    sanitizeText: function(input) {
        if (!input) return '';
        return input
            .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .trim();
    },

    // Validate phone number (9-10 digits)
    validatePhone: function(phone) {
        const phoneRegex = /^\d{9,10}$/;
        return {
            isValid: phoneRegex.test(phone),
            sanitized: phone.replace(/[^\d]/g, '').slice(0, 10)
        };
    },

    // Validate name (Arabic, English letters, and spaces only, 3-50 chars)
    validateName: function(name) {
        const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]{3,50}$/;
        const sanitized = this.sanitizeText(name);
        return {
            isValid: nameRegex.test(sanitized),
            sanitized
        };
    },

    // Validate address (3-200 chars, basic special chars allowed)
    validateAddress: function(address) {
        const addressRegex = /^[\u0600-\u06FFa-zA-Z0-9\s,.-]{3,200}$/;
        const sanitized = this.sanitizeText(address);
        return {
            isValid: addressRegex.test(sanitized),
            sanitized
        };
    },

    // Generate CSRF token
    generateCSRFToken: function() {
        const random = Math.random().toString(36).substring(2, 15);
        const timestamp = Date.now().toString(36);
        return `${random}${timestamp}`;
    },

    // Validate city from predefined list
    validateCity: function(city, validCities) {
        return {
            isValid: validCities.hasOwnProperty(city),
            sanitized: this.sanitizeText(city)
        };
    }
};

// Prevent form resubmission
const FormProtection = {
    submitting: false,
    
    // Start submission process
    startSubmit: function() {
        if (this.submitting) return false;
        this.submitting = true;
        return true;
    },

    // End submission process
    endSubmit: function() {
        this.submitting = false;
    }
};

// Export utilities
window.InputSecurity = InputSecurity;
window.FormProtection = FormProtection;
