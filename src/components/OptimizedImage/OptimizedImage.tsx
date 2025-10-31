import React, { useState, useCallback, useMemo, memo } from 'react';
import { useLazyImage, ImageOptimizer } from '../../utils/performance';
import { LoadingState, Skeleton } from '../LoadingStates/LoadingStates';
import styles from './OptimizedImage.module.css';

export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  placeholder?: string;
  lazyLoad?: boolean;
  optimize?: boolean;
  quality?: number;
  className?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  fallbackSrc?: string;
  culturalContext?: boolean;
}

const OptimizedImageComponent: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  placeholder,
  lazyLoad = true,
  optimize = true,
  quality = 0.8,
  className = '',
  onLoad,
  onError,
  fallbackSrc,
  culturalContext = false,
}) => {
  const [optimizedSrc, setOptimizedSrc] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState<Error | null>(null);

  // Use lazy loading if enabled
  const { targetRef, imageSrc, isLoaded, isError, hasIntersected } = useLazyImage(
    lazyLoad ? (optimizedSrc || src) : (optimizedSrc || src),
    placeholder
  );

  // Optimize image if needed
  const handleImageOptimization = useCallback(async (imageFile: File) => {
    if (!optimize) return src;

    try {
      setIsOptimizing(true);
      const optimized = await ImageOptimizer.optimizeImage(
        imageFile,
        width || 800,
        height || 600,
        quality
      );
      setOptimizedSrc(optimized);
      setOptimizationError(null);
      return optimized;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Image optimization failed');
      setOptimizationError(err);
      if (onError) {
        onError(err);
      }
      return src;
    } finally {
      setIsOptimizing(false);
    }
  }, [src, optimize, width, height, quality, onError]);

  // Handle image load
  const handleLoad = useCallback(() => {
    if (onLoad) {
      onLoad();
    }
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback(() => {
    const error = new Error(`Failed to load image: ${src}`);
    if (onError) {
      onError(error);
    }
  }, [src, onError]);

  // Memoize image styles
  const imageStyles = useMemo(() => ({
    width: width ? `${width}px` : undefined,
    height: height ? `${height}px` : undefined,
  }), [width, height]);

  // Determine what to render
  const renderContent = () => {
    // Show optimization loading
    if (isOptimizing) {
      return (
        <div className={styles.optimizingContainer} style={imageStyles}>
          <LoadingState
            type="photo"
            message="Optimizando imagen..."
            culturalMessage={culturalContext}
            size="small"
          />
        </div>
      );
    }

    // Show lazy loading placeholder
    if (lazyLoad && !hasIntersected) {
      return (
        <div className={styles.placeholderContainer} style={imageStyles}>
          <Skeleton type="image" />
        </div>
      );
    }

    // Show error state
    if (isError || optimizationError) {
      return (
        <div className={styles.errorContainer} style={imageStyles}>
          <div className={styles.errorContent}>
            {culturalContext ? (
              <>
                <span className={styles.errorIcon} aria-hidden="true">🖼️</span>
                <p className={styles.errorMessage}>
                  La imagen no pudo cargarse, pero el recuerdo permanece en nuestros corazones
                </p>
              </>
            ) : (
              <>
                <span className={styles.errorIcon} aria-hidden="true">❌</span>
                <p className={styles.errorMessage}>
                  No se pudo cargar la imagen
                </p>
              </>
            )}
            {fallbackSrc && (
              <img
                src={fallbackSrc}
                alt={alt}
                className={styles.fallbackImage}
                style={imageStyles}
                onLoad={handleLoad}
              />
            )}
          </div>
        </div>
      );
    }

    // Show loading state
    if (lazyLoad && hasIntersected && !isLoaded) {
      return (
        <div className={styles.loadingContainer} style={imageStyles}>
          <LoadingState
            type="photo"
            message="Cargando imagen..."
            culturalMessage={culturalContext}
            size="small"
          />
        </div>
      );
    }

    // Show the actual image
    return (
      <img
        src={imageSrc}
        alt={alt}
        className={styles.optimizedImage}
        style={imageStyles}
        onLoad={handleLoad}
        onError={handleError}
        loading={lazyLoad ? 'lazy' : 'eager'}
        decoding="async"
      />
    );
  };

  const containerClasses = [
    styles.imageContainer,
    culturalContext ? styles.cultural : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      ref={lazyLoad ? targetRef : undefined}
      className={containerClasses}
      role="img"
      aria-label={alt}
    >
      {renderContent()}
      
      {/* Cultural decorative frame */}
      {culturalContext && isLoaded && !isError && !optimizationError && (
        <div className={styles.culturalFrame} aria-hidden="true">
          <div className={styles.marigoldCorner + ' ' + styles.topLeft}></div>
          <div className={styles.marigoldCorner + ' ' + styles.topRight}></div>
          <div className={styles.marigoldCorner + ' ' + styles.bottomLeft}></div>
          <div className={styles.marigoldCorner + ' ' + styles.bottomRight}></div>
        </div>
      )}
    </div>
  );
};

// Memoize the component
export const OptimizedImage = memo(OptimizedImageComponent, (prevProps, nextProps) => {
  return (
    prevProps.src === nextProps.src &&
    prevProps.alt === nextProps.alt &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.lazyLoad === nextProps.lazyLoad &&
    prevProps.optimize === nextProps.optimize &&
    prevProps.quality === nextProps.quality &&
    prevProps.className === nextProps.className &&
    prevProps.fallbackSrc === nextProps.fallbackSrc &&
    prevProps.culturalContext === nextProps.culturalContext
  );
});

/**
 * Hook for batch image optimization
 */
export const useBatchImageOptimization = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [optimizedImages, setOptimizedImages] = useState<Record<string, string>>({});

  const optimizeImages = useCallback(async (
    images: { id: string; file: File; maxWidth?: number; maxHeight?: number }[]
  ) => {
    setIsOptimizing(true);
    setProgress(0);
    
    const results: Record<string, string> = {};
    
    for (let i = 0; i < images.length; i++) {
      const { id, file, maxWidth, maxHeight } = images[i];
      
      try {
        const optimized = await ImageOptimizer.optimizeImage(
          file,
          maxWidth || 800,
          maxHeight || 600,
          0.8
        );
        results[id] = optimized;
      } catch (error) {
        console.error(`Failed to optimize image ${id}:`, error);
      }
      
      setProgress(((i + 1) / images.length) * 100);
    }
    
    setOptimizedImages(prev => ({ ...prev, ...results }));
    setIsOptimizing(false);
    
    return results;
  }, []);

  const clearOptimizedImages = useCallback(() => {
    // Clean up object URLs to prevent memory leaks
    Object.values(optimizedImages).forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    setOptimizedImages({});
  }, [optimizedImages]);

  return {
    optimizeImages,
    clearOptimizedImages,
    isOptimizing,
    progress,
    optimizedImages,
  };
};