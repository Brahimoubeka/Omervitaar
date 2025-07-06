/**
 * Image Optimization and Lazy Loading Utility
 * Provides modern image loading techniques for better performance
 */

class ImageOptimizer {
  constructor() {
    this.intersectionObserver = null;
    this.imageCache = new Map();
    this.init();
  }

  init() {
    // Initialize intersection observer for lazy loading
    this.setupIntersectionObserver();
    
    // Setup image optimization on page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.optimizeImages());
    } else {
      this.optimizeImages();
    }
  }

  setupIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target);
            this.intersectionObserver.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '50px 0px', // Start loading 50px before image enters viewport
        threshold: 0.01
      });
    }
  }

  optimizeImages() {
    // Find all images that need optimization
    const images = document.querySelectorAll('img[data-src], img[src]');
    
    images.forEach(img => {
      this.processImage(img);
    });
  }

  processImage(img) {
    // Add lazy loading class for styling
    img.classList.add('lazy-image');
    
    // If image has data-src, set up lazy loading
    if (img.dataset.src) {
      this.setupLazyLoading(img);
    } else {
      // For images already loaded, optimize them
      this.optimizeLoadedImage(img);
    }
  }

  setupLazyLoading(img) {
    // Add placeholder while loading
    if (!img.src) {
      img.src = this.generatePlaceholder(img);
    }
    
    // Add loading attribute for native lazy loading support
    img.loading = 'lazy';
    
    // Use intersection observer if available
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(img);
    } else {
      // Fallback for older browsers
      this.loadImage(img);
    }
  }

  loadImage(img) {
    const src = img.dataset.src;
    if (!src) return;

    // Create new image to test loading
    const imageLoader = new Image();
    
    imageLoader.onload = () => {
      // Image loaded successfully
      img.src = src;
      img.classList.add('loaded');
      img.classList.remove('loading');
      
      // Remove data-src to prevent reloading
      delete img.dataset.src;
      
      // Cache the image
      this.imageCache.set(src, true);
      
      // Trigger custom event
      img.dispatchEvent(new CustomEvent('imageLoaded', {
        detail: { src, element: img }
      }));
    };
    
    imageLoader.onerror = () => {
      // Image failed to load
      img.classList.add('error');
      img.classList.remove('loading');
      
      // Set fallback image
      img.src = this.getFallbackImage(img);
      
      // Trigger custom event
      img.dispatchEvent(new CustomEvent('imageError', {
        detail: { src, element: img }
      }));
    };
    
    // Start loading
    img.classList.add('loading');
    imageLoader.src = src;
  }

  optimizeLoadedImage(img) {
    // Add modern image attributes
    img.loading = 'lazy';
    img.decoding = 'async';
    
    // Add responsive image attributes if not present
    if (!img.sizes && img.dataset.sizes) {
      img.sizes = img.dataset.sizes;
    }
    
    // Add srcset for responsive images if not present
    if (!img.srcset && img.dataset.srcset) {
      img.srcset = img.dataset.srcset;
    }
  }

  generatePlaceholder(img) {
    // Get image dimensions
    const width = img.width || img.dataset.width || 300;
    const height = img.height || img.dataset.height || 200;
    
    // Create SVG placeholder
    const placeholder = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'%3E%3Crect width='100%25' height='100%25' fill='%23f8f9fa'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='0.35em' fill='%23868e96' font-family='Arial, sans-serif' font-size='14'%3E%D8%AC%D8%A7%D8%B1%D9%8A %D8%A7%D9%84%D8%AA%D8%AD%D9%85%D9%8A%D9%84...%3C/text%3E%3C/svg%3E`;
    
    return placeholder;
  }

  getFallbackImage(img) {
    // Return appropriate fallback based on image type
    if (img.classList.contains('logo') || img.dataset.dynamicLogo !== undefined) {
      return 'https://lpflwkuvxwuigifmzaxb.supabase.co/storage/v1/object/public/branding/logo.png';
    }
    
    if (img.classList.contains('product-image') || img.alt.includes('منتج')) {
      return this.generatePlaceholder(img);
    }
    
    // Default fallback
    return 'https://lpflwkuvxwuigifmzaxb.supabase.co/storage/v1/object/public/branding/logo.png';
  }

  // Method to convert images to WebP format (requires server support)
  supportsWebP() {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  // Method to add responsive image support
  addResponsiveImages(img, breakpoints = [320, 480, 768, 1024, 1200]) {
    if (!img.dataset.baseSrc) return;
    
    const baseSrc = img.dataset.baseSrc;
    const extension = baseSrc.split('.').pop();
    const baseName = baseSrc.replace(`.${extension}`, '');
    
    // Generate srcset for different sizes
    const srcsetEntries = breakpoints.map(width => {
      return `${baseName}_${width}w.${extension} ${width}w`;
    });
    
    img.srcset = srcsetEntries.join(', ');
    img.sizes = '(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw';
  }

  // Method to preload critical images
  preloadCriticalImages(images) {
    images.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });
  }

  // Method to monitor image loading performance
  monitorImagePerformance() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.initiatorType === 'img') {
            console.log(`Image loaded: ${entry.name} in ${entry.duration}ms`);
          }
        });
      });
      observer.observe({ entryTypes: ['resource'] });
    }
  }
}

// Initialize the Image Optimizer
const imageOptimizer = new ImageOptimizer();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageOptimizer;
}
