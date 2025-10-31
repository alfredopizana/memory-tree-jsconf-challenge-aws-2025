import React from 'react';
import { Memory, FamilyMember } from '../../types';
import styles from './MemoryConnectionIndicator.module.css';

export interface MemoryConnectionIndicatorProps {
  memories: Memory[];
  member: FamilyMember;
  onMemoryClick?: (memory: Memory) => void;
  maxVisible?: number;
  showCount?: boolean;
}

export const MemoryConnectionIndicator: React.FC<MemoryConnectionIndicatorProps> = ({
  memories,
  member,
  onMemoryClick,
  maxVisible = 3,
  showCount = true,
}) => {
  // Filter memories that are associated with this member
  const associatedMemories = memories.filter(memory => 
    memory.associatedMemberIds.includes(member.id)
  );

  if (associatedMemories.length === 0) {
    return null;
  }

  const visibleMemories = associatedMemories.slice(0, maxVisible);
  const remainingCount = associatedMemories.length - maxVisible;

  const handleMemoryClick = (memory: Memory, event: React.MouseEvent) => {
    event.stopPropagation();
    onMemoryClick?.(memory);
  };

  return (
    <div className={styles.memoryConnections}>
      <div className={styles.memoriesContainer}>
        {visibleMemories.map(memory => (
          <MemoryIndicatorDot
            key={memory.id}
            memory={memory}
            onClick={(e) => handleMemoryClick(memory, e)}
          />
        ))}
        
        {remainingCount > 0 && (
          <div className={styles.remainingCount} title={`${remainingCount} more memories`}>
            +{remainingCount}
          </div>
        )}
      </div>
      
      {showCount && (
        <div className={styles.totalCount}>
          {associatedMemories.length} memor{associatedMemories.length === 1 ? 'y' : 'ies'}
        </div>
      )}
    </div>
  );
};

// Individual memory indicator dot
interface MemoryIndicatorDotProps {
  memory: Memory;
  onClick: (event: React.MouseEvent) => void;
}

const MemoryIndicatorDot: React.FC<MemoryIndicatorDotProps> = ({ memory, onClick }) => {
  const hasPhotos = memory.photos.length > 0;
  const isRecent = (Date.now() - memory.createdAt.getTime()) < (7 * 24 * 60 * 60 * 1000); // 7 days

  return (
    <button
      className={`${styles.memoryDot} ${hasPhotos ? styles.withPhotos : ''} ${isRecent ? styles.recent : ''}`}
      onClick={onClick}
      title={`Memory: ${memory.title}${hasPhotos ? ' (has photos)' : ''}${isRecent ? ' (recent)' : ''}`}
      aria-label={`View memory: ${memory.title}`}
    >
      <div className={styles.dotInner}>
        {hasPhotos && <span className={styles.photoIcon}>📷</span>}
        {isRecent && <span className={styles.recentIndicator}>✨</span>}
      </div>
    </button>
  );
};

// Memory connection lines component for visual connections between members
export interface MemoryConnectionLinesProps {
  memories: Memory[];
  memberPositions: Record<string, { x: number; y: number }>;
  selectedMemoryId?: string;
}

export const MemoryConnectionLines: React.FC<MemoryConnectionLinesProps> = ({
  memories,
  memberPositions,
  selectedMemoryId,
}) => {
  if (!selectedMemoryId) {
    return null;
  }

  const selectedMemory = memories.find(m => m.id === selectedMemoryId);
  if (!selectedMemory || selectedMemory.associatedMemberIds.length < 2) {
    return null;
  }

  // Get positions of all members associated with the selected memory
  const memberPositionsArray = selectedMemory.associatedMemberIds
    .map(memberId => memberPositions[memberId])
    .filter((pos): pos is { x: number; y: number } => pos !== undefined);

  if (memberPositionsArray.length < 2) {
    return null;
  }

  // Create lines between all connected members
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  
  for (let i = 0; i < memberPositionsArray.length; i++) {
    for (let j = i + 1; j < memberPositionsArray.length; j++) {
      const pos1 = memberPositionsArray[i];
      const pos2 = memberPositionsArray[j];
      lines.push({
        x1: pos1.x,
        y1: pos1.y,
        x2: pos2.x,
        y2: pos2.y,
      });
    }
  }

  return (
    <svg className={styles.connectionLines}>
      {lines.map((line, index) => (
        <line
          key={index}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          className={styles.connectionLine}
          strokeDasharray="5,5"
        />
      ))}
    </svg>
  );
};

// Compact memory list for showing all memories associated with a member
export interface MemoryListCompactProps {
  memories: Memory[];
  member: FamilyMember;
  onMemoryClick?: (memory: Memory) => void;
  maxItems?: number;
}

export const MemoryListCompact: React.FC<MemoryListCompactProps> = ({
  memories,
  member,
  onMemoryClick,
  maxItems = 5,
}) => {
  const associatedMemories = memories.filter(memory => 
    memory.associatedMemberIds.includes(member.id)
  );

  if (associatedMemories.length === 0) {
    return (
      <div className={styles.emptyMemories}>
        <span className={styles.emptyText}>No memories yet</span>
      </div>
    );
  }

  const visibleMemories = associatedMemories.slice(0, maxItems);
  const remainingCount = associatedMemories.length - maxItems;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className={styles.memoryListCompact}>
      <div className={styles.memoryItems}>
        {visibleMemories.map(memory => (
          <div
            key={memory.id}
            className={styles.memoryItem}
            onClick={() => onMemoryClick?.(memory)}
          >
            <div className={styles.memoryItemContent}>
              <span className={styles.memoryItemTitle}>{memory.title}</span>
              <span className={styles.memoryItemDate}>{formatDate(memory.createdAt)}</span>
            </div>
            {memory.photos.length > 0 && (
              <span className={styles.memoryItemPhoto}>📷</span>
            )}
          </div>
        ))}
      </div>
      
      {remainingCount > 0 && (
        <div className={styles.moreMemories}>
          +{remainingCount} more memor{remainingCount === 1 ? 'y' : 'ies'}
        </div>
      )}
    </div>
  );
};