import React, { createContext, useContext, ReactNode } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { FamilyMember, DecorationElement } from '../types';

// Drag item types
export const ItemTypes = {
  FAMILY_MEMBER: 'family_member',
  DECORATION: 'decoration',
} as const;

// Drag item interfaces
export interface DraggedFamilyMember {
  type: typeof ItemTypes.FAMILY_MEMBER;
  member: FamilyMember;
  sourceLevel: number;
  sourceOrder: number;
}

export interface DraggedDecoration {
  type: typeof ItemTypes.DECORATION;
  decoration: DecorationElement;
  sourcePosition: { x: number; y: number; level: number };
}

export type DraggedItem = DraggedFamilyMember | DraggedDecoration;

// Drop result interfaces
export interface FamilyMemberDropResult {
  targetLevel: number;
  targetOrder: number;
  dropType: 'altar-level';
}

export interface DecorationDropResult {
  targetPosition: { x: number; y: number; level: number };
  dropType: 'free-form';
}

export type DropResult = FamilyMemberDropResult | DecorationDropResult;

// Context for drag and drop state management
interface DragDropContextValue {
  isDragging: boolean;
  draggedItem: DraggedItem | null;
  setDraggedItem: (item: DraggedItem | null) => void;
}

const DragDropContext = createContext<DragDropContextValue | null>(null);

// Hook to use drag and drop context
export const useDragDrop = (): DragDropContextValue => {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
};

// Detect if device supports touch
const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Get appropriate backend based on device capabilities
const getBackend = () => {
  return isTouchDevice() ? TouchBackend : HTML5Backend;
};

// Get backend options for touch devices
const getBackendOptions = () => {
  if (isTouchDevice()) {
    return {
      enableMouseEvents: true,
      enableTouchEvents: true,
      enableKeyboardEvents: true,
      delayTouchStart: 200, // Delay to distinguish between scroll and drag
      delayMouseStart: 0,
    };
  }
  return {};
};

interface DragDropProviderProps {
  children: ReactNode;
}

export const DragDropProvider: React.FC<DragDropProviderProps> = ({ children }) => {
  const [draggedItem, setDraggedItem] = React.useState<DraggedItem | null>(null);

  const contextValue: DragDropContextValue = {
    isDragging: draggedItem !== null,
    draggedItem,
    setDraggedItem,
  };

  return (
    <DndProvider backend={getBackend()} options={getBackendOptions()}>
      <DragDropContext.Provider value={contextValue}>
        {children}
      </DragDropContext.Provider>
    </DndProvider>
  );
};