/**
 * Accessibility utilities for the Día de los Muertos Memory Tree application
 * Provides comprehensive accessibility support including ARIA labels, keyboard navigation,
 * and screen reader support with cultural context
 */

export interface AccessibilityConfig {
  announceChanges?: boolean;
  enableKeyboardNavigation?: boolean;
  enableScreenReaderSupport?: boolean;
  culturalContext?: boolean;
}

/**
 * Announces changes to screen readers with cultural context
 */
export class AccessibilityAnnouncer {
  private announcer: HTMLElement | null = null;
  private config: AccessibilityConfig;

  constructor(config: AccessibilityConfig = {}) {
    this.config = {
      announceChanges: true,
      enableScreenReaderSupport: true,
      culturalContext: true,
      ...config,
    };
    this.initializeAnnouncer();
  }

  private initializeAnnouncer() {
    if (!this.config.enableScreenReaderSupport) return;

    // Create live region for announcements
    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.setAttribute('class', 'sr-only');
    this.announcer.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    document.body.appendChild(this.announcer);
  }

  /**
   * Announce a message to screen readers with optional cultural context
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite', addCulturalContext = false) {
    if (!this.announcer || !this.config.announceChanges) return;

    let announcement = message;
    
    if (addCulturalContext && this.config.culturalContext) {
      announcement = `En el altar del Día de los Muertos: ${message}`;
    }

    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = announcement;
  }

  /**
   * Announce family member actions with cultural context
   */
  announceFamilyMemberAction(action: string, memberName: string, level?: number) {
    const levelNames = {
      1: 'Cielo - nivel de abuelos y ancestros',
      2: 'Tierra - nivel de padres y tíos', 
      3: 'Inframundo - nivel de generación actual'
    };

    let message = `${action} ${memberName}`;
    if (level && levelNames[level as keyof typeof levelNames]) {
      message += ` en ${levelNames[level as keyof typeof levelNames]}`;
    }

    this.announce(message, 'polite', true);
  }

  /**
   * Announce decoration actions with cultural significance
   */
  announceDecorationAction(action: string, decorationType: string, level?: number) {
    const decorationNames = {
      'cempasuchil': 'flor de cempasúchil (flor de muerto)',
      'papel-picado': 'papel picado decorativo',
      'salt-cross': 'cruz de sal protectora',
      'candle': 'vela para iluminar el camino',
      'offering': 'ofrenda de comida y bebida'
    };

    const culturalName = decorationNames[decorationType as keyof typeof decorationNames] || decorationType;
    let message = `${action} ${culturalName}`;
    
    if (level) {
      message += ` en el nivel ${level} del altar`;
    }

    this.announce(message, 'polite', true);
  }

  /**
   * Announce memory actions
   */
  announceMemoryAction(action: string, memoryTitle: string, memberNames?: string[]) {
    let message = `${action} memoria "${memoryTitle}"`;
    
    if (memberNames && memberNames.length > 0) {
      message += ` asociada con ${memberNames.join(', ')}`;
    }

    this.announce(message, 'polite', true);
  }

  destroy() {
    if (this.announcer && this.announcer.parentNode) {
      this.announcer.parentNode.removeChild(this.announcer);
    }
  }
}

/**
 * Keyboard navigation manager for altar interface
 */
export class KeyboardNavigationManager {
  private focusableElements: HTMLElement[] = [];
  private config: AccessibilityConfig;

  constructor(config: AccessibilityConfig = {}) {
    this.config = {
      enableKeyboardNavigation: true,
      ...config,
    };
  }

  /**
   * Initialize keyboard navigation for a container
   */
  initialize(container: HTMLElement) {
    if (!this.config.enableKeyboardNavigation) return;

    this.updateFocusableElements(container);
    this.setupKeyboardListeners(container);
  }

  /**
   * Update the list of focusable elements
   */
  updateFocusableElements(container: HTMLElement) {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="tab"]:not([disabled])',
      '[draggable="true"]'
    ].join(', ');

    this.focusableElements = Array.from(
      container.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];
  }

  /**
   * Setup keyboard event listeners
   */
  private setupKeyboardListeners(container: HTMLElement) {
    container.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyDown(event: KeyboardEvent) {
    const { key, ctrlKey, altKey } = event;

    switch (key) {
      case 'Tab':
        this.handleTabNavigation(event);
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        if (altKey) {
          this.handleArrowNavigation(event);
        }
        break;
      case 'Enter':
      case ' ':
        this.handleActivation(event);
        break;
      case 'Escape':
        this.handleEscape(event);
        break;
      case 'Home':
        if (ctrlKey) {
          this.focusFirst();
          event.preventDefault();
        }
        break;
      case 'End':
        if (ctrlKey) {
          this.focusLast();
          event.preventDefault();
        }
        break;
    }
  }

  /**
   * Handle tab navigation with proper focus management
   */
  private handleTabNavigation(event: KeyboardEvent) {
    if (this.focusableElements.length === 0) return;

    const activeElement = document.activeElement as HTMLElement;
    const currentIndex = this.focusableElements.indexOf(activeElement);

    if (event.shiftKey) {
      // Shift+Tab - move backwards
      const nextIndex = currentIndex <= 0 ? this.focusableElements.length - 1 : currentIndex - 1;
      this.focusableElements[nextIndex]?.focus();
    } else {
      // Tab - move forwards
      const nextIndex = currentIndex >= this.focusableElements.length - 1 ? 0 : currentIndex + 1;
      this.focusableElements[nextIndex]?.focus();
    }

    event.preventDefault();
  }

  /**
   * Handle arrow key navigation for spatial elements
   */
  private handleArrowNavigation(event: KeyboardEvent) {
    const activeElement = document.activeElement as HTMLElement;
    
    // Check if we're navigating within altar levels
    if (activeElement.closest('[data-altar-level]')) {
      this.handleAltarLevelNavigation(event, activeElement);
    }
  }

  /**
   * Handle navigation within altar levels
   */
  private handleAltarLevelNavigation(event: KeyboardEvent, activeElement: HTMLElement) {
    const currentLevel = activeElement.closest('[data-altar-level]');
    if (!currentLevel) return;

    const levelNumber = parseInt(currentLevel.getAttribute('data-altar-level') || '1');
    const { key } = event;

    switch (key) {
      case 'ArrowUp':
        // Move to level above
        if (levelNumber > 1) {
          this.focusAltarLevel(levelNumber - 1);
          event.preventDefault();
        }
        break;
      case 'ArrowDown':
        // Move to level below
        if (levelNumber < 3) {
          this.focusAltarLevel(levelNumber + 1);
          event.preventDefault();
        }
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        // Move within the same level
        this.navigateWithinLevel(currentLevel as HTMLElement, key === 'ArrowRight');
        event.preventDefault();
        break;
    }
  }

  /**
   * Focus a specific altar level
   */
  private focusAltarLevel(level: number) {
    const levelElement = document.querySelector(`[data-altar-level="${level}"]`);
    if (levelElement) {
      const firstFocusable = levelElement.querySelector(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"]), [draggable="true"]'
      ) as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }

  /**
   * Navigate within a level (left/right)
   */
  private navigateWithinLevel(levelElement: HTMLElement, forward: boolean) {
    const focusableInLevel = Array.from(
      levelElement.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"]), [draggable="true"]')
    ) as HTMLElement[];

    const activeElement = document.activeElement as HTMLElement;
    const currentIndex = focusableInLevel.indexOf(activeElement);

    if (currentIndex === -1) return;

    let nextIndex;
    if (forward) {
      nextIndex = currentIndex >= focusableInLevel.length - 1 ? 0 : currentIndex + 1;
    } else {
      nextIndex = currentIndex <= 0 ? focusableInLevel.length - 1 : currentIndex - 1;
    }

    if (focusableInLevel[nextIndex]) {
      focusableInLevel[nextIndex].focus();
    }
  }

  /**
   * Handle activation (Enter/Space)
   */
  private handleActivation(event: KeyboardEvent) {
    const activeElement = document.activeElement as HTMLElement;
    
    if (activeElement.tagName === 'BUTTON' || activeElement.getAttribute('role') === 'button') {
      activeElement.click();
      event.preventDefault();
    }
  }

  /**
   * Handle escape key
   */
  private handleEscape(event: KeyboardEvent) {
    // Close any open modals or panels
    const openModal = document.querySelector('[role="dialog"][aria-hidden="false"]');
    if (openModal) {
      const closeButton = openModal.querySelector('[aria-label*="Close"], [aria-label*="Cerrar"]') as HTMLElement;
      closeButton?.click();
      event.preventDefault();
    }
  }

  /**
   * Focus the first focusable element
   */
  focusFirst() {
    if (this.focusableElements.length > 0) {
      const firstElement = this.focusableElements[0];
      if (firstElement) {
        firstElement.focus();
      }
    }
  }

  /**
   * Focus the last focusable element
   */
  focusLast() {
    if (this.focusableElements.length > 0) {
      const lastElement = this.focusableElements[this.focusableElements.length - 1];
      if (lastElement) {
        lastElement.focus();
      }
    }
  }
}

/**
 * Drag and drop accessibility manager
 */
export class DragDropAccessibilityManager {
  private announcer: AccessibilityAnnouncer;

  constructor(announcer: AccessibilityAnnouncer) {
    this.announcer = announcer;
  }

  /**
   * Make drag and drop accessible via keyboard
   */
  makeDraggableAccessible(element: HTMLElement, options: {
    type: 'family-member' | 'decoration';
    name: string;
    onMove?: (direction: 'up' | 'down' | 'left' | 'right') => void;
    onActivate?: () => void;
  }) {
    // Add ARIA attributes
    element.setAttribute('role', 'button');
    element.setAttribute('aria-grabbed', 'false');
    element.setAttribute('tabindex', '0');
    
    const description = options.type === 'family-member' 
      ? `Tarjeta de ${options.name}. Presiona Enter para seleccionar, usa las flechas para mover entre niveles del altar.`
      : `Decoración ${options.name}. Presiona Enter para seleccionar, usa las flechas para mover por el altar.`;
    
    element.setAttribute('aria-description', description);

    // Add keyboard event listeners
    element.addEventListener('keydown', (event) => {
      this.handleDraggableKeyDown(event, options);
    });

    // Add focus/blur handlers
    element.addEventListener('focus', () => {
      this.announcer.announce(`Enfocado en ${options.name}`, 'polite');
    });
  }

  /**
   * Handle keyboard events for draggable elements
   */
  private handleDraggableKeyDown(event: KeyboardEvent, options: {
    type: 'family-member' | 'decoration';
    name: string;
    onMove?: (direction: 'up' | 'down' | 'left' | 'right') => void;
    onActivate?: () => void;
  }) {
    const { key, ctrlKey } = event;

    // Use Ctrl+Arrow keys for moving elements
    if (ctrlKey && options.onMove) {
      switch (key) {
        case 'ArrowUp':
          options.onMove('up');
          this.announcer.announce(`Moviendo ${options.name} hacia arriba`, 'assertive');
          event.preventDefault();
          break;
        case 'ArrowDown':
          options.onMove('down');
          this.announcer.announce(`Moviendo ${options.name} hacia abajo`, 'assertive');
          event.preventDefault();
          break;
        case 'ArrowLeft':
          options.onMove('left');
          this.announcer.announce(`Moviendo ${options.name} hacia la izquierda`, 'assertive');
          event.preventDefault();
          break;
        case 'ArrowRight':
          options.onMove('right');
          this.announcer.announce(`Moviendo ${options.name} hacia la derecha`, 'assertive');
          event.preventDefault();
          break;
      }
    }

    // Enter or Space to activate/select
    if ((key === 'Enter' || key === ' ') && options.onActivate) {
      options.onActivate();
      event.preventDefault();
    }
  }

  /**
   * Make drop zones accessible
   */
  makeDropZoneAccessible(element: HTMLElement, options: {
    level: number;
    levelName: string;
    acceptedTypes: string[];
  }) {
    element.setAttribute('role', 'region');
    element.setAttribute('aria-label', `Zona de colocación: ${options.levelName}`);
    element.setAttribute('aria-dropeffect', 'move');
    
    const description = `Nivel ${options.level} del altar tradicional. Acepta: ${options.acceptedTypes.join(', ')}`;
    element.setAttribute('aria-description', description);
  }

  /**
   * Announce drag start
   */
  announceDragStart(itemName: string, itemType: 'family-member' | 'decoration') {
    const typeText = itemType === 'family-member' ? 'miembro de familia' : 'decoración';
    this.announcer.announce(
      `Iniciando arrastre de ${typeText} ${itemName}. Usa Ctrl + flechas para mover o Escape para cancelar.`,
      'assertive'
    );
  }

  /**
   * Announce drop success
   */
  announceDropSuccess(itemName: string, targetName: string) {
    this.announcer.announce(
      `${itemName} colocado exitosamente en ${targetName}`,
      'assertive'
    );
  }

  /**
   * Announce drop failure
   */
  announceDropFailure(itemName: string, reason?: string) {
    const message = reason 
      ? `No se pudo colocar ${itemName}: ${reason}`
      : `No se pudo colocar ${itemName} en esta ubicación`;
    
    this.announcer.announce(message, 'assertive');
  }
}

/**
 * Generate culturally appropriate ARIA labels
 */
export const generateAriaLabels = {
  familyMember: (name: string, isDeceased: boolean, level?: number) => {
    const status = isDeceased ? 'difunto' : 'vivo';
    const levelText = level ? ` en nivel ${level} del altar` : '';
    return `${name}, ${status}${levelText}. Tarjeta de miembro de familia.`;
  },

  decoration: (type: string, level?: number) => {
    const decorationNames = {
      'cempasuchil': 'Flor de cempasúchil, flor tradicional del Día de los Muertos',
      'papel-picado': 'Papel picado, decoración de papel perforado tradicional',
      'salt-cross': 'Cruz de sal, elemento protector del altar',
      'candle': 'Vela, para iluminar el camino de los difuntos',
      'offering': 'Ofrenda, comida y bebida para los seres queridos'
    };

    const description = decorationNames[type as keyof typeof decorationNames] || `Decoración ${type}`;
    const levelText = level ? ` en nivel ${level} del altar` : '';
    return `${description}${levelText}`;
  },

  altarLevel: (level: number) => {
    const levelNames = {
      1: 'Cielo - Nivel superior del altar para abuelos y ancestros antiguos',
      2: 'Tierra - Nivel medio del altar para padres y tíos',
      3: 'Inframundo - Nivel inferior del altar para la generación actual y niños'
    };

    return levelNames[level as keyof typeof levelNames] || `Nivel ${level} del altar`;
  },

  memory: (title: string, associatedMembers: string[]) => {
    const membersText = associatedMembers.length > 0 
      ? ` asociada con ${associatedMembers.join(', ')}`
      : '';
    return `Memoria: ${title}${membersText}`;
  }
};

/**
 * Screen reader utilities
 */
export const screenReaderUtils = {
  /**
   * Hide decorative elements from screen readers
   */
  hideDecorative: (element: HTMLElement) => {
    element.setAttribute('aria-hidden', 'true');
  },

  /**
   * Mark element as presentation only
   */
  markAsPresentation: (element: HTMLElement) => {
    element.setAttribute('role', 'presentation');
  },

  /**
   * Add screen reader only text
   */
  addScreenReaderText: (element: HTMLElement, text: string) => {
    const srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = text;
    srText.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    element.appendChild(srText);
  }
};