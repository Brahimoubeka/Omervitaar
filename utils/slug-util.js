// Utility functions for generating and handling slugs
class SlugUtil {
  
  // Generate a slug from a string (product name, category name, etc.)
  static generateSlug(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .toLowerCase()
      .trim()
      // Replace Arabic characters with Latin equivalents where possible
      .replace(/[أإآا]/g, 'a')
      .replace(/[ة]/g, 'h')
      .replace(/[ي]/g, 'y')
      .replace(/[و]/g, 'w')
      .replace(/[ر]/g, 'r')
      .replace(/[ت]/g, 't')
      .replace(/[ن]/g, 'n')
      .replace(/[م]/g, 'm')
      .replace(/[ل]/g, 'l')
      .replace(/[ك]/g, 'k')
      .replace(/[ج]/g, 'j')
      .replace(/[ح]/g, 'h')
      .replace(/[خ]/g, 'kh')
      .replace(/[د]/g, 'd')
      .replace(/[ذ]/g, 'dh')
      .replace(/[ز]/g, 'z')
      .replace(/[س]/g, 's')
      .replace(/[ش]/g, 'sh')
      .replace(/[ص]/g, 's')
      .replace(/[ض]/g, 'd')
      .replace(/[ط]/g, 't')
      .replace(/[ظ]/g, 'z')
      .replace(/[ع]/g, 'a')
      .replace(/[غ]/g, 'gh')
      .replace(/[ف]/g, 'f')
      .replace(/[ق]/g, 'q')
      .replace(/[ه]/g, 'h')
      .replace(/[ء]/g, '')
      // Remove special characters and spaces
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  // Generate a unique slug by appending ID if needed
  static generateUniqueSlug(text, id) {
    const baseSlug = this.generateSlug(text);
    if (!baseSlug) return `item-${id}`;
    return `${baseSlug}-${id}`;
  }
  
  // Extract ID from a slug (assumes format: "slug-text-123")
  // Extract ID from a slug (handles both "slug-text-123" and "123" formats)
  static extractIdFromSlug(slug) {
    if (!slug) return null;
    
    // First check if it's just a numeric ID
    if (/^\d+$/.test(slug)) {
      return parseInt(slug, 10);
    }
    
    // Then check for slug format with ID at the end
    const match = slug.match(/-(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }
  
  // Check if a string is a valid slug format
  static isValidSlug(slug) {
    return /^[a-z0-9-]+$/.test(slug) && slug.includes('-');
  }
  
  // Generate slug for different content types
  static generateProductSlug(product) {
    if (!product || !product.name) return `product-${product.id || 'unknown'}`;
    return this.generateUniqueSlug(product.name, product.id);
  }
  
  static generateCategorySlug(category) {
    if (!category || !category.name) return `category-${category.id || 'unknown'}`;
    return this.generateUniqueSlug(category.name, category.id);
  }
  
  // Generate breadcrumb-friendly slug
  static generateBreadcrumbSlug(text) {
    if (!text || typeof text !== 'string') return '';
    return this.generateSlug(text).replace(/-/g, ' ');
  }
}

module.exports = SlugUtil;
