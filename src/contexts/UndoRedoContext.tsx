import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppAction } from './AppStateContext';

// Command interface for undo/redo operations
export interface Command {
  id: string;
  type: string;
  description: string;
  execute: () => AppAction;
  undo: () => AppAction;
  timestamp: Date;
}

// Undo/Redo state interface
interface UndoRedoState {
  undoStack: Command[];
  redoStack: Command[];
  maxHistorySize: number;
  isUndoing: boolean;
  isRedoing: boolean;
}

// Undo/Redo actions
type UndoRedoAction =
  | { type: 'EXECUTE_COMMAND'; payload: Command }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'SET_MAX_HISTORY_SIZE'; payload: number }
  | { type: 'SET_UNDOING'; payload: boolean }
  | { type: 'SET_REDOING'; payload: boolean };

// Initial state
const initialState: UndoRedoState = {
  undoStack: [],
  redoStack: [],
  maxHistorySize: 50,
  isUndoing: false,
  isRedoing: false
};

// Reducer for undo/redo state
function undoRedoReducer(state: UndoRedoState, action: UndoRedoAction): UndoRedoState {
  switch (action.type) {
    case 'EXECUTE_COMMAND':
      // Add command to undo stack and clear redo stack
      const newUndoStack = [...state.undoStack, action.payload];
      
      // Limit history size
      const trimmedUndoStack = newUndoStack.length > state.maxHistorySize
        ? newUndoStack.slice(-state.maxHistorySize)
        : newUndoStack;

      return {
        ...state,
        undoStack: trimmedUndoStack,
        redoStack: [] // Clear redo stack when new command is executed
      };

    case 'UNDO':
      if (state.undoStack.length === 0) return state;

      const commandToUndo = state.undoStack[state.undoStack.length - 1];
      if (!commandToUndo) return state;

      return {
        ...state,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, commandToUndo],
        isUndoing: true
      };

    case 'REDO':
      if (state.redoStack.length === 0) return state;

      const commandToRedo = state.redoStack[state.redoStack.length - 1];
      if (!commandToRedo) return state;

      return {
        ...state,
        undoStack: [...state.undoStack, commandToRedo],
        redoStack: state.redoStack.slice(0, -1),
        isRedoing: true
      };

    case 'CLEAR_HISTORY':
      return {
        ...state,
        undoStack: [],
        redoStack: []
      };

    case 'SET_MAX_HISTORY_SIZE':
      const newMaxSize = Math.max(1, action.payload);
      const trimmedStack = state.undoStack.length > newMaxSize
        ? state.undoStack.slice(-newMaxSize)
        : state.undoStack;

      return {
        ...state,
        maxHistorySize: newMaxSize,
        undoStack: trimmedStack
      };

    case 'SET_UNDOING':
      return {
        ...state,
        isUndoing: action.payload
      };

    case 'SET_REDOING':
      return {
        ...state,
        isRedoing: action.payload
      };

    default:
      return state;
  }
}

// Context interface
interface UndoRedoContextValue {
  state: UndoRedoState;
  dispatch: React.Dispatch<UndoRedoAction>;
  
  // Command execution
  executeCommand: (command: Command) => void;
  
  // Undo/Redo operations
  undo: () => Command | null;
  redo: () => Command | null;
  
  // History management
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  getUndoDescription: () => string | null;
  getRedoDescription: () => string | null;
  
  // Settings
  setMaxHistorySize: (size: number) => void;
  
  // Status
  isUndoing: () => boolean;
  isRedoing: () => boolean;
  setUndoingStatus: (status: boolean) => void;
  setRedoingStatus: (status: boolean) => void;
}

// Create context
const UndoRedoContext = createContext<UndoRedoContextValue | null>(null);

// Hook to use undo/redo context
export const useUndoRedo = (): UndoRedoContextValue => {
  const context = useContext(UndoRedoContext);
  if (!context) {
    throw new Error('useUndoRedo must be used within an UndoRedoProvider');
  }
  return context;
};

// Provider component
interface UndoRedoProviderProps {
  children: ReactNode;
}

export const UndoRedoProvider: React.FC<UndoRedoProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(undoRedoReducer, initialState);

  // Execute a command and add it to history
  const executeCommand = (command: Command) => {
    dispatch({ type: 'EXECUTE_COMMAND', payload: command });
  };

  // Undo the last command
  const undo = (): Command | null => {
    if (state.undoStack.length === 0) return null;

    const command = state.undoStack[state.undoStack.length - 1];
    if (!command) return null;

    dispatch({ type: 'UNDO' });
    return command;
  };

  // Redo the last undone command
  const redo = (): Command | null => {
    if (state.redoStack.length === 0) return null;

    const command = state.redoStack[state.redoStack.length - 1];
    if (!command) return null;

    dispatch({ type: 'REDO' });
    return command;
  };

  // Check if undo is available
  const canUndo = (): boolean => {
    return state.undoStack.length > 0;
  };

  // Check if redo is available
  const canRedo = (): boolean => {
    return state.redoStack.length > 0;
  };

  // Clear all history
  const clearHistory = () => {
    dispatch({ type: 'CLEAR_HISTORY' });
  };

  // Get description of next undo operation
  const getUndoDescription = (): string | null => {
    if (state.undoStack.length === 0) return null;
    const command = state.undoStack[state.undoStack.length - 1];
    return command ? command.description : null;
  };

  // Get description of next redo operation
  const getRedoDescription = (): string | null => {
    if (state.redoStack.length === 0) return null;
    const command = state.redoStack[state.redoStack.length - 1];
    return command ? command.description : null;
  };

  // Set maximum history size
  const setMaxHistorySize = (size: number) => {
    dispatch({ type: 'SET_MAX_HISTORY_SIZE', payload: size });
  };

  // Check if currently undoing
  const isUndoing = (): boolean => {
    return state.isUndoing;
  };

  // Check if currently redoing
  const isRedoing = (): boolean => {
    return state.isRedoing;
  };

  // Set undoing status
  const setUndoingStatus = (status: boolean) => {
    dispatch({ type: 'SET_UNDOING', payload: status });
  };

  // Set redoing status
  const setRedoingStatus = (status: boolean) => {
    dispatch({ type: 'SET_REDOING', payload: status });
  };

  const contextValue: UndoRedoContextValue = {
    state,
    dispatch,
    executeCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    getUndoDescription,
    getRedoDescription,
    setMaxHistorySize,
    isUndoing,
    isRedoing,
    setUndoingStatus,
    setRedoingStatus
  };

  return (
    <UndoRedoContext.Provider value={contextValue}>
      {children}
    </UndoRedoContext.Provider>
  );
};

// Command factory functions for common operations
export const CommandFactory = {
  // Family member commands
  createAddFamilyMemberCommand: (member: any): Command => ({
    id: `add-member-${Date.now()}`,
    type: 'ADD_FAMILY_MEMBER',
    description: `Agregar ${member.name}`,
    execute: () => ({ type: 'ADD_FAMILY_MEMBER', payload: member }),
    undo: () => ({ type: 'DELETE_FAMILY_MEMBER', payload: member.id }),
    timestamp: new Date()
  }),

  createUpdateFamilyMemberCommand: (id: string, updates: any, previousData: any): Command => ({
    id: `update-member-${id}-${Date.now()}`,
    type: 'UPDATE_FAMILY_MEMBER',
    description: `Editar ${previousData.name || 'miembro de familia'}`,
    execute: () => ({ type: 'UPDATE_FAMILY_MEMBER', payload: { id, updates } }),
    undo: () => ({ type: 'UPDATE_FAMILY_MEMBER', payload: { id, updates: previousData } }),
    timestamp: new Date()
  }),

  createDeleteFamilyMemberCommand: (member: any): Command => ({
    id: `delete-member-${member.id}-${Date.now()}`,
    type: 'DELETE_FAMILY_MEMBER',
    description: `Eliminar ${member.name}`,
    execute: () => ({ type: 'DELETE_FAMILY_MEMBER', payload: member.id }),
    undo: () => ({ type: 'ADD_FAMILY_MEMBER', payload: member }),
    timestamp: new Date()
  }),

  // Memory commands
  createAddMemoryCommand: (memory: any): Command => ({
    id: `add-memory-${Date.now()}`,
    type: 'ADD_MEMORY',
    description: `Agregar memoria "${memory.title}"`,
    execute: () => ({ type: 'ADD_MEMORY', payload: memory }),
    undo: () => ({ type: 'DELETE_MEMORY', payload: memory.id }),
    timestamp: new Date()
  }),

  createUpdateMemoryCommand: (id: string, updates: any, previousData: any): Command => ({
    id: `update-memory-${id}-${Date.now()}`,
    type: 'UPDATE_MEMORY',
    description: `Editar memoria "${previousData.title || 'sin título'}"`,
    execute: () => ({ type: 'UPDATE_MEMORY', payload: { id, updates } }),
    undo: () => ({ type: 'UPDATE_MEMORY', payload: { id, updates: previousData } }),
    timestamp: new Date()
  }),

  createDeleteMemoryCommand: (memory: any): Command => ({
    id: `delete-memory-${memory.id}-${Date.now()}`,
    type: 'DELETE_MEMORY',
    description: `Eliminar memoria "${memory.title}"`,
    execute: () => ({ type: 'DELETE_MEMORY', payload: memory.id }),
    undo: () => ({ type: 'ADD_MEMORY', payload: memory }),
    timestamp: new Date()
  }),

  // Decoration commands
  createAddDecorationCommand: (decoration: any): Command => ({
    id: `add-decoration-${Date.now()}`,
    type: 'ADD_DECORATION',
    description: `Agregar ${decoration.type}`,
    execute: () => ({ type: 'ADD_DECORATION', payload: decoration }),
    undo: () => ({ type: 'DELETE_DECORATION', payload: decoration.id }),
    timestamp: new Date()
  }),

  createUpdateDecorationCommand: (id: string, updates: any, previousData: any): Command => ({
    id: `update-decoration-${id}-${Date.now()}`,
    type: 'UPDATE_DECORATION',
    description: `Mover ${previousData.type}`,
    execute: () => ({ type: 'UPDATE_DECORATION', payload: { id, updates } }),
    undo: () => ({ type: 'UPDATE_DECORATION', payload: { id, updates: previousData } }),
    timestamp: new Date()
  }),

  createDeleteDecorationCommand: (decoration: any): Command => ({
    id: `delete-decoration-${decoration.id}-${Date.now()}`,
    type: 'DELETE_DECORATION',
    description: `Eliminar ${decoration.type}`,
    execute: () => ({ type: 'DELETE_DECORATION', payload: decoration.id }),
    undo: () => ({ type: 'ADD_DECORATION', payload: decoration }),
    timestamp: new Date()
  }),

  // Altar state commands
  createUpdateAltarStateCommand: (updates: any, previousData: any): Command => ({
    id: `update-altar-${Date.now()}`,
    type: 'SET_ALTAR_STATE',
    description: 'Cambiar configuración del altar',
    execute: () => ({ type: 'SET_ALTAR_STATE', payload: updates }),
    undo: () => ({ type: 'SET_ALTAR_STATE', payload: previousData }),
    timestamp: new Date()
  })
};