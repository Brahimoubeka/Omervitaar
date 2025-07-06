/**
 * Performance Monitoring and Web Vitals Tracker
 * Monitors Core Web Vitals and provides performance insights
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      navigation: null,
      paint: {},
      layout: {},
      vitals: {}
    };
    this.observers = [];
    this.init();
  }

  init() {
    // Wait for page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.startMonitoring());
    } else {
      this.startMonitoring();
    }
  }

  startMonitoring() {
    this.setupPerformanceObservers();
    this.measureCoreWebVitals();
    this.trackUserInteractions();
    this.monitorResourceLoading();
    this.setupErrorTracking();
  }

  setupPerformanceObservers() {
    if ('PerformanceObserver' in window) {
      // Navigation timing
      this.observeNavigationTiming();
      
      // Paint timing
      this.observePaintTiming();
      
      // Layout shift
      this.observeLayoutShift();
      
      // Largest contentful paint
      this.observeLargestContentfulPaint();
      
      // First input delay
      this.observeFirstInputDelay();
      
      // Resource timing
      this.observeResourceTiming();
    }
  }

  observeNavigationTiming() {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.metrics.navigation = {
          domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
          loadComplete: entry.loadEventEnd - entry.loadEventStart,
          domInteractive: entry.domInteractive - entry.navigationStart,
          totalPageLoad: entry.loadEventEnd - entry.navigationStart,
          dns: entry.domainLookupEnd - entry.domainLookupStart,
          tcp: entry.connectEnd - entry.connectStart,
          request: entry.responseStart - entry.requestStart,
          response: entry.responseEnd - entry.responseStart,
          processing: entry.domComplete - entry.responseEnd
        };
        
        this.reportMetric('navigation', this.metrics.navigation);
      });
    });
    
    observer.observe({ entryTypes: ['navigation'] });
    this.observers.push(observer);
  }

  observePaintTiming() {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.metrics.paint[entry.name] = entry.startTime;
        
        if (entry.name === 'first-contentful-paint') {
          this.reportMetric('FCP', entry.startTime);
        }
      });
    });
    
    observer.observe({ entryTypes: ['paint'] });
    this.observers.push(observer);
  }

  observeLayoutShift() {
    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries = [];
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Only count layout shifts without recent user input
        if (!entry.hadRecentInput) {
          const firstSessionEntry = sessionEntries[0];
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1];
          
          // If the entry is less than 1 second after the previous entry and
          // less than 5 seconds after the first entry in the session, include it
          if (sessionValue &&
              entry.startTime - lastSessionEntry.startTime < 1000 &&
              entry.startTime - firstSessionEntry.startTime < 5000) {
            sessionValue += entry.value;
            sessionEntries.push(entry);
          } else {
            sessionValue = entry.value;
            sessionEntries = [entry];
          }
          
          // If the current session value is larger than the current CLS value,
          // update CLS and the entries contributing to it.
          if (sessionValue > clsValue) {
            clsValue = sessionValue;
          }
        }
      }
      
      this.metrics.vitals.cls = clsValue;
      this.reportMetric('CLS', clsValue);
    });
    
    observer.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(observer);
  }

  observeLargestContentfulPaint() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      this.metrics.vitals.lcp = lastEntry.startTime;
      this.reportMetric('LCP', lastEntry.startTime);
    });
    
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.push(observer);
  }

  observeFirstInputDelay() {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.metrics.vitals.fid = entry.processingStart - entry.startTime;
        this.reportMetric('FID', this.metrics.vitals.fid);
      });
    });
    
    observer.observe({ entryTypes: ['first-input'] });
    this.observers.push(observer);
  }

  observeResourceTiming() {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        // Track slow resources
        if (entry.duration > 1000) {
          this.reportSlowResource(entry);
        }
        
        // Track failed resources
        if (entry.transferSize === 0 && entry.decodedBodySize > 0) {
          this.reportFailedResource(entry);
        }
      });
    });
    
    observer.observe({ entryTypes: ['resource'] });
    this.observers.push(observer);
  }

  measureCoreWebVitals() {
    // Measure additional metrics using web-vitals library approach
    this.measureTTFB();
    this.measureTTI();
    this.measureSpeed();
  }

  measureTTFB() {
    // Time to First Byte
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    if (navigationEntry) {
      const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      this.metrics.vitals.ttfb = ttfb;
      this.reportMetric('TTFB', ttfb);
    }
  }

  measureTTI() {
    // Time to Interactive (simplified implementation)
    window.addEventListener('load', () => {
      setTimeout(() => {
        const tti = performance.now();
        this.metrics.vitals.tti = tti;
        this.reportMetric('TTI', tti);
      }, 0);
    });
  }

  measureSpeed() {
    // Speed Index approximation
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const speedIndex = this.calculateSpeedIndex(entries);
        this.metrics.vitals.speedIndex = speedIndex;
        this.reportMetric('Speed Index', speedIndex);
      });
      
      observer.observe({ entryTypes: ['element'] });
    }
  }

  calculateSpeedIndex(entries) {
    // Simplified speed index calculation
    let totalScore = 0;
    let count = 0;
    
    entries.forEach(entry => {
      if (entry.identifier && entry.renderTime) {
        totalScore += entry.renderTime;
        count++;
      }
    });
    
    return count > 0 ? totalScore / count : 0;
  }

  trackUserInteractions() {
    // Track interaction timing
    ['click', 'keydown', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        const start = performance.now();
        
        requestIdleCallback(() => {
          const duration = performance.now() - start;
          this.reportInteractionMetric(eventType, duration);
        });
      }, { passive: true });
    });
  }

  monitorResourceLoading() {
    // Monitor critical resource loading
    const criticalResources = [
      '/css/image-optimization.css',
      '/js/image-optimizer.js',
      '/js/resource-optimizer.js',
      'https://lpflwkuvxwuigifmzaxb.supabase.co/storage/v1/object/public/branding/logo.png'
    ];
    
    criticalResources.forEach(resource => {
      this.monitorResourceLoad(resource);
    });
  }

  monitorResourceLoad(resourceUrl) {
    const entries = performance.getEntriesByName(resourceUrl);
    if (entries.length > 0) {
      const entry = entries[0];
      this.reportResourceMetric(resourceUrl, {
        duration: entry.duration,
        size: entry.transferSize,
        cached: entry.transferSize === 0
      });
    }
  }

  setupErrorTracking() {
    // Track JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError('javascript', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error ? event.error.stack : null
      });
    });
    
    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError('promise', {
        reason: event.reason,
        stack: event.reason ? event.reason.stack : null
      });
    });
    
    // Track resource loading errors
    document.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.reportError('resource', {
          tagName: event.target.tagName,
          source: event.target.src || event.target.href,
          message: 'Resource failed to load'
        });
      }
    }, true);
  }

  reportMetric(name, value) {
    console.log(`Performance Metric - ${name}:`, value);
    
    // Send to analytics (implement based on your analytics service)
    this.sendToAnalytics('performance', {
      metric: name,
      value: value,
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      connection: this.getConnectionInfo()
    });
    
    // Check against thresholds
    this.checkPerformanceThresholds(name, value);
  }

  reportSlowResource(entry) {
    console.warn('Slow resource detected:', entry.name, `${entry.duration}ms`);
    
    this.sendToAnalytics('slow_resource', {
      url: entry.name,
      duration: entry.duration,
      size: entry.transferSize,
      type: entry.initiatorType
    });
  }

  reportFailedResource(entry) {
    console.error('Failed resource detected:', entry.name);
    
    this.sendToAnalytics('failed_resource', {
      url: entry.name,
      type: entry.initiatorType,
      timestamp: Date.now()
    });
  }

  reportInteractionMetric(type, duration) {
    if (duration > 100) { // Only report slow interactions
      console.log(`Slow interaction - ${type}:`, `${duration}ms`);
      
      this.sendToAnalytics('slow_interaction', {
        type: type,
        duration: duration,
        timestamp: Date.now()
      });
    }
  }

  reportResourceMetric(url, metrics) {
    console.log(`Resource metrics for ${url}:`, metrics);
    
    this.sendToAnalytics('resource_metrics', {
      url: url,
      ...metrics,
      timestamp: Date.now()
    });
  }

  reportError(type, details) {
    console.error(`Error - ${type}:`, details);
    
    this.sendToAnalytics('error', {
      type: type,
      ...details,
      url: window.location.href,
      timestamp: Date.now()
    });
  }

  checkPerformanceThresholds(metric, value) {
    const thresholds = {
      'FCP': 1800, // First Contentful Paint should be < 1.8s
      'LCP': 2500, // Largest Contentful Paint should be < 2.5s
      'FID': 100,  // First Input Delay should be < 100ms
      'CLS': 0.1,  // Cumulative Layout Shift should be < 0.1
      'TTFB': 600  // Time to First Byte should be < 600ms
    };
    
    if (thresholds[metric] && value > thresholds[metric]) {
      console.warn(`Performance threshold exceeded for ${metric}: ${value} > ${thresholds[metric]}`);
      
      this.sendToAnalytics('threshold_exceeded', {
        metric: metric,
        value: value,
        threshold: thresholds[metric],
        timestamp: Date.now()
      });
    }
  }

  getConnectionInfo() {
    if ('connection' in navigator) {
      const conn = navigator.connection;
      return {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData
      };
    }
    return null;
  }

  sendToAnalytics(event, data) {
    // Implement your analytics sending logic here
    // This could be Google Analytics, custom analytics, etc.
    
    // Example: Send to custom analytics endpoint
    if (navigator.sendBeacon && window.location.hostname !== 'localhost') {
      const payload = JSON.stringify({
        event: event,
        data: data,
        page: window.location.href,
        timestamp: Date.now()
      });
      
      navigator.sendBeacon('/api/analytics/performance', payload);
    }
  }

  generateReport() {
    return {
      timestamp: Date.now(),
      url: window.location.href,
      metrics: this.metrics,
      connection: this.getConnectionInfo(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  exportReport() {
    const report = this.generateReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  cleanup() {
    // Clean up observers
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers = [];
  }
}

// Initialize performance monitoring
const performanceMonitor = new PerformanceMonitor();

// Add global method to export performance report
window.exportPerformanceReport = () => {
  performanceMonitor.exportReport();
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  performanceMonitor.cleanup();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
}
