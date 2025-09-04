/**
 * Performance utilities for the application
 * Contains functions for monitoring and optimizing performance
 */

// Performance monitoring utilities
export const performanceUtils = {
  /**
   * Measure execution time of a function
   */
  measureTime: <T>(fn: () => T): { result: T; time: number } => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    return { result, time: end - start };
  },

  /**
   * Debounce function execution
   */
  debounce: <T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * Throttle function execution
   */
  throttle: <T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Check if element is in viewport
   */
  isInViewport: (element: Element): boolean => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  /**
   * Lazy load images
   */
  lazyLoadImage: (img: HTMLImageElement, src: string): void => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          img.src = src;
          observer.unobserve(img);
        }
      });
    });
    observer.observe(img);
  },

  /**
   * Preload critical resources
   */
  preloadResource: (href: string, as: string = 'fetch'): void => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  },

  /**
   * Get memory usage (if available)
   */
  getMemoryUsage: (): { used: number; total: number } | null => {
    if ('memory' in performance) {
      const memory = (performance as Record<string, { usedJSHeapSize: number; totalJSHeapSize: number }>).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
      };
    }
    return null;
  },

  /**
   * Monitor scroll performance
   */
  monitorScrollPerformance: (callback: (fps: number) => void): (() => void) => {
    let frameCount = 0;
    let lastTime = performance.now();
    let isMonitoring = true;

    const countFrames = () => {
      if (!isMonitoring) return;
      
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        callback(fps);
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(countFrames);
    };

    requestAnimationFrame(countFrames);

    // Return cleanup function
    return () => {
      isMonitoring = false;
    };
  },

  /**
   * Optimize animations for performance
   */
  optimizeAnimation: (element: HTMLElement): void => {
    element.style.willChange = 'transform';
    element.style.transform = 'translateZ(0)'; // Force hardware acceleration
  },

  /**
   * Clean up performance optimizations
   */
  cleanupOptimization: (element: HTMLElement): void => {
    element.style.willChange = 'auto';
  },
};

// API performance monitoring
export const apiPerformance = {
  /**
   * Measure API response time
   */
  measureApiCall: async <T>(
    apiCall: () => Promise<T>
  ): Promise<{ data: T; responseTime: number }> => {
    const start = performance.now();
    const data = await apiCall();
    const end = performance.now();
    return { data, responseTime: end - start };
  },

  /**
   * Cache API responses
   */
  cache: new Map<string, { data: unknown; timestamp: number; ttl: number }>(),

  /**
   * Get cached data
   */
  getCached: <T>(key: string): T | null => {
    const cached = apiPerformance.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      apiPerformance.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  },

  /**
   * Set cached data
   */
  setCached: <T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void => {
    apiPerformance.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  },

  /**
   * Clear cache
   */
  clearCache: (): void => {
    apiPerformance.cache.clear();
  },
};

// Scroll performance optimization
export const scrollPerformance = {
  /**
   * Optimize scroll events
   */
  optimizedScroll: (callback: (event: Event) => void, throttleMs: number = 16) => {
    return performanceUtils.throttle(callback as (...args: unknown[]) => unknown, throttleMs);
  },

  /**
   * Smooth scroll to element
   */
  smoothScrollTo: (element: Element, offset: number = 0): void => {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });
  },

  /**
   * Scroll to top
   */
  scrollToTop: (): void => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  },
};

// Export default for convenience
const performanceModule = {
  performanceUtils,
  apiPerformance,
  scrollPerformance,
};

export default performanceModule;

