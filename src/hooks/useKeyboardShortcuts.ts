import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  target?: HTMLElement | Document;
}

export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) => {
  const { enabled = true, target = document } = options;
  const shortcutsRef = useRef<KeyboardShortcut[]>(shortcuts);

  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: Event) => {
    if (!enabled) return;
    
    const keyboardEvent = event as KeyboardEvent;

    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === keyboardEvent.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrlKey === keyboardEvent.ctrlKey;
      const altMatch = !!shortcut.altKey === keyboardEvent.altKey;
      const shiftMatch = !!shortcut.shiftKey === keyboardEvent.shiftKey;
      const metaMatch = !!shortcut.metaKey === keyboardEvent.metaKey;

      return keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch;
    });

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        keyboardEvent.preventDefault();
      }
      matchingShortcut.action();
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const targetElement = target instanceof HTMLElement ? target : document;
    targetElement.addEventListener('keydown', handleKeyDown);

    return () => {
      targetElement.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled, target]);

  return {
    shortcuts: shortcutsRef.current,
  };
};

// Predefined common shortcuts
export const createCommonShortcuts = (actions: {
  save?: () => void;
  undo?: () => void;
  redo?: () => void;
  copy?: () => void;
  paste?: () => void;
  delete?: () => void;
  selectAll?: () => void;
  find?: () => void;
  newItem?: () => void;
  help?: () => void;
}): KeyboardShortcut[] => {
  const shortcuts: KeyboardShortcut[] = [];

  if (actions.save) {
    shortcuts.push({
      key: 's',
      ctrlKey: true,
      action: actions.save,
      description: 'Guardar altar',
    });
  }

  if (actions.undo) {
    shortcuts.push({
      key: 'z',
      ctrlKey: true,
      action: actions.undo,
      description: 'Deshacer',
    });
  }

  if (actions.redo) {
    shortcuts.push({
      key: 'y',
      ctrlKey: true,
      action: actions.redo,
      description: 'Rehacer',
    });
  }

  if (actions.copy) {
    shortcuts.push({
      key: 'c',
      ctrlKey: true,
      action: actions.copy,
      description: 'Copiar',
    });
  }

  if (actions.paste) {
    shortcuts.push({
      key: 'v',
      ctrlKey: true,
      action: actions.paste,
      description: 'Pegar',
    });
  }

  if (actions.delete) {
    shortcuts.push({
      key: 'Delete',
      action: actions.delete,
      description: 'Eliminar elemento seleccionado',
    });
  }

  if (actions.selectAll) {
    shortcuts.push({
      key: 'a',
      ctrlKey: true,
      action: actions.selectAll,
      description: 'Seleccionar todo',
    });
  }

  if (actions.find) {
    shortcuts.push({
      key: 'f',
      ctrlKey: true,
      action: actions.find,
      description: 'Buscar',
    });
  }

  if (actions.newItem) {
    shortcuts.push({
      key: 'n',
      ctrlKey: true,
      action: actions.newItem,
      description: 'Nuevo miembro de familia',
    });
  }

  if (actions.help) {
    shortcuts.push({
      key: 'F1',
      action: actions.help,
      description: 'Mostrar ayuda',
    });
  }

  return shortcuts;
};

// Altar-specific shortcuts
export const createAltarShortcuts = (actions: {
  toggleDecorations?: () => void;
  toggleMemories?: () => void;
  focusLevel1?: () => void;
  focusLevel2?: () => void;
  focusLevel3?: () => void;
  addDecoration?: () => void;
  clearDecorations?: () => void;
}): KeyboardShortcut[] => {
  const shortcuts: KeyboardShortcut[] = [];

  if (actions.toggleDecorations) {
    shortcuts.push({
      key: 'd',
      altKey: true,
      action: actions.toggleDecorations,
      description: 'Alternar panel de decoraciones',
    });
  }

  if (actions.toggleMemories) {
    shortcuts.push({
      key: 'm',
      altKey: true,
      action: actions.toggleMemories,
      description: 'Alternar panel de memorias',
    });
  }

  if (actions.focusLevel1) {
    shortcuts.push({
      key: '1',
      altKey: true,
      action: actions.focusLevel1,
      description: 'Enfocar nivel 1 (Cielo)',
    });
  }

  if (actions.focusLevel2) {
    shortcuts.push({
      key: '2',
      altKey: true,
      action: actions.focusLevel2,
      description: 'Enfocar nivel 2 (Tierra)',
    });
  }

  if (actions.focusLevel3) {
    shortcuts.push({
      key: '3',
      altKey: true,
      action: actions.focusLevel3,
      description: 'Enfocar nivel 3 (Inframundo)',
    });
  }

  if (actions.addDecoration) {
    shortcuts.push({
      key: 'Insert',
      action: actions.addDecoration,
      description: 'Añadir decoración',
    });
  }

  if (actions.clearDecorations) {
    shortcuts.push({
      key: 'Delete',
      shiftKey: true,
      action: actions.clearDecorations,
      description: 'Limpiar todas las decoraciones',
    });
  }

  return shortcuts;
};