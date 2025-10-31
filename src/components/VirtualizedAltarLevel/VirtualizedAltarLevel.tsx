import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { AltarLevel, AltarLevelProps } from '../AltarLevel/AltarLevel';
import { OptimizedFamilyMemberCard } from '../OptimizedFamilyMemberCard/OptimizedFamilyMemberCard';
import { useVirtualScrolling, useFamilyMemberMemo, usePerformanceMonitor } from '../../utils/performance';
import { FamilyMember } from '../../types';
import styles from './VirtualizedAltarLevel.module.css';

export interface VirtualizedAltarLevelProps extends Omit<AltarLevelProps, 'members'> {
  members: FamilyMember[];
  itemHeight?: number;
  containerHeight?: number;
  enableVirtualization?: boolean;
  maxVisibleItems?: number;
  enablePerformanceMonitoring?: boolean;
}

const VirtualizedAltarLevelComponent: React.FC<VirtualizedAltarLevelProps> = ({
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
  itemHeight = 150,
  containerHeight = 400,
  enableVirtualization = true,
  maxVisibleItems = 20,
  enablePerformanceMonitoring = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Performance monitoring
  if (enablePerformanceMonitoring && process.env.NODE_ENV === 'development') {
    usePerformanceMonitor(`VirtualizedAltarLevel-${level}`);
  }

  // Filter and memoize members for this level
  const levelMembers = useMemo(() => {
    return members
      .filter(member => member.altarPosition.level === level)
      .sort((a, b) => a.altarPosition.order - b.altarPosition.order);
  }, [members, level]);

  // Use memoized calculations for performance
  const { membersByLevel, totalMembers } = useFamilyMemberMemo(levelMembers);

  // Determine if virtualization should be used
  const shouldVirtualize = enableVirtualization && levelMembers.length > maxVisibleItems;

  // Virtual scrolling for large lists
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange,
  } = useVirtualScrolling(
    shouldVirtualize ? levelMembers : [],
    itemHeight,
    containerHeight
  );

  // Memoized event handlers
  const handleMemberEdit = useCallback((member: FamilyMember) => {
    if (onMemberEdit) {
      onMemberEdit(member);
    }
  }, [onMemberEdit]);

  const handleMemberViewMemories = useCallback((memberId: string) => {
    if (onMemberViewMemories) {
      onMemberViewMemories(memberId);
    }
  }, [onMemberViewMemories]);

  const handleMemberSelect = useCallback((memberId: string) => {
    if (onMemberSelect) {
      onMemberSelect(memberId);
    }
  }, [onMemberSelect]);

  // Render members efficiently
  const renderMembers = useCallback(() => {
    const membersToRender = shouldVirtualize ? visibleItems : levelMembers;

    if (membersToRender.length === 0) {
      return (
        <div className={styles.emptyLevel}>
          <div className={styles.emptyMessage}>
            <span className={styles.emptyIcon} aria-hidden="true">👥</span>
            <p className={styles.emptyText}>
              Arrastra miembros de la familia aquí
            </p>
          </div>
        </div>
      );
    }

    return (
      <div 
        className={styles.membersGrid}
        style={shouldVirtualize ? {
          height: totalHeight,
          position: 'relative',
        } : undefined}
      >
        {shouldVirtualize && (
          <div style={{ height: offsetY }} />
        )}
        
        <div 
          className={styles.visibleMembers}
          style={shouldVirtualize ? {
            transform: `translateY(${offsetY}px)`,
          } : undefined}
        >
          {membersToRender.map((member, index) => {
            const actualIndex = shouldVirtualize 
              ? visibleRange.startIndex + index 
              : index;

            return (
              <div 
                key={member.id} 
                className={styles.memberSlot}
                style={shouldVirtualize ? {
                  height: itemHeight,
                  position: 'absolute',
                  top: actualIndex * itemHeight,
                  width: '100%',
                } : undefined}
                data-member-card
                role="listitem"
                aria-setsize={levelMembers.length}
                aria-posinset={actualIndex + 1}
              >
                <OptimizedFamilyMemberCard
                  member={member}
                  lazyLoad={shouldVirtualize}
                  enablePerformanceMonitoring={enablePerformanceMonitoring}
                  onEdit={handleMemberEdit}
                  onViewMemories={handleMemberViewMemories}
                  onSelect={handleMemberSelect}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [
    shouldVirtualize,
    visibleItems,
    levelMembers,
    totalHeight,
    offsetY,
    visibleRange,
    itemHeight,
    handleMemberEdit,
    handleMemberViewMemories,
    handleMemberSelect,
    enablePerformanceMonitoring,
  ]);

  // Performance optimization: only update scroll handler when needed
  const optimizedScrollHandler = useCallback((event: React.UIEvent<HTMLElement>) => {
    if (shouldVirtualize) {
      handleScroll(event);
    }
  }, [shouldVirtualize, handleScroll]);

  // If not virtualizing or small list, use regular AltarLevel
  if (!shouldVirtualize) {
    return (
      <AltarLevel
        level={level}
        levelName={levelName}
        members={levelMembers}
        decorations={decorations}
        onMemberDrop={onMemberDrop}
        onDecorationDrop={onDecorationDrop}
        onMemberEdit={onMemberEdit}
        onMemberViewMemories={onMemberViewMemories}
        onMemberSelect={onMemberSelect}
        onDecorationSelect={onDecorationSelect}
        selectedDecorationType={selectedDecorationType}
        onDecorationAdd={onDecorationAdd}
        className={className}
      />
    );
  }

  // Virtualized version for large lists
  return (
    <div 
      className={`${styles.virtualizedAltarLevel} ${className}`}
      data-altar-level={level}
      role="region"
      aria-label={`${levelName} - ${levelMembers.length} miembros`}
      aria-describedby={`level-${level}-description`}
    >
      {/* Screen reader description */}
      <div id={`level-${level}-description`} className="sr-only">
        {levelName}. Contiene {levelMembers.length} miembros de familia. 
        Lista virtualizada para mejor rendimiento.
      </div>

      {/* Level header */}
      <header className={styles.levelHeader}>
        <h3 className={styles.levelTitle} id={`level-${level}-title`}>
          {levelName}
        </h3>
        <div className={styles.memberCount}>
          {levelMembers.length} miembro{levelMembers.length === 1 ? '' : 's'}
        </div>
      </header>

      {/* Virtualized members container */}
      <div 
        ref={containerRef}
        className={styles.membersContainer}
        style={{ height: containerHeight }}
        onScroll={optimizedScrollHandler}
        role="list"
        aria-labelledby={`level-${level}-title`}
      >
        {renderMembers()}
      </div>

      {/* Performance info in development */}
      {enablePerformanceMonitoring && process.env.NODE_ENV === 'development' && (
        <div className={styles.performanceInfo}>
          <small>
            Virtualized: {shouldVirtualize ? 'Yes' : 'No'} | 
            Total: {levelMembers.length} | 
            Visible: {shouldVirtualize ? visibleItems.length : levelMembers.length} |
            Range: {shouldVirtualize ? `${visibleRange.startIndex}-${visibleRange.endIndex}` : 'All'}
          </small>
        </div>
      )}
    </div>
  );
};

// Memoize the component with custom comparison
export const VirtualizedAltarLevel = memo(VirtualizedAltarLevelComponent, (prevProps, nextProps) => {
  // Check if level-specific data has changed
  if (
    prevProps.level !== nextProps.level ||
    prevProps.levelName !== nextProps.levelName ||
    prevProps.selectedDecorationType !== nextProps.selectedDecorationType ||
    prevProps.enableVirtualization !== nextProps.enableVirtualization ||
    prevProps.maxVisibleItems !== nextProps.maxVisibleItems
  ) {
    return false;
  }

  // Check if members for this level have changed
  const prevLevelMembers = prevProps.members.filter(m => m.altarPosition.level === prevProps.level);
  const nextLevelMembers = nextProps.members.filter(m => m.altarPosition.level === nextProps.level);

  if (prevLevelMembers.length !== nextLevelMembers.length) {
    return false;
  }

  // Check if any member has changed
  for (let i = 0; i < prevLevelMembers.length; i++) {
    const prevMember = prevLevelMembers[i];
    const nextMember = nextLevelMembers[i];

    if (
      prevMember.id !== nextMember.id ||
      prevMember.altarPosition.order !== nextMember.altarPosition.order ||
      prevMember.updatedAt.getTime() !== nextMember.updatedAt.getTime()
    ) {
      return false;
    }
  }

  // Check if decorations have changed
  const prevLevelDecorations = prevProps.decorations.filter(d => d.position.level === prevProps.level);
  const nextLevelDecorations = nextProps.decorations.filter(d => d.position.level === nextProps.level);

  if (prevLevelDecorations.length !== nextLevelDecorations.length) {
    return false;
  }

  return true; // Don't re-render
});