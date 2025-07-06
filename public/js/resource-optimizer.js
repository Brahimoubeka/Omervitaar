/**
 * Resource Optimization and Bundling Utility
 * Handles CSS/JS minification, critical CSS extraction, and resource bundling
 */

class ResourceOptimizer {
  constructor() {
    this.criticalCSS = '';
    this.nonCriticalCSS = [];
    this.deferredJS = [];
    this.init();
  }

  init() {
    // Initialize resource optimization
    this.optimizeStylesheets();
    this.optimizeScripts();
    this.setupCriticalResourceLoading();
    this.setupResourceHints();
  }

  optimizeStylesheets() {
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    
    stylesheets.forEach((link, index) => {
      // Skip critical CSS (first few stylesheets)
      if (index < 2) {
        this.markAsCritical(link);
        return;
      }
      
      // Defer non-critical CSS
      this.deferStylesheet(link);
    });
  }

  markAsCritical(link) {
    link.setAttribute('data-critical', 'true');
    link.media = 'all';
  }

  deferStylesheet(link) {
    // Create deferred loading for non-critical CSS
    const href = link.href;
    link.media = 'print';
    link.onload = function() {
      this.media = 'all';
      this.onload = null;
    };
    
    // Fallback for browsers that don't support onload
    setTimeout(() => {
      if (link.media === 'print') {
        link.media = 'all';
      }
    }, 3000);
  }

  optimizeScripts() {
    const scripts = document.querySelectorAll('script[src]');
    
    scripts.forEach(script => {
      // Skip critical scripts
      if (script.hasAttribute('data-critical')) {
        return;
      }
      
      // Add defer attribute for better loading
      if (!script.hasAttribute('async') && !script.hasAttribute('defer')) {
        script.defer = true;
      }
    });
  }

  setupCriticalResourceLoading() {
    // Extract and inline critical CSS
    this.extractCriticalCSS();
    
    // Preload important resources
    this.preloadResources();
  }

  extractCriticalCSS() {
    // Define critical CSS for above-the-fold content
    const criticalCSS = `
      /* Critical CSS for above-the-fold content */
      .navbar { backdrop-filter: blur(10px); }
      .hero-gradient { background: linear-gradient(135deg, #715100, #bb7900); }
      .cover-carousel { position: relative; }
      .cover-img { width: 100%; height: auto; object-fit: cover; }
      .lazy-image { transition: opacity 0.3s ease; }
      .lazy-image.loading { opacity: 0.7; }
      .lazy-image.loaded { opacity: 1; }
      .critical-image { opacity: 1 !important; }
      
      /* Mobile-first critical styles */
      @media (max-width: 768px) {
        .cover-img { height: 250px; }
        .navbar-brand { font-size: 1.2rem; }
      }
    `;
    
    // Inject critical CSS
    const style = document.createElement('style');
    style.textContent = criticalCSS;
    style.setAttribute('data-critical', 'true');
    document.head.insertBefore(style, document.head.firstChild);
  }

  preloadResources() {
    const criticalResources = [
      { href: '/css/image-optimization.css', as: 'style' },
      { href: '/js/image-optimizer.js', as: 'script' },
      { href: 'https://lpflwkuvxwuigifmzaxb.supabase.co/storage/v1/object/public/branding/logo.png', as: 'image' },
      { href: '/images/cover1.png', as: 'image' }
    ];
    
    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      
      if (resource.as === 'style') {
        link.onload = function() {
          this.rel = 'stylesheet';
        };
      }
      
      document.head.appendChild(link);
    });
  }

  setupResourceHints() {
    // Add DNS prefetch for external resources
    const externalDomains = [
      'https://cdn.jsdelivr.net',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ];
    
    externalDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });
    
    // Add preconnect for critical external resources
    const criticalDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ];
    
    criticalDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  // Method to bundle and minify JavaScript
  bundleScripts(scripts) {
    const bundledCode = scripts.map(script => {
      // Simple minification (remove comments and extra spaces)
      return script.replace(/\/\*[\s\S]*?\*\//g, '')
                   .replace(/\/\/.*$/gm, '')
                   .replace(/\s+/g, ' ')
                   .trim();
    }).join(';');
    
    return bundledCode;
  }

  // Method to inline small CSS files
  inlineSmallCSS(cssContent, maxSize = 1024) {
    if (cssContent.length <= maxSize) {
      const style = document.createElement('style');
      style.textContent = cssContent;
      document.head.appendChild(style);
      return true;
    }
    return false;
  }

  // Method to setup service worker for resource caching
  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);
        })
        .catch(error => {
          console.log('Service Worker registration failed:', error);
        });
    }
  }

  // Method to implement lazy loading for non-critical resources
  lazyLoadResources() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          
          // Load deferred stylesheets
          if (element.dataset.lazyCss) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = element.dataset.lazyCss;
            document.head.appendChild(link);
          }
          
          // Load deferred scripts
          if (element.dataset.lazyJs) {
            const script = document.createElement('script');
            script.src = element.dataset.lazyJs;
            script.defer = true;
            document.head.appendChild(script);
          }
          
          observer.unobserve(element);
        }
      });
    });
    
    // Observe elements that trigger lazy loading
    document.querySelectorAll('[data-lazy-css], [data-lazy-js]').forEach(el => {
      observer.observe(el);
    });
  }

  // Method to optimize font loading
  optimizeFonts() {
    // Use font-display: swap for better loading experience
    const fontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
    fontLinks.forEach(link => {
      const url = new URL(link.href);
      url.searchParams.set('display', 'swap');
      link.href = url.toString();
    });
  }

  // Method to implement resource compression hints
  setupCompressionHints() {
    // Add accept-encoding header hints
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Accept-Encoding';
    meta.content = 'gzip, deflate, br';
    document.head.appendChild(meta);
  }

  // Method to optimize third-party scripts
  optimizeThirdPartyScripts() {
    // Defer Bootstrap JS
    const bootstrapScript = document.querySelector('script[src*="bootstrap"]');
    if (bootstrapScript) {
      bootstrapScript.defer = true;
    }
    
    // Lazy load analytics and tracking scripts
    this.lazyLoadAnalytics();
  }

  lazyLoadAnalytics() {
    // Load analytics after page interaction
    const loadAnalytics = () => {
      // Google Analytics or other tracking scripts
      console.log('Loading analytics...');
      document.removeEventListener('scroll', loadAnalytics);
      document.removeEventListener('click', loadAnalytics);
      document.removeEventListener('touchstart', loadAnalytics);
    };
    
    document.addEventListener('scroll', loadAnalytics, { once: true });
    document.addEventListener('click', loadAnalytics, { once: true });
    document.addEventListener('touchstart', loadAnalytics, { once: true });
  }

  // Method to monitor resource loading performance
  monitorResourcePerformance() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.initiatorType === 'link' || entry.initiatorType === 'script') {
            console.log(`Resource ${entry.name} loaded in ${entry.duration}ms`);
          }
        });
      });
      observer.observe({ entryTypes: ['resource'] });
    }
  }

  // Method to implement adaptive loading based on connection
  setupAdaptiveLoading() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      // Adjust loading strategy based on connection quality
      if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
        // Aggressive optimization for slow connections
        this.enableAggressiveOptimization();
      } else if (connection.effectiveType === '4g') {
        // Preload more resources for fast connections
        this.enablePreloadingOptimization();
      }
      
      // Monitor connection changes
      connection.addEventListener('change', () => {
        this.adaptToConnectionChange();
      });
    }
  }

  enableAggressiveOptimization() {
    // Disable non-critical animations
    document.body.classList.add('reduce-motion');
    
    // Lazy load more resources
    this.lazyLoadResources();
    
    // Reduce image quality
    document.querySelectorAll('img').forEach(img => {
      if (img.dataset.lowQuality) {
        img.src = img.dataset.lowQuality;
      }
    });
  }

  enablePreloadingOptimization() {
    // Preload next page resources
    this.preloadNextPage();
    
    // Preload hover targets
    this.preloadHoverTargets();
  }

  preloadNextPage() {
    const links = document.querySelectorAll('a[href^="/"]');
    links.forEach(link => {
      link.addEventListener('mouseenter', () => {
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'prefetch';
        preloadLink.href = link.href;
        document.head.appendChild(preloadLink);
      }, { once: true });
    });
  }

  preloadHoverTargets() {
    const hoverTargets = document.querySelectorAll('[data-hover-preload]');
    hoverTargets.forEach(target => {
      target.addEventListener('mouseenter', () => {
        const resource = target.dataset.hoverPreload;
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = resource;
        document.head.appendChild(link);
      }, { once: true });
    });
  }

  adaptToConnectionChange() {
    const connection = navigator.connection;
    
    if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
      // Switch to aggressive optimization
      this.enableAggressiveOptimization();
    } else {
      // Remove aggressive optimizations
      document.body.classList.remove('reduce-motion');
    }
  }
}

// Initialize the Resource Optimizer
const resourceOptimizer = new ResourceOptimizer();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResourceOptimizer;
}
