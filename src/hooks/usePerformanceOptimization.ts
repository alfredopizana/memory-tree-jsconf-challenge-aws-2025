/**
 * Performance optimization hook for the Día de los Muertos Memory Tree application
 * Provides comprehensive performance monitoring and optimization strategies
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useDebounce, useThrottle, useBatchedUpdates } from '../utils/performance';

export interface PerformanceMetrics {
  renderTime: number;
  renderCount: number;
  memoryUsage: number;
  componentCount: number;
  lastUpdate: Date;
}

export interface PerformanceConfig {
  enableMonitoring: boolean;
  enableOptimizations: boolean;
  debounceDelay: number;
  throttleDelay: number;
  batchDelay: number;
  maxRenderTime: number;
  maxMemoryUsage: number;
}

const DEFAULT_CONFIG: PerformanceConfig = {
  enableMonitoring: process.env.NODE_ENV === 'development',
  enableOptimizations: true,
  debounceDelay: 300,
  throttleDelay: 100,
  batchDelay: 16,
  maxRenderTime: 16, // 60fps target
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB
};

/**
 * Main performance optimization hook
 */
export const usePerformanceOptimization = (
  componentName: string,
  config: Partial<PerformanceConfig> = {}
) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    renderCount: 0,
    memoryUsage: 0,
    componentCount: 0,
    lastUpdate: new Date(),
  });
  
  const renderStartTime = useRef<number>(0);
  const performanceObserver = useRef<PerformanceObserver | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Performance monitoring
  useEffect(() => {
    if (!finalConfig.enableMonitoring) return;

    renderStartTime.current = performance.now();

    // Monitor render performance
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name.includes(componentName)) {
          const renderTime = entry.duration;
          
          setMetrics(prev => ({
            ...prev,
            renderTime,
            renderCount: prev.renderCount + 1,
            lastUpdate: new Date(),
          }));

          // Check for performance warnings
          if (renderTime > finalConfig.maxRenderTime) {
            setWarnings(prev => [
              ...prev.slice(-4), // Keep only last 5 warnings
              `Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`
            ]);
          }
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });
    performanceObserver.current = observer;

    // Measure component render time
    const endTime = performance.now();
    const renderTime = endTime - renderStartTime.current;
    
    performance.mark(`${componentName}-render-start`);
    performance.mark(`${componentName}-render-end`);
    performance.measure(`${componentName}-render`, `${componentName}-render-start`, `${componentName}-render-end`);

    return () => {
      observer.disconnect();
    };
  });

  // Memory monitoring
  useEffect(() => {
    if (!finalConfig.enableMonitoring || !('memory' in performance)) return;

    const checkMemory = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const memoryUsage = memory.usedJSHeapSize;
        
        setMetrics(prev => ({
          ...prev,
          memoryUsage,
        }));

        if (memoryUsage > finalConfig.maxMemoryUsage) {
          setWarnings(prev => [
            ...prev.slice(-4),
            `High memory usage detected: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`
          ]);
        }
      }
    };

    const interval = setInterval(checkMemory, 5000);
    return () => clearInterval(interval);
  }, [finalConfig.enableMonitoring, finalConfig.maxMemoryUsage]);

  // Optimization utilities
  const optimizedDebounce = useCallback(
    <T extends (...args: any[]) => any>(fn: T) => 
      finalConfig.enableOptimizations ? useDebounce(fn, finalConfig.debounceDelay) : fn,
    [finalConfig.enableOptimizations, finalConfig.debounceDelay]
  );

  const optimizedThrottle = useCallback(
    <T extends (...args: any[]) => any>(fn: T) => 
      finalConfig.enableOptimizations ? useThrottle(fn, finalConfig.throttleDelay) : fn,
    [finalConfig.enableOptimizations, finalConfig.throttleDelay]
  );

  const [batchedState, setBatchedState] = useBatchedUpdates({}, finalConfig.batchDelay);

  // Performance recommendations
  const recommendations = useMemo(() => {
    const recs: string[] = [];
    
    if (metrics.renderTime > finalConfig.maxRenderTime) {
      recs.push('Consider memoizing expensive calculations');
      recs.push('Use React.memo for component optimization');
      recs.push('Implement virtualization for large lists');
    }
    
    if (metrics.memoryUsage > finalConfig.maxMemoryUsage * 0.8) {
      recs.push('Consider lazy loading for images');
      recs.push('Implement component cleanup in useEffect');
      recs.push('Use object pooling for frequently created objects');
    }
    
    if (metrics.renderCount > 100) {
      recs.push('Check for unnecessary re-renders');
      recs.push('Use useCallback and useMemo appropriately');
    }
    
    return recs;
  }, [metrics, finalConfig]);

  // Performance report
  const generateReport = useCallback(() => {
    return {
      component: componentName,
      metrics,
      warnings,
      recommendations,
      config: finalConfig,
      timestamp: new Date(),
    };
  }, [componentName, metrics, warnings, recommendations, finalConfig]);

  // Clear warnings
  const clearWarnings = useCallback(() => {
    setWarnings([]);
  }, []);

  return {
    metrics,
    warnings,
    recommendations,
    optimizedDebounce,
    optimizedThrottle,
    batchedState,
    setBatchedState,
    generateReport,
    clearWarnings,
    isOptimizationEnabled: finalConfig.enableOptimizations,
    isMonitoringEnabled: finalConfig.enableMonitoring,
  };
};

/**
 * Hook for monitoring family tree performance specifically
 */
export const useFamilyTreePerformance = (
  familyMembers: any[],
  decorations: any[]
) => {
  const memberCount = familyMembers.length;
  const decorationCount = decorations.length;
  const totalElements = memberCount + decorationCount;
  
  const performanceLevel = useMemo(() => {
    if (totalElements < 20) return 'excellent';
    if (totalElements < 50) return 'good';
    if (totalElements < 100) return 'moderate';
    return 'challenging';
  }, [totalElements]);

  const optimizationSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    
    if (memberCount > 30) {
      suggestions.push('Enable virtualization for family member lists');
      suggestions.push('Use lazy loading for family member photos');
    }
    
    if (decorationCount > 50) {
      suggestions.push('Consider decoration pooling for better performance');
      suggestions.push('Implement decoration culling for off-screen elements');
    }
    
    if (totalElements > 100) {
      suggestions.push('Enable performance monitoring');
      suggestions.push('Consider splitting the altar into multiple views');
    }
    
    return suggestions;
  }, [memberCount, decorationCount, totalElements]);

  const shouldUseVirtualization = totalElements > 50;
  const shouldUseLazyLoading = memberCount > 20;
  const shouldUseOptimizedComponents = totalElements > 30;

  return {
    memberCount,
    decorationCount,
    totalElements,
    performanceLevel,
    optimizationSuggestions,
    shouldUseVirtualization,
    shouldUseLazyLoading,
    shouldUseOptimizedComponents,
  };
};

/**
 * Hook for image performance optimization
 */
export const useImagePerformanceOptimization = () => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  const trackImageLoad = useCallback((src: string) => {
    setLoadingImages(prev => new Set([...prev, src]));
  }, []);

  const markImageLoaded = useCallback((src: string) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(src);
      return newSet;
    });
    setLoadedImages(prev => new Set([...prev, src]));
  }, []);

  const markImageFailed = useCallback((src: string) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(src);
      return newSet;
    });
    setFailedImages(prev => new Set([...prev, src]));
  }, []);

  const getImageStatus = useCallback((src: string) => {
    if (loadingImages.has(src)) return 'loading';
    if (loadedImages.has(src)) return 'loaded';
    if (failedImages.has(src)) return 'failed';
    return 'pending';
  }, [loadingImages, loadedImages, failedImages]);

  const clearImageCache = useCallback(() => {
    setLoadedImages(new Set());
    setFailedImages(new Set());
    setLoadingImages(new Set());
  }, []);

  const getImageStats = useCallback(() => ({
    total: loadedImages.size + failedImages.size + loadingImages.size,
    loaded: loadedImages.size,
    failed: failedImages.size,
    loading: loadingImages.size,
    successRate: loadedImages.size / (loadedImages.size + failedImages.size) || 0,
  }), [loadedImages, failedImages, loadingImages]);

  return {
    trackImageLoad,
    markImageLoaded,
    markImageFailed,
    getImageStatus,
    clearImageCache,
    getImageStats,
    loadedImages,
    failedImages,
    loadingImages,
  };
};