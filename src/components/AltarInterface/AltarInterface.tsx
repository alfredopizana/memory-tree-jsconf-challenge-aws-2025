import React, { useState, useCallback } from 'react';
import { FamilyMember, DecorationElement, DecorationType } from '../../types';
import { AltarLevel } from '../AltarLevel/AltarLevel';
import { MobileNavigation } from '../MobileNavigation/MobileNavigation';
import { TouchGestureHandler } from '../TouchGestureHandler/TouchGestureHandler';
import { KeyboardShortcutsHelp } from '../KeyboardShortcutsHelp/KeyboardShortcutsHelp';
import { useAltarLayout } from '../../hooks/useAltarLayout';
import { useKeyboardShortcuts, createCommonShortcuts, createAltarShortcuts } from '../../hooks/useKeyboardShortcuts';
import styles from './AltarInterface.module.css';

export interface AltarInterfaceProps {
  familyMembers?: FamilyMember[];
  decorations?: DecorationElement[];
  altarId?: string;
  onMemberMove?: (member: FamilyMember, newLevel: number, newOrder: number) => void;
  onDecorationMove?: (decoration: DecorationElement, newPosition: { x: number; y: number; level: number }) => void;
  onMemberEdit?: (member: FamilyMember) => void | undefined;
  onMemberViewMemories?: (memberId: string) => void | undefined;
  onMemberSelect?: (memberId: string) => void | undefined;
  onDecorationSelect?: (decorationId: string) => void | undefined;
  onDecorationAdd?: (type: DecorationType, position: { x: number; y: number; level: number }) => void;
  className?: string;
}

// Traditional altar level configuration
const ALTAR_LEVELS = [
  {
    level: 1,
    name: 'Cielo - Abuelos y Ancestros',
    description: 'El nivel superior representa el cielo y honra a los abuelos y ancestros más antiguos'
  },
  {
    level: 2,
    name: 'Tierra - Padres y Tíos',
    description: 'El nivel medio representa la tierra y honra a los padres y tíos'
  },
  {
    level: 3,
    name: 'Inframundo - Generación Actual',
    description: 'El nivel inferior representa el inframundo y honra a la generación actual y los niños'
  }
];

// Decoration palette configuration
const DECORATION_TYPES = [
  {
    type: 'cempasuchil' as DecorationType,
    name: 'Cempasúchil',
    icon: '🌼',
    description: 'Flor de muerto tradicional'
  },
  {
    type: 'papel-picado' as DecorationType,
    name: 'Papel Picado',
    icon: '🎊',
    description: 'Papel decorativo perforado'
  },
  {
    type: 'candle' as DecorationType,
    name: 'Velas',
    icon: '🕯️',
    description: 'Velas para iluminar el camino'
  },
  {
    type: 'salt-cross' as DecorationType,
    name: 'Cruz de Sal',
    icon: '✝️',
    description: 'Cruz protectora de sal'
  },
  {
    type: 'offering' as DecorationType,
    name: 'Ofrendas',
    icon: '🍞',
    description: 'Comida y bebidas favoritas'
  }
];

export const AltarInterface: React.FC<AltarInterfaceProps> = ({
  familyMembers: propFamilyMembers,
  decorations: propDecorations,
  altarId,
  onMemberMove: propOnMemberMove,
  onDecorationMove: propOnDecorationMove,
  onMemberEdit,
  onMemberViewMemories,
  onMemberSelect,
  onDecorationSelect,
  onDecorationAdd: propOnDecorationAdd,
  className = '',
}) => {
  const [selectedDecorationType, setSelectedDecorationType] = useState<DecorationType | null>(null);
  const [showMobileDecorations, setShowMobileDecorations] = useState(false);
  const [showMobileMemories, setShowMobileMemories] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [focusedLevel, setFocusedLevel] = useState<number | null>(null);
  
  // Use the altar layout hook for persistence and state management
  const {
    familyMembers: hookFamilyMembers,
    decorations: hookDecorations,
    altarState,
    isLoading,
    error,
    moveFamilyMember: hookMoveFamilyMember,
    moveDecoration: hookMoveDecoration,
    addDecoration: hookAddDecoration,
  } = useAltarLayout(altarId ? {
    altarId,
    initialMembers: propFamilyMembers || [],
    initialDecorations: propDecorations || [],
  } : {
    initialMembers: propFamilyMembers || [],
    initialDecorations: propDecorations || [],
  });

  // Use hook data if available, otherwise fall back to props
  const familyMembers = altarId ? hookFamilyMembers : (propFamilyMembers || []);
  const decorations = altarId ? hookDecorations : (propDecorations || []);
  const handleMemberDrop = useCallback(async (member: FamilyMember, targetLevel: number, targetOrder: number) => {
    // Only move if the position actually changed
    if (member.altarPosition.level !== targetLevel || member.altarPosition.order !== targetOrder) {
      if (altarId) {
        // Use hook method for persistence
        await hookMoveFamilyMember(member, targetLevel, targetOrder);
      } else if (propOnMemberMove) {
        // Fall back to prop callback
        propOnMemberMove(member, targetLevel, targetOrder);
      }
    }
  }, [altarId, hookMoveFamilyMember, propOnMemberMove]);

  const handleDecorationDrop = useCallback(async (decoration: DecorationElement, newPosition: { x: number; y: number; level: number }) => {
    // Only move if the position actually changed
    const currentPos = decoration.position;
    if (currentPos.x !== newPosition.x || currentPos.y !== newPosition.y || currentPos.level !== newPosition.level) {
      if (altarId) {
        // Use hook method for persistence
        await hookMoveDecoration(decoration, newPosition);
      } else if (propOnDecorationMove) {
        // Fall back to prop callback
        propOnDecorationMove(decoration, newPosition);
      }
    }
  }, [altarId, hookMoveDecoration, propOnDecorationMove]);

  const handleDecorationTypeSelect = useCallback((type: DecorationType) => {
    setSelectedDecorationType(type === selectedDecorationType ? null : type);
  }, [selectedDecorationType]);

  const handleDecorationAdd = useCallback(async (type: DecorationType, level: number) => {
    // Add decoration at a random position within the level
    const position = {
      x: Math.random() * 300 + 50, // Random x between 50-350
      y: Math.random() * 100 + 50, // Random y between 50-150
      level
    };
    
    if (altarId) {
      // Use hook method for persistence
      await hookAddDecoration(type, position);
    } else if (propOnDecorationAdd) {
      // Fall back to prop callback
      propOnDecorationAdd(type, position);
    }
    
    setSelectedDecorationType(null);
  }, [altarId, hookAddDecoration, propOnDecorationAdd]);

  // Keyboard shortcuts setup
  const commonShortcuts = createCommonShortcuts({
    save: () => console.log('Save altar'),
    undo: () => console.log('Undo'),
    redo: () => console.log('Redo'),
    delete: () => {
      if (selectedMemberId) {
        console.log('Delete member:', selectedMemberId);
        setSelectedMemberId(null);
      }
    },
    newItem: () => console.log('Add new family member'),
    help: () => setShowKeyboardHelp(!showKeyboardHelp),
  });

  const altarShortcuts = createAltarShortcuts({
    toggleDecorations: () => setShowMobileDecorations(!showMobileDecorations),
    toggleMemories: () => setShowMobileMemories(!showMobileMemories),
    focusLevel1: () => setFocusedLevel(1),
    focusLevel2: () => setFocusedLevel(2),
    focusLevel3: () => setFocusedLevel(3),
    addDecoration: () => {
      if (selectedDecorationType && focusedLevel) {
        handleDecorationAdd(selectedDecorationType, focusedLevel);
      }
    },
    clearDecorations: () => console.log('Clear all decorations'),
  });

  const allShortcuts = [...commonShortcuts, ...altarShortcuts];
  
  useKeyboardShortcuts(allShortcuts, { enabled: true });

  // Count decorations by type for display
  const decorationCounts = DECORATION_TYPES.reduce((counts, { type }) => {
    counts[type] = decorations.filter(d => d.type === type).length;
    return counts;
  }, {} as Record<DecorationType, number>);

  const altarClasses = [
    styles.altarInterface,
    altarState?.backgroundTheme ? styles[`theme-${altarState.backgroundTheme}`] : '',
    isLoading ? styles.loading : '',
    error ? styles.error : '',
    className
  ].filter(Boolean).join(' ');

  // Show loading state
  if (isLoading) {
    return (
      <div className={altarClasses}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p>Cargando altar...</p>
        </div>
      </div>
    );
  }

  return (
    <TouchGestureHandler
      onSwipeLeft={() => setShowMobileDecorations(false)}
      onSwipeRight={() => setShowMobileDecorations(true)}
      onSwipeUp={() => setShowMobileMemories(true)}
      onSwipeDown={() => setShowMobileMemories(false)}
      className={altarClasses}
    >
      <div className={styles.altarContainer}>
        {/* Altar header */}
        <div className={styles.altarHeader}>
          <h2 className={styles.altarTitle}>
            {altarState?.name || 'Altar de la Memoria Familiar'}
          </h2>
          <p className={styles.altarDescription}>
            Arrastra a los miembros de tu familia a los diferentes niveles del altar tradicional
          </p>
          {error && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

      {/* Decoration Palette */}
      <div className={`${styles.decorationPalette} ${showMobileDecorations ? styles.mobileVisible : ''}`}>
        <div className={styles.paletteHeader}>
          <h3 className={styles.paletteTitle}>Decoraciones Tradicionales</h3>
          <p className={styles.paletteDescription}>
            Selecciona decoraciones para añadir al altar
          </p>
        </div>
        <div className={styles.decorationGrid}>
          {DECORATION_TYPES.map(({ type, name, icon, description }) => (
            <div
              key={type}
              className={styles.decorationItem}
              onClick={() => handleDecorationTypeSelect(type)}
              title={description}
              style={{
                borderColor: selectedDecorationType === type ? 'var(--color-primary)' : 'transparent',
                background: selectedDecorationType === type ? 'rgba(255, 107, 53, 0.2)' : 'rgba(255, 255, 255, 0.05)'
              }}
            >
              <div className={styles.decorationIcon}>{icon}</div>
              <div className={styles.decorationName}>{name}</div>
              {decorationCounts[type] > 0 && (
                <div className={styles.decorationCount}>{decorationCounts[type]}</div>
              )}
              {selectedDecorationType === type && (
                <div className={styles.selectedIndicator}>
                  <span>✨</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Decoration management tools */}
        <div className={styles.decorationTools}>
          <div className={styles.toolsHeader}>
            <span className={styles.toolsTitle}>Herramientas</span>
          </div>
          <div className={styles.toolsGrid}>
            <button 
              className={styles.toolButton}
              onClick={() => setSelectedDecorationType(null)}
              title="Cancelar selección"
            >
              <span className={styles.toolIcon}>❌</span>
              <span className={styles.toolName}>Cancelar</span>
            </button>
            <button 
              className={styles.toolButton}
              onClick={() => {
                // Clear all decorations (would need to implement this)
                console.log('Clear all decorations');
              }}
              title="Limpiar todas las decoraciones"
            >
              <span className={styles.toolIcon}>🧹</span>
              <span className={styles.toolName}>Limpiar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Altar levels */}
      <div className={styles.altarLevels}>
        {ALTAR_LEVELS.map((levelConfig) => (
          <div 
            key={levelConfig.level} 
            className={`${styles.decorationLayer} ${styles[`level${levelConfig.level}`]} ${styles.interactive}`}
            style={{ zIndex: 10 + levelConfig.level }}
          >
            <AltarLevel
              level={levelConfig.level}
              levelName={levelConfig.name}
              members={familyMembers}
              decorations={decorations.filter(d => d.position.level === levelConfig.level)}
              onMemberDrop={handleMemberDrop}
              onDecorationDrop={handleDecorationDrop}
              selectedDecorationType={selectedDecorationType}
              onDecorationAdd={handleDecorationAdd}
              {...(onMemberEdit && { onMemberEdit })}
              {...(onMemberViewMemories && { onMemberViewMemories })}
              {...(onMemberSelect && { onMemberSelect })}
              {...(onDecorationSelect && { onDecorationSelect })}
            />
            
            {/* Decoration overlay for this level */}
            <div className={`${styles.decorationOverlay} ${styles[`overlay-level${levelConfig.level}`]}`}>
              {decorations
                .filter(decoration => decoration.position.level === levelConfig.level)
                .map(decoration => (
                  <div
                    key={decoration.id}
                    className={styles.decorationWrapper}
                    style={{
                      position: 'absolute',
                      left: decoration.position.x,
                      top: decoration.position.y,
                      zIndex: 50 + levelConfig.level,
                    }}
                  >
                    {/* Decoration element would be rendered here */}
                    <div className={styles.decorationPlaceholder}>
                      {DECORATION_TYPES.find(t => t.type === decoration.type)?.icon || '✨'}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Altar base decoration */}
      <div className={styles.altarBase}>
        <div className={styles.baseDecoration}>
          <div className={styles.saltLine}></div>
          <div className={styles.marigoldBorder}></div>
        </div>
      </div>

      {/* Cultural background elements */}
      <div className={styles.culturalBackground}>
        <div className={styles.papelPicado}></div>
        <div className={styles.candleGlow}></div>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation
        onToggleDecorations={() => setShowMobileDecorations(!showMobileDecorations)}
        onToggleMemories={() => setShowMobileMemories(!showMobileMemories)}
        onAddMember={() => console.log('Add member')}
        onSaveAltar={() => console.log('Save altar')}
        decorationsVisible={showMobileDecorations}
        memoriesVisible={showMobileMemories}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        shortcuts={allShortcuts}
        isVisible={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />

      {/* Desktop keyboard hints */}
      <div className={styles.desktopHints}>
        <div className={styles.hintItem}>
          <kbd className={styles.hintKey}>F1</kbd>
          <span className={styles.hintText}>Ayuda</span>
        </div>
        <div className={styles.hintItem}>
          <kbd className={styles.hintKey}>Ctrl</kbd>
          <span className={styles.hintPlus}>+</span>
          <kbd className={styles.hintKey}>S</kbd>
          <span className={styles.hintText}>Guardar</span>
        </div>
        {focusedLevel && (
          <div className={styles.hintItem}>
            <span className={styles.hintText}>Nivel {focusedLevel} enfocado</span>
          </div>
        )}
      </div>
      </div>
    </TouchGestureHandler>
  );
};