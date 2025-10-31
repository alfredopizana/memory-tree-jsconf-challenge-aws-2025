import React, { useRef, useCallback, useEffect } from 'react';
import styles from './TouchGestureHandler.module.css';

export interface TouchGestureHandlerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchZoom?: (scale: number) => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  swipeThreshold?: number;
  longPressDelay?: number;
  className?: string;
  disabled?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export const TouchGestureHandler: React.FC<TouchGestureHandlerProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinchZoom,
  onDoubleTap,
  onLongPress,
  swipeThreshold = 50,
  longPressDelay = 500,
  className = '',
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<TouchPoint | null>(null);
  const lastTapRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialDistanceRef = useRef<number>(0);

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (disabled) return;

    const touch = event.touches[0];
    if (!touch) return;

    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    touchStartRef.current = touchPoint;

    // Handle multi-touch for pinch gestures
    if (event.touches.length === 2) {
      initialDistanceRef.current = getDistance(event.touches[0], event.touches[1]);
    }

    // Start long press timer
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        onLongPress();
        longPressTimerRef.current = null;
      }, longPressDelay);
    }

    // Handle double tap detection
    if (onDoubleTap && lastTapRef.current) {
      const timeDiff = touchPoint.timestamp - lastTapRef.current.timestamp;
      const distance = Math.sqrt(
        Math.pow(touchPoint.x - lastTapRef.current.x, 2) +
        Math.pow(touchPoint.y - lastTapRef.current.y, 2)
      );

      if (timeDiff < 300 && distance < 50) {
        onDoubleTap();
        lastTapRef.current = null;
        return;
      }
    }
  }, [disabled, onLongPress, onDoubleTap, longPressDelay, getDistance]);

  // Handle touch move
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (disabled) return;

    // Cancel long press on move
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Handle pinch zoom
    if (event.touches.length === 2 && onPinchZoom && initialDistanceRef.current > 0) {
      const currentDistance = getDistance(event.touches[0], event.touches[1]);
      const scale = currentDistance / initialDistanceRef.current;
      onPinchZoom(scale);
    }
  }, [disabled, onPinchZoom, getDistance]);

  // Handle touch end
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (disabled) return;

    // Cancel long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const touchStart = touchStartRef.current;
    if (!touchStart) return;

    // Get the last touch point from changedTouches
    const touch = event.changedTouches[0];
    if (!touch) return;

    const touchEnd: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    // Calculate swipe distance and direction
    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Check if it's a swipe gesture
    if (distance >= swipeThreshold) {
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
      
      // Determine swipe direction
      if (Math.abs(angle) <= 45) {
        // Right swipe
        onSwipeRight?.();
      } else if (Math.abs(angle) >= 135) {
        // Left swipe
        onSwipeLeft?.();
      } else if (angle > 45 && angle < 135) {
        // Down swipe
        onSwipeDown?.();
      } else if (angle < -45 && angle > -135) {
        // Up swipe
        onSwipeUp?.();
      }
    } else {
      // Store tap for double tap detection
      if (onDoubleTap) {
        lastTapRef.current = touchEnd;
      }
    }

    // Reset touch start
    touchStartRef.current = null;
    initialDistanceRef.current = 0;
  }, [disabled, swipeThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onDoubleTap]);

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const containerClasses = [
    styles.touchGestureHandler,
    disabled ? styles.disabled : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      ref={containerRef}
      className={containerClasses}
    >
      {children}
    </div>
  );
};