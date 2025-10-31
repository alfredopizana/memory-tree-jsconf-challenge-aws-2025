import { useState, useEffect, useCallback } from 'react';
import { FamilyMember, DecorationElement, AltarState, DecorationType } from '../types';
import { AltarLayoutManager } from '../services/AltarLayoutManager';

interface UseAltarLayoutProps {
  altarId?: string;
  initialMembers?: FamilyMember[];
  initialDecorations?: DecorationElement[];
}

interface UseAltarLayoutReturn {
  familyMembers: FamilyMember[];
  decorations: DecorationElement[];
  altarState: AltarState | null;
  isLoading: boolean;
  error: string | null;
  moveFamilyMember: (member: FamilyMember, newLevel: number, newOrder: number) => Promise<void>;
  moveDecoration: (decoration: DecorationElement, newPosition: { x: number; y: number; level: number }) => Promise<void>;
  addDecoration: (type: DecorationType, position: { x: number; y: number; level: number }) => Promise<void>;
  removeDecoration: (decorationId: string) => Promise<void>;
  saveLayout: () => Promise<void>;
  loadLayout: (altarId: string) => Promise<void>;
}

/**
 * Custom hook for managing altar layout state with persistence
 * Integrates with AltarLayoutManager for position persistence and restoration
 * Requirements: 2.1, 2.3, 2.4, 2.5
 */
export const useAltarLayout = ({
  altarId,
  initialMembers = [],
  initialDecorations = []
}: UseAltarLayoutProps = {}): UseAltarLayoutReturn => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(initialMembers);
  const [decorations, setDecorations] = useState<DecorationElement[]>(initialDecorations);
  const [altarState, setAltarState] = useState<AltarState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layoutManager] = useState(() => new AltarLayoutManager());

  // Load altar layout on mount or when altarId changes
  useEffect(() => {
    if (altarId) {
      loadLayout(altarId);
    }
  }, [altarId]);

  const loadLayout = useCallback(async (targetAltarId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const layout = await layoutManager.getAltarLayout(targetAltarId);
      
      if (layout.altar) {
        setAltarState(layout.altar);
        
        // Flatten members from all levels
        const allMembers = Object.values(layout.membersByLevel).flat();
        setFamilyMembers(allMembers);
        
        // Flatten decorations from all levels
        const allDecorations = Object.values(layout.decorationsByLevel).flat();
        setDecorations(allDecorations);
      } else {
        setError('Altar layout not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load altar layout');
    } finally {
      setIsLoading(false);
    }
  }, [layoutManager]);

  const moveFamilyMember = useCallback(async (
    member: FamilyMember, 
    newLevel: number, 
    newOrder: number
  ) => {
    try {
      setError(null);
      
      // Update local state immediately for responsive UI
      setFamilyMembers(prev => 
        prev.map(m => 
          m.id === member.id 
            ? { ...m, altarPosition: { level: newLevel, order: newOrder } }
            : m
        )
      );

      // Persist to storage if we have an altar ID
      if (altarState?.id) {
        const result = await layoutManager.moveFamilyMember(
          altarState.id,
          member.id,
          newLevel,
          newOrder
        );
        
        if (!result.success) {
          // Revert local state on failure
          setFamilyMembers(prev => 
            prev.map(m => 
              m.id === member.id 
                ? { ...m, altarPosition: member.altarPosition }
                : m
            )
          );
          setError(result.errors?.join(', ') || 'Failed to move family member');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move family member');
      // Revert local state on error
      setFamilyMembers(prev => 
        prev.map(m => 
          m.id === member.id 
            ? { ...m, altarPosition: member.altarPosition }
            : m
        )
      );
    }
  }, [layoutManager, altarState]);

  const moveDecoration = useCallback(async (
    decoration: DecorationElement,
    newPosition: { x: number; y: number; level: number }
  ) => {
    try {
      setError(null);
      
      // Update local state immediately for responsive UI
      setDecorations(prev =>
        prev.map(d =>
          d.id === decoration.id
            ? { ...d, position: newPosition }
            : d
        )
      );

      // Persist to storage if we have an altar ID
      if (altarState?.id) {
        const result = await layoutManager.moveDecoration(
          altarState.id,
          decoration.id,
          { x: newPosition.x, y: newPosition.y },
          newPosition.level
        );
        
        if (!result.success) {
          // Revert local state on failure
          setDecorations(prev =>
            prev.map(d =>
              d.id === decoration.id
                ? { ...d, position: decoration.position }
                : d
            )
          );
          setError(result.errors?.join(', ') || 'Failed to move decoration');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move decoration');
      // Revert local state on error
      setDecorations(prev =>
        prev.map(d =>
          d.id === decoration.id
            ? { ...d, position: decoration.position }
            : d
        )
      );
    }
  }, [layoutManager, altarState]);

  const addDecoration = useCallback(async (
    type: DecorationType,
    position: { x: number; y: number; level: number }
  ) => {
    try {
      setError(null);
      
      const newDecoration: DecorationElement = {
        id: `decoration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        position,
        size: 'medium',
        rotation: 0
      };

      // Update local state immediately for responsive UI
      setDecorations(prev => [...prev, newDecoration]);

      // Persist to storage if we have an altar ID
      if (altarState?.id) {
        const result = await layoutManager.addDecoration(altarState.id, {
          type,
          position,
          size: 'medium',
          rotation: 0
        });
        
        if (!result.success) {
          // Remove from local state on failure
          setDecorations(prev => prev.filter(d => d.id !== newDecoration.id));
          setError(result.errors?.join(', ') || 'Failed to add decoration');
        } else if (result.decorationId) {
          // Update with the actual ID from the database
          setDecorations(prev =>
            prev.map(d =>
              d.id === newDecoration.id
                ? { ...d, id: result.decorationId! }
                : d
            )
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add decoration');
    }
  }, [layoutManager, altarState]);

  const removeDecoration = useCallback(async (decorationId: string) => {
    try {
      setError(null);
      
      // Store the decoration for potential revert
      const decorationToRemove = decorations.find(d => d.id === decorationId);
      
      // Update local state immediately for responsive UI
      setDecorations(prev => prev.filter(d => d.id !== decorationId));

      // Persist to storage if we have an altar ID
      if (altarState?.id) {
        const result = await layoutManager.removeDecoration(altarState.id, decorationId);
        
        if (!result.success) {
          // Revert local state on failure
          if (decorationToRemove) {
            setDecorations(prev => [...prev, decorationToRemove]);
          }
          setError(result.errors?.join(', ') || 'Failed to remove decoration');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove decoration');
    }
  }, [layoutManager, altarState, decorations]);

  const saveLayout = useCallback(async () => {
    if (!altarState?.id) {
      setError('No altar layout to save');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // The layout is automatically saved through individual operations
      // This method can be used for explicit save operations if needed
      console.log('Layout saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save layout');
    } finally {
      setIsLoading(false);
    }
  }, [altarState]);

  return {
    familyMembers,
    decorations,
    altarState,
    isLoading,
    error,
    moveFamilyMember,
    moveDecoration,
    addDecoration,
    removeDecoration,
    saveLayout,
    loadLayout
  };
};