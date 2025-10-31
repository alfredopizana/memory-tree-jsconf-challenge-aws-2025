import React, { useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { FamilyMember } from '../../types';
import { Card } from '../Card';
import { ItemTypes, DraggedFamilyMember } from '../../contexts/DragDropContext';
import styles from './FamilyMemberCard.module.css';

export interface FamilyMemberCardProps {
  member: FamilyMember;
  isDragging?: boolean;
  isSelected?: boolean;
  showDetails?: boolean;
  onEdit?: (member: FamilyMember) => void | undefined;
  onViewMemories?: (memberId: string) => void | undefined;
  onSelect?: (memberId: string) => void | undefined;
  onDragStart?: (member: FamilyMember) => void | undefined;
  onDragEnd?: (member: FamilyMember) => void | undefined;
  className?: string;
}

export const FamilyMemberCard: React.FC<FamilyMemberCardProps> = ({
  member,
  isDragging: externalIsDragging = false,
  isSelected = false,
  showDetails = false,
  onEdit,
  onViewMemories,
  onSelect,
  onDragStart,
  onDragEnd,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Set up drag functionality
  const [{ isDragging }, drag, dragPreview] = useDrag<
    DraggedFamilyMember,
    any,
    { isDragging: boolean }
  >({
    type: ItemTypes.FAMILY_MEMBER,
    item: () => {
      const dragItem: DraggedFamilyMember = {
        type: ItemTypes.FAMILY_MEMBER,
        member,
        sourceLevel: member.altarPosition.level,
        sourceOrder: member.altarPosition.order,
      };
      
      if (onDragStart) {
        onDragStart(member);
      }
      
      return dragItem;
    },
    end: (_item, _monitor) => {
      if (onDragEnd) {
        onDragEnd(member);
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Use custom drag preview
  useEffect(() => {
    dragPreview(getEmptyImage(), { captureDraggingState: true });
  }, [dragPreview]);

  const isDeceased = !!member.dateOfDeath;
  const displayName = member.preferredName || member.name;
  const primaryPhoto = member.photos?.[0];

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const getLifeSpan = () => {
    const birthYear = member.dateOfBirth.getFullYear();
    const deathYear = member.dateOfDeath?.getFullYear();
    return deathYear ? `${birthYear} - ${deathYear}` : `${birthYear} - presente`;
  };

  const finalIsDragging = isDragging || externalIsDragging;
  
  const cardClasses = [
    styles.familyMemberCard,
    finalIsDragging ? styles.dragging : '',
    isSelected ? styles.selected : '',
    isDeceased ? styles.deceased : styles.living,
    className
  ].filter(Boolean).join(' ');

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(member.id);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(member);
    }
  };

  const handleMemoriesClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewMemories) {
      onViewMemories(member.id);
    }
  };

  return (
    <div ref={dragPreview} style={{ opacity: finalIsDragging ? 0.5 : 1 }}>
      <Card
        ref={drag}
        variant="cultural"
        padding="none"
        className={cardClasses}
        onClick={handleCardClick}
        hoverable
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      {/* Drag handle */}
      <div 
        className={styles.dragHandle} 
        aria-label="Arrastrar tarjeta"
        style={{ cursor: finalIsDragging ? 'grabbing' : 'grab' }}
      >
        <div className={styles.dragDots}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      {/* Photo section with decorative frame */}
      <div className={styles.photoSection}>
        <div className={styles.photoFrame}>
          <div className={styles.frameDecoration}>
            {/* Marigold corner decorations */}
            <div className={styles.marigoldCorner + ' ' + styles.topLeft}></div>
            <div className={styles.marigoldCorner + ' ' + styles.topRight}></div>
            <div className={styles.marigoldCorner + ' ' + styles.bottomLeft}></div>
            <div className={styles.marigoldCorner + ' ' + styles.bottomRight}></div>
          </div>
          
          {primaryPhoto && !imageError ? (
            <img
              src={primaryPhoto}
              alt={`Foto de ${displayName}`}
              className={styles.photo}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={styles.photoPlaceholder}>
              <div className={styles.photoIcon}>👤</div>
            </div>
          )}
          
          {/* Deceased overlay */}
          {isDeceased && (
            <div className={styles.deceasedOverlay}>
              <div className={styles.candleLight}></div>
            </div>
          )}
        </div>
      </div>

      {/* Member information */}
      <div className={styles.memberInfo}>
        <h3 className={styles.memberName}>{displayName}</h3>
        <p className={styles.lifeSpan}>{getLifeSpan()}</p>
        
        {(isHovered || showDetails) && (
          <div className={styles.memberDetails}>
            {member.name !== displayName && (
              <p className={styles.fullName}>({member.name})</p>
            )}
            <p className={styles.birthDate}>
              Nacimiento: {formatDate(member.dateOfBirth)}
            </p>
            {member.dateOfDeath && (
              <p className={styles.deathDate}>
                Fallecimiento: {formatDate(member.dateOfDeath)}
              </p>
            )}
            {member.generation && (
              <p className={styles.generation}>
                Generación: {member.generation}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {(isHovered || showDetails) && (
        <div className={styles.actions}>
          {onEdit && (
            <button
              className={styles.actionButton}
              onClick={handleEditClick}
              aria-label={`Editar información de ${displayName}`}
            >
              ✏️
            </button>
          )}
          {onViewMemories && (
            <button
              className={styles.actionButton}
              onClick={handleMemoriesClick}
              aria-label={`Ver memorias de ${displayName}`}
            >
              📖
            </button>
          )}
        </div>
      )}

      {/* Cultural decorative elements */}
      <div className={styles.culturalElements}>
        <div className={styles.paperFlower + ' ' + styles.flower1}></div>
        <div className={styles.paperFlower + ' ' + styles.flower2}></div>
      </div>
      </Card>
    </div>
  );
};