import { useState, useEffect } from 'react';

export interface ScreenSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
}

export interface AdaptiveSizes {
  cardWidth: number;
  cardHeight: number;
  fontSize: number;
  spacing: number;
  borderRadius: number;
  iconSize: number;
}

const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
} as const;

const BASE_SIZES = {
  mobile: {
    cardWidth: 140,
    cardHeight: 180,
    fontSize: 0.85,
    spacing: 0.5,
    borderRadius: 6,
    iconSize: 1.1,
  },
  tablet: {
    cardWidth: 200,
    cardHeight: 240,
    fontSize: 1,
    spacing: 1,
    borderRadius: 8,
    iconSize: 1.25,
  },
  desktop: {
    cardWidth: 240,
    cardHeight: 280,
    fontSize: 1.125,
    spacing: 1.5,
    borderRadius: 12,
    iconSize: 1.5,
  },
} as const;

export const useScreenSize = (): ScreenSize => {
  const [screenSize, setScreenSize] = useState<ScreenSize>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        orientation: 'landscape',
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      width,
      height,
      isMobile: width <= BREAKPOINTS.mobile,
      isTablet: width > BREAKPOINTS.mobile && width <= BREAKPOINTS.tablet,
      isDesktop: width > BREAKPOINTS.tablet,
      orientation: width > height ? 'landscape' : 'portrait',
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({
        width,
        height,
        isMobile: width <= BREAKPOINTS.mobile,
        isTablet: width > BREAKPOINTS.mobile && width <= BREAKPOINTS.tablet,
        isDesktop: width > BREAKPOINTS.tablet,
        orientation: width > height ? 'landscape' : 'portrait',
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
};

export const useAdaptiveSize = (): AdaptiveSizes => {
  const screenSize = useScreenSize();

  return {
    ...BASE_SIZES[
      screenSize.isMobile ? 'mobile' : 
      screenSize.isTablet ? 'tablet' : 
      'desktop'
    ]
  };
};

export const useResponsiveGrid = (itemMinWidth: number = 200) => {
  const screenSize = useScreenSize();
  
  const getColumns = (): number => {
    if (screenSize.isMobile) {
      return screenSize.orientation === 'portrait' ? 1 : 2;
    }
    
    if (screenSize.isTablet) {
      return screenSize.orientation === 'portrait' ? 2 : 3;
    }
    
    // Desktop
    return Math.floor(screenSize.width / itemMinWidth);
  };

  const getGap = (): number => {
    if (screenSize.isMobile) return 0.75;
    if (screenSize.isTablet) return 1;
    return 1.5;
  };

  return {
    columns: getColumns(),
    gap: getGap(),
    itemMinWidth,
    screenSize,
  };
};

// Utility function to get touch-friendly sizes
export const getTouchFriendlySize = (baseSize: number, screenSize: ScreenSize): number => {
  const minTouchSize = 44; // Minimum touch target size in pixels
  
  if (screenSize.isMobile || screenSize.isTablet) {
    return Math.max(baseSize, minTouchSize);
  }
  
  return baseSize;
};

// Utility function to get adaptive font size
export const getAdaptiveFontSize = (baseFontSize: number, screenSize: ScreenSize): string => {
  const multiplier = screenSize.isMobile ? 0.9 : screenSize.isTablet ? 1 : 1.1;
  return `${baseFontSize * multiplier}rem`;
};

// Utility function to get adaptive spacing
export const getAdaptiveSpacing = (baseSpacing: number, screenSize: ScreenSize): string => {
  const multiplier = screenSize.isMobile ? 0.75 : screenSize.isTablet ? 0.875 : 1;
  return `${baseSpacing * multiplier}rem`;
};