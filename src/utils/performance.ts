/**
 * Performance optimization utilities for the Día de los Muertos Memory Tree application
 * Provides lazy loading, memoization, and efficient rendering for large family trees
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

/**
 * Debounce hook for performance optimization
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Throttle hook for performance optimization
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
};

/**
 * Intersection Observer hook for lazy loading
 */
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isCurrentlyIntersecting = entry?.isIntersecting || false;
        setIsIntersecting(isCurrentlyIntersecting);
        
        if (isCurrentlyIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [hasIntersected, options]);

  return { targetRef, isIntersecting, hasIntersected };
};

/**
 * Virtual scrolling hook for large lists
 */
export const useVirtualScrolling = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange,
  };
};

/**
 * Image lazy loading hook with placeholder
 */
export const useLazyImage = (src: string, placeholder?: string) => {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const { targetRef, hasIntersected } = useIntersectionObserver();

  useEffect(() => {
    if (!hasIntersected || !src) return;

    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      setIsError(false);
    };
    
    img.onerror = () => {
      setIsError(true);
      setIsLoaded(false);
    };
    
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, hasIntersected]);

  return {
    targetRef,
    imageSrc,
    isLoaded,
    isError,
    hasIntersected,
  };
};

/**
 * Memoized family member calculations
 */
export const useFamilyMemberMemo = (members: any[]) => {
  return useMemo(() => {
    const membersByLevel = members.reduce((acc: Record<number, any[]>, member) => {
      const level = member.altarPosition?.level || 1;
      if (!acc[level]) acc[level] = [];
      acc[level].push(member);
      return acc;
    }, {} as Record<number, any[]>);

    // Sort members within each level by order
    Object.keys(membersByLevel).forEach(level => {
      const levelMembers = membersByLevel[parseInt(level)];
      if (levelMembers) {
        levelMembers.sort(
          (a: any, b: any) => (a.altarPosition?.order || 0) - (b.altarPosition?.order || 0)
        );
      }
    });

    const totalMembers = members.length;
    const deceasedMembers = members.filter(m => m.dateOfDeath).length;
    const livingMembers = totalMembers - deceasedMembers;

    return {
      membersByLevel,
      totalMembers,
      deceasedMembers,
      livingMembers,
      levels: Object.keys(membersByLevel).map(Number).sort(),
    };
  }, [members]);
};

/**
 * Optimized decoration calculations
 */
export const useDecorationMemo = (decorations: any[]) => {
  return useMemo(() => {
    const decorationsByLevel = decorations.reduce((acc: Record<number, any[]>, decoration) => {
      const level = decoration.position?.level || 1;
      if (!acc[level]) acc[level] = [];
      acc[level].push(decoration);
      return acc;
    }, {} as Record<number, any[]>);

    const decorationsByType = decorations.reduce((acc: Record<string, any[]>, decoration) => {
      const type = decoration.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(decoration);
      return acc;
    }, {} as Record<string, any[]>);

    return {
      decorationsByLevel,
      decorationsByType,
      totalDecorations: decorations.length,
    };
  }, [decorations]);
};

/**
 * Performance monitoring hook
 */
export const usePerformanceMonitor = (componentName: string) => {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;

    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log(`${componentName} render #${renderCount.current}: ${renderTime.toFixed(2)}ms`);
    }

    startTime.current = performance.now();
  });

  return {
    renderCount: renderCount.current,
  };
};

/**
 * Optimized drag and drop calculations
 */
export const useDragDropOptimization = () => {
  const dragPreviewRef = useRef<HTMLElement | null>(null);
  const isDragging = useRef(false);

  const optimizedDragStart = useCallback((element: HTMLElement) => {
    isDragging.current = true;
    dragPreviewRef.current = element;
    
    // Reduce DOM updates during drag
    document.body.style.userSelect = 'none';
    document.body.style.pointerEvents = 'none';
    
    // Enable hardware acceleration
    if (element) {
      element.style.willChange = 'transform';
    }
  }, []);

  const optimizedDragEnd = useCallback(() => {
    isDragging.current = false;
    
    // Restore DOM behavior
    document.body.style.userSelect = '';
    document.body.style.pointerEvents = '';
    
    // Disable hardware acceleration
    if (dragPreviewRef.current) {
      dragPreviewRef.current.style.willChange = '';
    }
    
    dragPreviewRef.current = null;
  }, []);

  return {
    optimizedDragStart,
    optimizedDragEnd,
    isDragging: isDragging.current,
  };
};

/**
 * Memory usage optimization for images
 */
export class ImageOptimizer {
  private static cache = new Map<string, string>();
  private static maxCacheSize = 50;

  static async optimizeImage(
    file: File,
    maxWidth: number = 800,
    maxHeight: number = 600,
    quality: number = 0.8
  ): Promise<string> {
    const cacheKey = `${file.name}-${file.size}-${maxWidth}-${maxHeight}-${quality}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedUrl = URL.createObjectURL(blob);
              
              // Cache management
              if (this.cache.size >= this.maxCacheSize) {
                const firstKey = this.cache.keys().next().value;
                if (firstKey) {
                  const firstUrl = this.cache.get(firstKey);
                  if (firstUrl) {
                    URL.revokeObjectURL(firstUrl);
                  }
                  this.cache.delete(firstKey);
                }
              }
              
              this.cache.set(cacheKey, optimizedUrl);
              resolve(optimizedUrl);
            } else {
              reject(new Error('Failed to optimize image'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  static clearCache(): void {
    this.cache.forEach(url => URL.revokeObjectURL(url));
    this.cache.clear();
  }

  static getCacheSize(): number {
    return this.cache.size;
  }
}

/**
 * Component lazy loading utility
 */
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => {
  const LazyComponent = React.lazy(importFn);
  
  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => {
    return React.createElement(React.Suspense, {
      fallback: fallback ? React.createElement(fallback) : React.createElement('div', {}, 'Cargando...')
    }, React.createElement(LazyComponent, { ...props, ref }));
  });
};

/**
 * Batch updates for better performance
 */
export const useBatchedUpdates = <T>(
  initialValue: T,
  batchDelay: number = 16
) => {
  const [value, setValue] = useState(initialValue);
  const pendingUpdate = useRef<T | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const batchedSetValue = useCallback((newValue: T | ((prev: T) => T)) => {
    const resolvedValue = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(pendingUpdate.current ?? value)
      : newValue;
    
    pendingUpdate.current = resolvedValue;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      if (pendingUpdate.current !== null) {
        setValue(pendingUpdate.current);
        pendingUpdate.current = null;
      }
    }, batchDelay);
  }, [value, batchDelay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, batchedSetValue] as const;
};

// Add React import
import React from 'react';