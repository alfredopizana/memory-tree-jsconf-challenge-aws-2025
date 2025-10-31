import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { FamilyMember, Memory, DecorationElement, AltarState } from '../types';
import { FamilyTreeManager } from '../services/FamilyTreeManager';
import { MemoryManager } from '../services/MemoryManager';
import { AltarLayoutManager } from '../services/AltarLayoutManager';

// Action types for state management
export type AppAction =
  | { type: 'SET_FAMILY_MEMBERS'; payload: FamilyMember[] }
  | { type: 'ADD_FAMILY_MEMBER'; payload: FamilyMember }
  | { type: 'UPDATE_FAMILY_MEMBER'; payload: { id: string; updates: Partial<FamilyMember> } }
  | { type: 'DELETE_FAMILY_MEMBER'; payload: string }
  | { type: 'SET_MEMORIES'; payload: Memory[] }
  | { type: 'ADD_MEMORY'; payload: Memory }
  | { type: 'UPDATE_MEMORY'; payload: { id: string; updates: Partial<Memory> } }
  | { type: 'DELETE_MEMORY'; payload: string }
  | { type: 'SET_DECORATIONS'; payload: DecorationElement[] }
  | { type: 'ADD_DECORATION'; payload: DecorationElement }
  | { type: 'UPDATE_DECORATION'; payload: { id: string; updates: Partial<DecorationElement> } }
  | { type: 'DELETE_DECORATION'; payload: string }
  | { type: 'SET_ALTAR_STATE'; payload: Partial<AltarState> }
  | { type: 'SET_LOADING'; payload: { key: string; loading: boolean } }
  | { type: 'SET_ERROR'; payload: { key: string; error: string | null } }
  | { type: 'HYDRATE_STATE'; payload: AppState };

// Application state interface
export interface AppState {
  familyMembers: FamilyMember[];
  memories: Memory[];
  decorations: DecorationElement[];
  altarState: AltarState;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  isHydrated: boolean;
}

// Initial state
const initialState: AppState = {
  familyMembers: [],
  memories: [],
  decorations: [],
  altarState: {
    id: 'default',
    name: 'Mi Altar Familiar',
    memberPositions: {},
    decorations: [],
    backgroundTheme: 'traditional',
    lastModified: new Date()
  },
  loading: {},
  errors: {},
  isHydrated: false
};

// State reducer
function appStateReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_FAMILY_MEMBERS':
      return {
        ...state,
        familyMembers: action.payload,
        altarState: {
          ...state.altarState,
          memberPositions: action.payload.reduce((acc, member) => {
            acc[member.id] = member.altarPosition;
            return acc;
          }, {} as Record<string, { level: number; order: number }>)
        }
      };

    case 'ADD_FAMILY_MEMBER':
      return {
        ...state,
        familyMembers: [...state.familyMembers, action.payload],
        altarState: {
          ...state.altarState,
          memberPositions: {
            ...state.altarState.memberPositions,
            [action.payload.id]: action.payload.altarPosition
          },
          lastModified: new Date()
        }
      };

    case 'UPDATE_FAMILY_MEMBER':
      return {
        ...state,
        familyMembers: state.familyMembers.map(member =>
          member.id === action.payload.id
            ? { ...member, ...action.payload.updates, updatedAt: new Date() }
            : member
        ),
        altarState: {
          ...state.altarState,
          memberPositions: action.payload.updates.altarPosition
            ? {
                ...state.altarState.memberPositions,
                [action.payload.id]: action.payload.updates.altarPosition
              }
            : state.altarState.memberPositions,
          lastModified: new Date()
        }
      };

    case 'DELETE_FAMILY_MEMBER':
      const { [action.payload]: deletedPosition, ...remainingPositions } = state.altarState.memberPositions;
      return {
        ...state,
        familyMembers: state.familyMembers.filter(member => member.id !== action.payload),
        memories: state.memories.map(memory => ({
          ...memory,
          associatedMemberIds: memory.associatedMemberIds.filter(id => id !== action.payload)
        })),
        altarState: {
          ...state.altarState,
          memberPositions: remainingPositions,
          lastModified: new Date()
        }
      };

    case 'SET_MEMORIES':
      return {
        ...state,
        memories: action.payload
      };

    case 'ADD_MEMORY':
      return {
        ...state,
        memories: [...state.memories, action.payload]
      };

    case 'UPDATE_MEMORY':
      return {
        ...state,
        memories: state.memories.map(memory =>
          memory.id === action.payload.id
            ? { ...memory, ...action.payload.updates, updatedAt: new Date() }
            : memory
        )
      };

    case 'DELETE_MEMORY':
      return {
        ...state,
        memories: state.memories.filter(memory => memory.id !== action.payload)
      };

    case 'SET_DECORATIONS':
      return {
        ...state,
        decorations: action.payload,
        altarState: {
          ...state.altarState,
          decorations: action.payload
        }
      };

    case 'ADD_DECORATION':
      return {
        ...state,
        decorations: [...state.decorations, action.payload],
        altarState: {
          ...state.altarState,
          decorations: [...state.altarState.decorations, action.payload],
          lastModified: new Date()
        }
      };

    case 'UPDATE_DECORATION':
      const updatedDecorations = state.decorations.map(decoration =>
        decoration.id === action.payload.id
          ? { ...decoration, ...action.payload.updates }
          : decoration
      );
      return {
        ...state,
        decorations: updatedDecorations,
        altarState: {
          ...state.altarState,
          decorations: updatedDecorations,
          lastModified: new Date()
        }
      };

    case 'DELETE_DECORATION':
      const filteredDecorations = state.decorations.filter(decoration => decoration.id !== action.payload);
      return {
        ...state,
        decorations: filteredDecorations,
        altarState: {
          ...state.altarState,
          decorations: filteredDecorations,
          lastModified: new Date()
        }
      };

    case 'SET_ALTAR_STATE':
      return {
        ...state,
        altarState: {
          ...state.altarState,
          ...action.payload,
          lastModified: new Date()
        }
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.loading
        }
      };

    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.key]: action.payload.error
        }
      };

    case 'HYDRATE_STATE':
      return {
        ...action.payload,
        isHydrated: true
      };

    default:
      return state;
  }
}

// Context interface
interface AppStateContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Family member actions
  addFamilyMember: (memberData: Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateFamilyMember: (id: string, updates: Partial<FamilyMember>) => Promise<void>;
  deleteFamilyMember: (id: string) => Promise<void>;
  moveFamilyMember: (id: string, newLevel: number, newOrder: number) => Promise<void>;
  
  // Memory actions
  addMemory: (memoryData: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateMemory: (id: string, updates: Partial<Memory>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  
  // Decoration actions
  addDecoration: (decoration: Omit<DecorationElement, 'id'>) => Promise<void>;
  updateDecoration: (id: string, updates: Partial<DecorationElement>) => Promise<void>;
  deleteDecoration: (id: string) => Promise<void>;
  
  // Altar state actions
  updateAltarTheme: (theme: AltarState['backgroundTheme']) => Promise<void>;
  saveAltarState: () => Promise<void>;
  
  // Utility functions
  isLoading: (key: string) => boolean;
  getError: (key: string) => string | null;
  clearError: (key: string) => void;
}

// Create context
const AppStateContext = createContext<AppStateContextValue | null>(null);

// Hook to use app state context
export const useAppState = (): AppStateContextValue => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

// Service instances
let familyTreeManager: FamilyTreeManager;
let memoryManager: MemoryManager;
let altarLayoutManager: AltarLayoutManager;

// Initialize services
const initializeServices = () => {
  if (!familyTreeManager) {
    familyTreeManager = new FamilyTreeManager();
  }
  if (!memoryManager) {
    memoryManager = new MemoryManager();
  }
  if (!altarLayoutManager) {
    altarLayoutManager = new AltarLayoutManager();
  }
};

// Provider component
interface AppStateProviderProps {
  children: ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  // Initialize services on mount
  useEffect(() => {
    initializeServices();
  }, []);

  // Hydrate state from storage on mount
  useEffect(() => {
    const hydrateState = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: { key: 'hydration', loading: true } });

        // Load family members
        const familyMembers = await familyTreeManager.getAllFamilyMembers();
        
        // Load memories
        const { memories } = await memoryManager.getAllMemoriesWithMembers();
        
        // Load altar state (decorations will be included)
        const altarState = await altarLayoutManager.getCurrentAltarState();
        
        // Hydrate the state
        dispatch({
          type: 'HYDRATE_STATE',
          payload: {
            ...initialState,
            familyMembers,
            memories,
            decorations: altarState?.decorations || [],
            altarState: altarState || initialState.altarState,
            isHydrated: true
          }
        });

        dispatch({ type: 'SET_LOADING', payload: { key: 'hydration', loading: false } });
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: {
            key: 'hydration',
            error: error instanceof Error ? error.message : 'Failed to load application data'
          }
        });
        dispatch({ type: 'SET_LOADING', payload: { key: 'hydration', loading: false } });
      }
    };

    hydrateState();
  }, []);

  // Auto-save state changes
  useEffect(() => {
    if (!state.isHydrated) return;

    const saveState = async () => {
      try {
        await altarLayoutManager.saveAltarState(state.altarState);
      } catch (error) {
        console.error('Failed to auto-save state:', error);
      }
    };

    // Debounce auto-save
    const timeoutId = setTimeout(saveState, 1000);
    return () => clearTimeout(timeoutId);
  }, [state.altarState, state.isHydrated]);

  // Family member actions
  const addFamilyMember = async (memberData: Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { key: 'addMember', loading: true } });
      
const createMemberData: {
        name: string;
        preferredName?: string;
        dateOfBirth: Date;
        dateOfDeath?: Date;
        generation?: number;
        altarLevel?: number;
      } = {
        name: memberData.name,
        dateOfBirth: memberData.dateOfBirth,
        altarLevel: memberData.altarPosition.level
      };

      if (memberData.preferredName) {
        createMemberData.preferredName = memberData.preferredName;
      }
      if (memberData.dateOfDeath) {
        createMemberData.dateOfDeath = memberData.dateOfDeath;
      }
      if (memberData.generation !== undefined) {
        createMemberData.generation = memberData.generation;
      }

      const result = await familyTreeManager.createFamilyMember(createMemberData);

      if (result.success && result.memberId) {
        const newMember: FamilyMember = {
          ...memberData,
          id: result.memberId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        dispatch({ type: 'ADD_FAMILY_MEMBER', payload: newMember });
      } else {
        throw new Error(result.errors?.join(', ') || 'Failed to create family member');
      }

      dispatch({ type: 'SET_LOADING', payload: { key: 'addMember', loading: false } });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          key: 'addMember',
          error: error instanceof Error ? error.message : 'Failed to add family member'
        }
      });
      dispatch({ type: 'SET_LOADING', payload: { key: 'addMember', loading: false } });
    }
  };

  const updateFamilyMember = async (id: string, updates: Partial<FamilyMember>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { key: 'updateMember', loading: true } });
      
      const result = await familyTreeManager.updateFamilyMember(id, updates);
      
      if (result.success) {
        dispatch({ type: 'UPDATE_FAMILY_MEMBER', payload: { id, updates } });
      } else {
        throw new Error(result.errors?.join(', ') || 'Failed to update family member');
      }

      dispatch({ type: 'SET_LOADING', payload: { key: 'updateMember', loading: false } });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          key: 'updateMember',
          error: error instanceof Error ? error.message : 'Failed to update family member'
        }
      });
      dispatch({ type: 'SET_LOADING', payload: { key: 'updateMember', loading: false } });
    }
  };

  const deleteFamilyMember = async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { key: 'deleteMember', loading: true } });
      
      const result = await familyTreeManager.deleteFamilyMember(id);
      
      if (result.success) {
        dispatch({ type: 'DELETE_FAMILY_MEMBER', payload: id });
      } else {
        throw new Error(result.errors?.join(', ') || 'Failed to delete family member');
      }

      dispatch({ type: 'SET_LOADING', payload: { key: 'deleteMember', loading: false } });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          key: 'deleteMember',
          error: error instanceof Error ? error.message : 'Failed to delete family member'
        }
      });
      dispatch({ type: 'SET_LOADING', payload: { key: 'deleteMember', loading: false } });
    }
  };

  const moveFamilyMember = async (id: string, newLevel: number, newOrder: number) => {
    try {
      const result = await familyTreeManager.moveFamilyMemberToLevel(id, newLevel);
      
      if (result.success) {
        dispatch({
          type: 'UPDATE_FAMILY_MEMBER',
          payload: {
            id,
            updates: { altarPosition: { level: newLevel, order: newOrder } }
          }
        });
      } else {
        throw new Error(result.errors?.join(', ') || 'Failed to move family member');
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          key: 'moveMember',
          error: error instanceof Error ? error.message : 'Failed to move family member'
        }
      });
    }
  };

  // Memory actions
  const addMemory = async (memoryData: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { key: 'addMemory', loading: true } });
      
      const result = await memoryManager.createMemory({
        title: memoryData.title,
        content: memoryData.content,
        associatedMemberIds: memoryData.associatedMemberIds
      });

      if (result.success && result.memoryId) {
        const newMemory: Memory = {
          ...memoryData,
          id: result.memoryId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        dispatch({ type: 'ADD_MEMORY', payload: newMemory });
      } else {
        throw new Error(result.errors?.join(', ') || 'Failed to create memory');
      }

      dispatch({ type: 'SET_LOADING', payload: { key: 'addMemory', loading: false } });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          key: 'addMemory',
          error: error instanceof Error ? error.message : 'Failed to add memory'
        }
      });
      dispatch({ type: 'SET_LOADING', payload: { key: 'addMemory', loading: false } });
    }
  };

  const updateMemory = async (id: string, updates: Partial<Memory>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { key: 'updateMemory', loading: true } });
      
      const result = await memoryManager.updateMemory(id, updates);
      
      if (result.success) {
        dispatch({ type: 'UPDATE_MEMORY', payload: { id, updates } });
      } else {
        throw new Error(result.errors?.join(', ') || 'Failed to update memory');
      }

      dispatch({ type: 'SET_LOADING', payload: { key: 'updateMemory', loading: false } });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          key: 'updateMemory',
          error: error instanceof Error ? error.message : 'Failed to update memory'
        }
      });
      dispatch({ type: 'SET_LOADING', payload: { key: 'updateMemory', loading: false } });
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { key: 'deleteMemory', loading: true } });
      
      const result = await memoryManager.deleteMemory(id);
      
      if (result.success) {
        dispatch({ type: 'DELETE_MEMORY', payload: id });
      } else {
        throw new Error(result.errors?.join(', ') || 'Failed to delete memory');
      }

      dispatch({ type: 'SET_LOADING', payload: { key: 'deleteMemory', loading: false } });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          key: 'deleteMemory',
          error: error instanceof Error ? error.message : 'Failed to delete memory'
        }
      });
      dispatch({ type: 'SET_LOADING', payload: { key: 'deleteMemory', loading: false } });
    }
  };

  // Decoration actions
  const addDecoration = async (decoration: Omit<DecorationElement, 'id'>) => {
    try {
      const newDecoration: DecorationElement = {
        ...decoration,
        id: `decoration-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      };
      
      dispatch({ type: 'ADD_DECORATION', payload: newDecoration });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          key: 'addDecoration',
          error: error instanceof Error ? error.message : 'Failed to add decoration'
        }
      });
    }
  };

  const updateDecoration = async (id: string, updates: Partial<DecorationElement>) => {
    try {
      dispatch({ type: 'UPDATE_DECORATION', payload: { id, updates } });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          key: 'updateDecoration',
          error: error instanceof Error ? error.message : 'Failed to update decoration'
        }
      });
    }
  };

  const deleteDecoration = async (id: string) => {
    try {
      dispatch({ type: 'DELETE_DECORATION', payload: id });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          key: 'deleteDecoration',
          error: error instanceof Error ? error.message : 'Failed to delete decoration'
        }
      });
    }
  };

  // Altar state actions
  const updateAltarTheme = async (theme: AltarState['backgroundTheme']) => {
    try {
      dispatch({ type: 'SET_ALTAR_STATE', payload: { backgroundTheme: theme } });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          key: 'updateTheme',
          error: error instanceof Error ? error.message : 'Failed to update altar theme'
        }
      });
    }
  };

  const saveAltarState = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { key: 'saveAltar', loading: true } });
      
      await altarLayoutManager.saveAltarState(state.altarState);
      
      dispatch({ type: 'SET_LOADING', payload: { key: 'saveAltar', loading: false } });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          key: 'saveAltar',
          error: error instanceof Error ? error.message : 'Failed to save altar state'
        }
      });
      dispatch({ type: 'SET_LOADING', payload: { key: 'saveAltar', loading: false } });
    }
  };

  // Utility functions
  const isLoading = (key: string): boolean => {
    return state.loading[key] || false;
  };

  const getError = (key: string): string | null => {
    return state.errors[key] || null;
  };

  const clearError = (key: string) => {
    dispatch({ type: 'SET_ERROR', payload: { key, error: null } });
  };

  const contextValue: AppStateContextValue = {
    state,
    dispatch,
    addFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,
    moveFamilyMember,
    addMemory,
    updateMemory,
    deleteMemory,
    addDecoration,
    updateDecoration,
    deleteDecoration,
    updateAltarTheme,
    saveAltarState,
    isLoading,
    getError,
    clearError
  };

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
};