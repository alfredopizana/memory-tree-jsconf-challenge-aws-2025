import React from 'react';
import { useDragLayer } from 'react-dnd';
import { ItemTypes } from '../../contexts/DragDropContext';
import { DragPreview } from '../FamilyMemberCard/DragPreview';
import { DecorationDragPreview } from '../DecorationElement/DecorationDragPreview';
import styles from './CustomDragLayer.module.css';

const layerStyles: React.CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 100,
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
};

function getItemStyles(
  initialOffset: { x: number; y: number } | null,
  currentOffset: { x: number; y: number } | null
) {
  if (!initialOffset || !currentOffset) {
    return {
      display: 'none',
    };
  }

  const { x, y } = currentOffset;

  const transform = `translate(${x}px, ${y}px)`;
  return {
    transform,
    WebkitTransform: transform,
  };
}

export const CustomDragLayer: React.FC = () => {
  const {
    itemType,
    isDragging,
    item,
    initialOffset,
    currentOffset,
  } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    initialOffset: monitor.getInitialSourceClientOffset(),
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  function renderItem() {
    switch (itemType) {
      case ItemTypes.FAMILY_MEMBER:
        return <DragPreview member={item.member} />;
      case ItemTypes.DECORATION:
        return <DecorationDragPreview decoration={item.decoration} />;
      default:
        return null;
    }
  }

  if (!isDragging) {
    return null;
  }

  return (
    <div style={layerStyles}>
      <div
        className={styles.dragLayer}
        style={getItemStyles(initialOffset, currentOffset)}
      >
        {renderItem()}
      </div>
    </div>
  );
};