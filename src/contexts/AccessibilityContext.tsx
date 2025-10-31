import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { 
  AccessibilityAnnouncer, 
  KeyboardNavigationManager, 
  DragDropAccessibilityManager,
  AccessibilityConfig 
} from '../utils/accessibility';

interface AccessibilityContextType {
  announcer: AccessibilityAnnouncer;
  keyboardManager: KeyboardNavigationManager;
  dragDropManager: DragDropAccessibilityManager;
  config: AccessibilityConfig;
  isScreenReaderActive: boolean;
  isKeyboardUser: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

interface AccessibilityProviderProps {
  children: ReactNode;
  config?: Partial<AccessibilityConfig>;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({
  children,
  config: userConfig = {}
}) => {
  const announcerRef = useRef<AccessibilityAnnouncer | null>(null);
  const keyboardManagerRef = useRef<KeyboardNavigationManager | null>(null);
  const dragDropManagerRef = useRef<DragDropAccessibilityManager | null>(null);
  const [isScreenReaderActive, setIsScreenReaderActive] = React.useState(false);
  const [isKeyboardUser, setIsKeyboardUser] = React.useState(false);

  const config: AccessibilityConfig = {
    announceChanges: true,
    enableKeyboardNavigation: true,
    enableScreenReaderSupport: true,
    culturalContext: true,
    ...userConfig,
  };

  useEffect(() => {
    // Initialize accessibility managers
    announcerRef.current = new AccessibilityAnnouncer(config);
    keyboardManagerRef.current = new KeyboardNavigationManager(config);
    dragDropManagerRef.current = new DragDropAccessibilityManager(announcerRef.current);

    // Detect screen reader usage
    const detectScreenReader = () => {
      // Check for common screen reader indicators
      const hasScreenReader = !!(
        window.navigator.userAgent.match(/NVDA|JAWS|VoiceOver|TalkBack|Dragon/i) ||
        window.speechSynthesis ||
        document.querySelector('[aria-live]')
      );
      setIsScreenReaderActive(hasScreenReader);
    };

    // Detect keyboard usage
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setIsKeyboardUser(true);
        document.removeEventListener('keydown', handleKeyDown);
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
      document.addEventListener('keydown', handleKeyDown);
    };

    detectScreenReader();
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    // Initialize keyboard navigation for the entire app
    if (keyboardManagerRef.current) {
      keyboardManagerRef.current.initialize(document.body);
    }

    // Add global accessibility styles
    const style = document.createElement('style');
    style.textContent = `
      /* Screen reader only class */
      .sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }

      /* Focus indicators */
      *:focus {
        outline: 2px solid var(--color-primary, #FF6B35) !important;
        outline-offset: 2px !important;
      }

      /* High contrast focus for keyboard users */
      body.keyboard-user *:focus {
        outline: 3px solid var(--color-primary, #FF6B35) !important;
        outline-offset: 3px !important;
        box-shadow: 0 0 0 1px var(--color-background, #2C3E50) !important;
      }

      /* Skip link */
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: var(--color-primary, #FF6B35);
        color: var(--color-background, #2C3E50);
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 10000;
        font-weight: bold;
      }

      .skip-link:focus {
        top: 6px;
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      }

      /* High contrast mode support */
      @media (prefers-contrast: high) {
        * {
          border-color: currentColor !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Add keyboard user class to body
    if (isKeyboardUser) {
      document.body.classList.add('keyboard-user');
    } else {
      document.body.classList.remove('keyboard-user');
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      
      if (announcerRef.current) {
        announcerRef.current.destroy();
      }
      
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, [config, isKeyboardUser]);

  // Update body class when keyboard user state changes
  useEffect(() => {
    if (isKeyboardUser) {
      document.body.classList.add('keyboard-user');
    } else {
      document.body.classList.remove('keyboard-user');
    }
  }, [isKeyboardUser]);

  const contextValue: AccessibilityContextType = {
    announcer: announcerRef.current!,
    keyboardManager: keyboardManagerRef.current!,
    dragDropManager: dragDropManagerRef.current!,
    config,
    isScreenReaderActive,
    isKeyboardUser,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {/* Skip link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

/**
 * Hook for announcing changes to screen readers
 */
export const useAnnouncer = () => {
  const { announcer } = useAccessibility();
  
  return {
    announce: announcer.announce.bind(announcer),
    announceFamilyMemberAction: announcer.announceFamilyMemberAction.bind(announcer),
    announceDecorationAction: announcer.announceDecorationAction.bind(announcer),
    announceMemoryAction: announcer.announceMemoryAction.bind(announcer),
  };
};

/**
 * Hook for keyboard navigation
 */
export const useKeyboardNavigation = () => {
  const { keyboardManager } = useAccessibility();
  
  return {
    initialize: keyboardManager.initialize.bind(keyboardManager),
    updateFocusableElements: keyboardManager.updateFocusableElements.bind(keyboardManager),
    focusFirst: keyboardManager.focusFirst.bind(keyboardManager),
    focusLast: keyboardManager.focusLast.bind(keyboardManager),
  };
};

/**
 * Hook for drag and drop accessibility
 */
export const useDragDropAccessibility = () => {
  const { dragDropManager } = useAccessibility();
  
  return {
    makeDraggableAccessible: dragDropManager.makeDraggableAccessible.bind(dragDropManager),
    makeDropZoneAccessible: dragDropManager.makeDropZoneAccessible.bind(dragDropManager),
    announceDragStart: dragDropManager.announceDragStart.bind(dragDropManager),
    announceDropSuccess: dragDropManager.announceDropSuccess.bind(dragDropManager),
    announceDropFailure: dragDropManager.announceDropFailure.bind(dragDropManager),
  };
};