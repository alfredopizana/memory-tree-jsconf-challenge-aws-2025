import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { DecorationElement } from '../../types';
import { ItemTypes, DraggedDecoration, DecorationDropResult } from '../../contexts/DragDropContext';
import styles from './DecorationDropZone.module.css';

export interface DecorationDropZoneProps {
  level: number;
  decorations: DecorationElement[];
  onDecorationDrop: (decoration: DecorationElement, newPosition: { x: number; y: number; level: number }) => void;
  onDecorationMove?: (decorationId: string, newPosition: { x: number; y: number; level: number }) => void | undefined;
  onDecorationSelect?: (decorationId: string) => void | undefined;
  children?: React.ReactNode;
  className?: string;
}

export const DecorationDropZone: React.FC<DecorationDropZoneProps> = ({
  level,
  decorations,
  onDecorationDrop,
  onDecorationMove: _onDecorationMove,
  onDecorationSelect: _onDecorationSelect,
  children,
  className = '',
}) => {
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [{ isOver, canDrop }, drop] = useDrop<
    DraggedDecoration,
    DecorationDropResult,
    { isOver: boolean; canDrop: boolean }
  >({
    accept: ItemTypes.DECORATION,
    drop: (item, monitor) => {
      if (!monitor.didDrop() && dropZoneRef.current) {
        const dropZoneRect = dropZoneRef.current.getBoundingClientRect();
        const clientOffset = monitor.getClientOffset();
        
        if (clientOffset) {
          // Calculate relative position within the drop zone
          const relativeX = clientOffset.x - dropZoneRect.left;
          const relativeY = clientOffset.y - dropZoneRect.top;
          
          // Ensure the decoration stays within bounds
          const boundedX = Math.max(0, Math.min(relativeX, dropZoneRect.width - 50));
          const boundedY = Math.max(0, Math.min(relativeY, dropZoneRect.height - 50));
          
          const newPosition = {
            x: boundedX,
            y: boundedY,
            level,
          };
          
          onDecorationDrop(item.decoration, newPosition);
          
          return {
            targetPosition: newPosition,
            dropType: 'free-form' as const,
          };
        }
      }
      return undefined;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  // Combine refs
  const combinedRef = (node: HTMLDivElement | null) => {
    if (dropZoneRef.current !== node) {
      (dropZoneRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
    drop(node);
  };

  const dropZoneClasses = [
    styles.decorationDropZone,
    isOver && canDrop ? styles.dropActive : '',
    canDrop ? styles.canDrop : '',
    className
  ].filter(Boolean).join(' ');

  // Filter decorations for this level
  const levelDecorations = decorations.filter(decoration => decoration.position.level === level);

  return (
    <div ref={combinedRef} className={dropZoneClasses}>
      {/* Drop indicator overlay */}
      {isOver && canDrop && (
        <div className={styles.dropOverlay}>
          <div className={styles.dropIndicator}>
            <div className={styles.dropRipple}></div>
            <span className={styles.dropText}>Colocar decoración</span>
          </div>
        </div>
      )}

      {/* Boundary indicators */}
      <div className={styles.boundaries}>
        <div className={styles.boundaryCorner + ' ' + styles.topLeft}></div>
        <div className={styles.boundaryCorner + ' ' + styles.topRight}></div>
        <div className={styles.boundaryCorner + ' ' + styles.bottomLeft}></div>
        <div className={styles.boundaryCorner + ' ' + styles.bottomRight}></div>
      </div>

      {/* Content (altar level or other components) */}
      <div className={styles.dropZoneContent}>
        {children}
      </div>

      {/* Positioned decorations for this level */}
      <div className={styles.decorationsLayer}>
        {levelDecorations.map((decoration) => (
          <div
            key={decoration.id}
            className={styles.decorationWrapper}
            style={{
              position: 'absolute',
              left: decoration.position.x,
              top: decoration.position.y,
              transform: `rotate(${decoration.rotation}deg)`,
              zIndex: 10,
            }}
          >
            {/* Decoration content would be rendered here by parent component */}
          </div>
        ))}
      </div>

      {/* Grid overlay for positioning guidance */}
      {(isOver || canDrop) && (
        <div className={styles.gridOverlay}>
          <div className={styles.gridLines}></div>
        </div>
      )}
    </div>
  );
};