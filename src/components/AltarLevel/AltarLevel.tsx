import React, { useEffect, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { FamilyMember, DecorationElement } from '../../types';
import { ItemTypes, DraggedFamilyMember, FamilyMemberDropResult } from '../../contexts/DragDropContext';
import { FamilyMemberCard } from '../FamilyMemberCard/FamilyMemberCard';
import { DecorationDropZone } from '../DecorationDropZone/DecorationDropZone';
import { useDragDropAccessibility } from '../../contexts/AccessibilityContext';
import { generateAriaLabels } from '../../utils/accessibility';
import styles from './AltarLevel.module.css';

export interface AltarLevelProps {
  level: number;
  levelName: string;
  members: FamilyMember[];
  decorations: DecorationElement[];
  onMemberDrop: (member: FamilyMember, targetLevel: number, targetOrder: number) => void;
  onDecorationDrop: (decoration: DecorationElement, newPosition: { x: number; y: number; level: number }) => void;
  onMemberEdit?: (member: FamilyMember) => void | undefined;
  onMemberViewMemories?: (memberId: string) => void | undefined;
  onMemberSelect?: (memberId: string) => void | undefined;
  onDecorationSelect?: (decorationId: string) => void | undefined;
  selectedDecorationType?: import('../../types').DecorationType | null;
  onDecorationAdd?: (type: import('../../types').DecorationType, level: number, position?: { x: number; y: number }) => void;
  className?: string;
}

export const AltarLevel: React.FC<AltarLevelProps> = ({
  level,
  levelName,
  members,
  decorations,
  onMemberDrop,
  onDecorationDrop,
  onMemberEdit,
  onMemberViewMemories,
  onMemberSelect,
  onDecorationSelect,
  selectedDecorationType,
  onDecorationAdd,
  className = '',
}) => {
  const levelRef = useRef<HTMLDivElement>(null);
  const { makeDropZoneAccessible, announceDropSuccess } = useDragDropAccessibility();
  const [{ isOver, canDrop }, drop] = useDrop<
    DraggedFamilyMember,
    FamilyMemberDropResult,
    { isOver: boolean; canDrop: boolean }
  >({
    accept: ItemTypes.FAMILY_MEMBER,
    drop: (item, monitor) => {
      if (!monitor.didDrop()) {
        // Calculate target order based on drop position
        const targetOrder = members.length;
        
        onMemberDrop(item.member, level, targetOrder);
        
        // Announce successful drop for accessibility
        announceDropSuccess(
          item.member.preferredName || item.member.name,
          levelName
        );
        
        return {
          targetLevel: level,
          targetOrder,
          dropType: 'altar-level' as const,
        };
      }
      return undefined;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  // Setup accessibility for drop zone
  useEffect(() => {
    if (levelRef.current) {
      makeDropZoneAccessible(levelRef.current, {
        level,
        levelName,
        acceptedTypes: ['miembros de familia', 'decoraciones']
      });
    }
  }, [levelRef.current, level, levelName, makeDropZoneAccessible]);

  // Sort members by their order in this level
  const sortedMembers = [...members]
    .filter(member => member.altarPosition.level === level)
    .sort((a, b) => a.altarPosition.order - b.altarPosition.order);

  const handleLevelClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (selectedDecorationType && onDecorationAdd) {
      // Prevent adding decoration if clicking on a member card or other interactive elements
      const target = event.target as HTMLElement;
      if (!target.closest('[data-member-card]') && 
          !target.closest('button') && 
          !target.closest('[role="button"]')) {
        
        // Calculate click position relative to the level container
        const levelRect = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - levelRect.left;
        const clickY = event.clientY - levelRect.top;
        
        // Ensure decoration is placed within bounds (with some padding)
        const boundedX = Math.max(20, Math.min(clickX - 25, levelRect.width - 70));
        const boundedY = Math.max(20, Math.min(clickY - 25, levelRect.height - 70));
        
        // Call the decoration add handler with calculated position
        if (typeof onDecorationAdd === 'function') {
          onDecorationAdd(selectedDecorationType, level, { x: boundedX, y: boundedY });
        }
      }
    }
  };

  const levelClasses = [
    styles.altarLevel,
    styles[`level${level}`],
    isOver && canDrop ? styles.dropActive : '',
    canDrop ? styles.canDrop : '',
    selectedDecorationType ? styles.decorationMode : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <DecorationDropZone
      level={level}
      decorations={decorations}
      onDecorationDrop={onDecorationDrop}
      {...(onDecorationSelect && { onDecorationSelect })}
      className={className}
    >
      <div 
        ref={(node) => {
          drop(node);
          if (levelRef.current !== node) {
            (levelRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }
        }}
        className={levelClasses}
        onClick={handleLevelClick}
        style={{ cursor: selectedDecorationType ? 'crosshair' : 'default' }}
        data-altar-level={level}
        role="region"
        aria-label={generateAriaLabels.altarLevel(level)}
        aria-describedby={`level-${level}-description`}
        tabIndex={0}
      >
        {/* Screen reader description */}
        <div id={`level-${level}-description`} className="sr-only">
          {levelName}. Contiene {sortedMembers.length} miembros de familia. 
          {selectedDecorationType ? `Modo decoración activo: ${selectedDecorationType}` : 'Arrastra miembros aquí o usa Ctrl + flechas para mover elementos.'}
        </div>

        {/* Level header */}
        <header className={styles.levelHeader}>
          <h3 className={styles.levelTitle} id={`level-${level}-title`}>
            {levelName}
          </h3>
          <div className={styles.levelDecoration} aria-hidden="true">
            <div className={styles.decorativeLine}></div>
          </div>
        </header>

        {/* Drop zone indicator */}
        {isOver && canDrop && (
          <div className={styles.dropIndicator} role="status" aria-live="polite">
            <div className={styles.dropMessage}>
              <span className={styles.dropIcon} aria-hidden="true">⬇️</span>
              <span className={styles.dropText}>Colocar aquí en {levelName}</span>
            </div>
          </div>
        )}

        {/* Members container */}
        <div 
          className={styles.membersContainer}
          role="group"
          aria-labelledby={`level-${level}-title`}
          aria-describedby={`level-${level}-members-count`}
        >
          <div id={`level-${level}-members-count`} className="sr-only">
            {sortedMembers.length === 0 
              ? 'No hay miembros en este nivel' 
              : `${sortedMembers.length} miembro${sortedMembers.length === 1 ? '' : 's'} en este nivel`
            }
          </div>
          
          {sortedMembers.length > 0 ? (
            <div className={styles.membersGrid} role="list">
              {sortedMembers.map((member, index) => (
                <div 
                  key={member.id} 
                  className={styles.memberSlot} 
                  data-member-card
                  role="listitem"
                  aria-setsize={sortedMembers.length}
                  aria-posinset={index + 1}
                >
                  <FamilyMemberCard
                    member={member}
                    {...(onMemberEdit && { onEdit: onMemberEdit })}
                    {...(onMemberViewMemories && { onViewMemories: onMemberViewMemories })}
                    {...(onMemberSelect && { onSelect: onMemberSelect })}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyLevel} role="status">
              <div className={styles.emptyMessage}>
                <span className={styles.emptyIcon} aria-hidden="true">👥</span>
                <p className={styles.emptyText}>
                  Arrastra miembros de la familia aquí o usa el teclado para añadir
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Level background decoration */}
        <div className={styles.levelBackground} aria-hidden="true">
          <div className={styles.altarCloth}></div>
          <div className={styles.culturalPattern}></div>
        </div>
      </div>
    </DecorationDropZone>
  );
};