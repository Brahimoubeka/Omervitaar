// Client-side utility for handling slugs and clean URLs
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
  
  // Generate clean URLs for different pages
  static generateProductUrl(product) {
    const slug = product.slug || this.generateProductSlug(product);
    return `/products/${slug}`;
  }
  
  static generateCategoryUrl(category) {
    const slug = category.slug || this.generateCategorySlug(category);
    return `/categories/${slug}`;
  }
  
  // Get current page info from URL
  static getCurrentPageInfo() {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    
    // Check if we're on a product page (handles both /products/123 and /products/slug-123)
    if (path.match(/^\/products\/[\w\d-]+$/i)) {
      const slug = path.replace('/products/', '');
      const productId = this.extractIdFromSlug(slug);
      return { type: 'product', id: productId, slug: slug };
    }
    
    // Check if we're on a category page (handles both /categories/123 and /categories/slug-123)
    if (path.match(/^\/categories\/[\w\d-]+$/i)) {
      const slug = path.replace('/categories/', '');
      const categoryId = this.extractIdFromSlug(slug);
      return { type: 'category', id: categoryId, slug: slug };
    }
    
    // Check legacy URLs
    if (path.includes('product-detail.html') && params.get('id')) {
      return { type: 'product', id: parseInt(params.get('id'), 10), isLegacy: true };
    }
    
    if (path.includes('products.html') && params.get('category')) {
      return { type: 'category', id: parseInt(params.get('category'), 10), isLegacy: true };
    }
    
    return { type: 'unknown' };
  }
  
  // Navigate to a clean URL
  static navigateToProduct(product) {
    const url = this.generateProductUrl(product);
    window.location.href = url;
  }
  
  static navigateToCategory(category) {
    const url = this.generateCategoryUrl(category);
    window.location.href = url;
  }
  
  // Update page title and meta tags for SEO
  static updatePageMeta(title, description, canonicalUrl) {
    document.title = title;
    
    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;
    
    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
    
    // Update Open Graph tags
    this.updateOpenGraphTags(title, description, canonicalUrl);
  }
  
  // Update Open Graph meta tags
  static updateOpenGraphTags(title, description, url) {
    const ogTags = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:type', content: 'website' }
    ];
    
    ogTags.forEach(tag => {
      let ogTag = document.querySelector(`meta[property="${tag.property}"]`);
      if (!ogTag) {
        ogTag = document.createElement('meta');
        ogTag.property = tag.property;
        document.head.appendChild(ogTag);
      }
      ogTag.content = tag.content;
    });
  }
  
  // Generate breadcrumb data
  static generateBreadcrumb(pageInfo, productData = null, categoryData = null) {
    const breadcrumbs = [
      { name: 'الرئيسية', url: '/' }
    ];
    
    if (pageInfo.type === 'product' && productData) {
      breadcrumbs.push({ name: 'المنتجات', url: '/products' });
      if (productData.categories && productData.categories.length > 0) {
        const category = productData.categories[0];
        breadcrumbs.push({ 
          name: category.name, 
          url: `/categories/${this.generateCategorySlug(category)}` 
        });
      }
      breadcrumbs.push({ name: productData.name, url: '', current: true });
    } else if (pageInfo.type === 'category' && categoryData) {
      breadcrumbs.push({ name: 'المنتجات', url: '/products' });
      breadcrumbs.push({ name: categoryData.name, url: '', current: true });
    }
    
    return breadcrumbs;
  }
}

// Make it available globally
window.SlugUtil = SlugUtil;
