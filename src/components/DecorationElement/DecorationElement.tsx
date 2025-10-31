import React, { useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { DecorationElement as DecorationData, DecorationSize } from '../../types';
import { ItemTypes, DraggedDecoration } from '../../contexts/DragDropContext';
import styles from './DecorationElement.module.css';

export interface DecorationElementProps {
  decoration: DecorationData;
  isDragging?: boolean;
  isSelected?: boolean;
  onMove?: (decorationId: string, newPosition: { x: number; y: number; level: number }) => void;
  onResize?: (newSize: DecorationSize) => void;
  onRotate?: (newRotation: number) => void;
  onSelect?: (decorationId: string) => void;
  onDelete?: (decorationId: string) => void;
  onDragStart?: (decoration: DecorationData) => void;
  onDragEnd?: (decoration: DecorationData) => void;
  className?: string;
}

export const DecorationElement: React.FC<DecorationElementProps> = ({
  decoration,
  isDragging: externalIsDragging = false,
  isSelected = false,
  onMove: _onMove,
  onResize,
  onRotate,
  onSelect,
  onDelete,
  onDragStart,
  onDragEnd,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Set up drag functionality
  const [{ isDragging }, drag, dragPreview] = useDrag<
    DraggedDecoration,
    any,
    { isDragging: boolean }
  >({
    type: ItemTypes.DECORATION,
    item: () => {
      const dragItem: DraggedDecoration = {
        type: ItemTypes.DECORATION,
        decoration,
        sourcePosition: decoration.position,
      };
      
      if (onDragStart) {
        onDragStart(decoration);
      }
      
      return dragItem;
    },
    end: (_item, _monitor) => {
      if (onDragEnd) {
        onDragEnd(decoration);
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

  const finalIsDragging = isDragging || externalIsDragging;
  
  const decorationClasses = [
    styles.decorationElement,
    styles[decoration.type],
    styles[decoration.size || 'medium'],
    finalIsDragging ? styles.dragging : '',
    isSelected ? styles.selected : '',
    className
  ].filter(Boolean).join(' ');

  const handleClick = () => {
    if (onSelect) {
      onSelect(decoration.id);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(decoration.id);
    }
  };

  const renderDecorationSVG = () => {
    const size = decoration.size || 'medium';
    switch (decoration.type) {
      case 'cempasuchil':
        return <CempasuchilSVG size={size} />;
      case 'papel-picado':
        return <PapelPicadoSVG size={size} />;
      case 'salt-cross':
        return <SaltCrossSVG size={size} />;
      case 'candle':
        return <CandleSVG size={size} />;
      case 'offering':
        return <OfferingSVG size={size} />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={drag}
      className={decorationClasses}
      style={{
        transform: `rotate(${decoration.rotation}deg)`,
        left: decoration.position.x,
        top: decoration.position.y,
        opacity: finalIsDragging ? 0.5 : 1,
        cursor: finalIsDragging ? 'grabbing' : 'grab',
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Decoration SVG */}
      <div className={styles.decorationSvg}>
        {renderDecorationSVG()}
      </div>

      {/* Controls (visible on hover or selection) */}
      {(isHovered || isSelected) && (
        <div className={styles.controls}>
          {/* Drag handle */}
          <div 
            className={styles.dragHandle} 
            aria-label="Arrastrar decoración"
            style={{ cursor: finalIsDragging ? 'grabbing' : 'grab' }}
          >
            <div className={styles.dragIcon}>⋮⋮</div>
          </div>

          {/* Size controls */}
          {onResize && (
            <div className={styles.sizeControls}>
              <button
                className={styles.sizeButton}
                onClick={(e) => {
                  e.stopPropagation();
                  const sizes: DecorationSize[] = ['small', 'medium', 'large'];
                  const currentIndex = sizes.indexOf(decoration.size || 'medium');
                  const nextSize = sizes[(currentIndex + 1) % sizes.length];
                  if (nextSize) {
                    onResize(nextSize);
                  }
                }}
                aria-label="Cambiar tamaño"
              >
                📏
              </button>
            </div>
          )}

          {/* Rotation controls */}
          {onRotate && (
            <div className={styles.rotationControls}>
              <button
                className={styles.rotateButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onRotate((decoration.rotation + 45) % 360);
                }}
                aria-label="Rotar decoración"
              >
                🔄
              </button>
            </div>
          )}

          {/* Delete button */}
          {onDelete && (
            <button
              className={styles.deleteButton}
              onClick={handleDeleteClick}
              aria-label="Eliminar decoración"
            >
              🗑️
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// SVG Components for each decoration type
const CempasuchilSVG: React.FC<{ size: DecorationSize }> = ({ size }) => {
  const sizeMap = { small: 24, medium: 36, large: 48 };
  const svgSize = sizeMap[size];

  return (
    <svg width={svgSize} height={svgSize} viewBox="0 0 48 48" className={styles.cempasuchilSvg}>
      {/* Marigold petals */}
      <g>
        {/* Outer petals */}
        <ellipse cx="24" cy="12" rx="8" ry="4" fill="#FF6B35" transform="rotate(0 24 24)" />
        <ellipse cx="24" cy="12" rx="8" ry="4" fill="#FF6B35" transform="rotate(45 24 24)" />
        <ellipse cx="24" cy="12" rx="8" ry="4" fill="#FF6B35" transform="rotate(90 24 24)" />
        <ellipse cx="24" cy="12" rx="8" ry="4" fill="#FF6B35" transform="rotate(135 24 24)" />
        <ellipse cx="24" cy="12" rx="8" ry="4" fill="#FF6B35" transform="rotate(180 24 24)" />
        <ellipse cx="24" cy="12" rx="8" ry="4" fill="#FF6B35" transform="rotate(225 24 24)" />
        <ellipse cx="24" cy="12" rx="8" ry="4" fill="#FF6B35" transform="rotate(270 24 24)" />
        <ellipse cx="24" cy="12" rx="8" ry="4" fill="#FF6B35" transform="rotate(315 24 24)" />
        
        {/* Inner petals */}
        <ellipse cx="24" cy="16" rx="6" ry="3" fill="#F1C40F" transform="rotate(22.5 24 24)" />
        <ellipse cx="24" cy="16" rx="6" ry="3" fill="#F1C40F" transform="rotate(67.5 24 24)" />
        <ellipse cx="24" cy="16" rx="6" ry="3" fill="#F1C40F" transform="rotate(112.5 24 24)" />
        <ellipse cx="24" cy="16" rx="6" ry="3" fill="#F1C40F" transform="rotate(157.5 24 24)" />
        <ellipse cx="24" cy="16" rx="6" ry="3" fill="#F1C40F" transform="rotate(202.5 24 24)" />
        <ellipse cx="24" cy="16" rx="6" ry="3" fill="#F1C40F" transform="rotate(247.5 24 24)" />
        <ellipse cx="24" cy="16" rx="6" ry="3" fill="#F1C40F" transform="rotate(292.5 24 24)" />
        <ellipse cx="24" cy="16" rx="6" ry="3" fill="#F1C40F" transform="rotate(337.5 24 24)" />
        
        {/* Center */}
        <circle cx="24" cy="24" r="4" fill="#8E44AD" />
      </g>
    </svg>
  );
};

const PapelPicadoSVG: React.FC<{ size: DecorationSize }> = ({ size }) => {
  const sizeMap = { small: 32, medium: 48, large: 64 };
  const svgSize = sizeMap[size];

  return (
    <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" className={styles.papelPicadoSvg}>
      {/* Papel picado banner */}
      <rect x="8" y="16" width="48" height="32" fill="#8E44AD" rx="2" />
      
      {/* Decorative cuts */}
      <path d="M16 20 L20 24 L16 28 L20 32 L16 36 L12 32 L16 28 L12 24 Z" fill="#2C3E50" />
      <path d="M48 20 L52 24 L48 28 L52 32 L48 36 L44 32 L48 28 L44 24 Z" fill="#2C3E50" />
      <circle cx="32" cy="32" r="6" fill="#2C3E50" />
      <path d="M24 24 L28 28 L24 32 L28 36 L24 40 L20 36 L24 32 L20 28 Z" fill="#2C3E50" />
      <path d="M40 24 L44 28 L40 32 L44 36 L40 40 L36 36 L40 32 L36 28 Z" fill="#2C3E50" />
      
      {/* String */}
      <line x1="32" y1="8" x2="32" y2="16" stroke="#F1C40F" strokeWidth="2" />
      
      {/* Bottom fringe */}
      <path d="M12 48 L16 52 L20 48 L24 52 L28 48 L32 52 L36 48 L40 52 L44 48 L48 52 L52 48" 
            stroke="#8E44AD" strokeWidth="2" fill="none" />
    </svg>
  );
};

const SaltCrossSVG: React.FC<{ size: DecorationSize }> = ({ size }) => {
  const sizeMap = { small: 20, medium: 30, large: 40 };
  const svgSize = sizeMap[size];

  return (
    <svg width={svgSize} height={svgSize} viewBox="0 0 40 40" className={styles.saltCrossSvg}>
      {/* Salt cross */}
      <rect x="18" y="8" width="4" height="24" fill="#FDF2E9" rx="1" />
      <rect x="8" y="18" width="24" height="4" fill="#FDF2E9" rx="1" />
      
      {/* Salt texture */}
      <circle cx="16" cy="12" r="0.5" fill="#E8E8E8" />
      <circle cx="24" cy="14" r="0.5" fill="#E8E8E8" />
      <circle cx="20" cy="16" r="0.5" fill="#E8E8E8" />
      <circle cx="18" cy="20" r="0.5" fill="#E8E8E8" />
      <circle cx="22" cy="22" r="0.5" fill="#E8E8E8" />
      <circle cx="16" cy="26" r="0.5" fill="#E8E8E8" />
      <circle cx="24" cy="28" r="0.5" fill="#E8E8E8" />
      <circle cx="12" cy="20" r="0.5" fill="#E8E8E8" />
      <circle cx="28" cy="20" r="0.5" fill="#E8E8E8" />
    </svg>
  );
};

const CandleSVG: React.FC<{ size: DecorationSize }> = ({ size }) => {
  const sizeMap = { small: 16, medium: 24, large: 32 };
  const svgSize = sizeMap[size];

  return (
    <svg width={svgSize} height={svgSize} viewBox="0 0 32 32" className={styles.candleSvg}>
      {/* Candle body */}
      <rect x="12" y="16" width="8" height="12" fill="#FDF2E9" rx="1" />
      
      {/* Wax drips */}
      <ellipse cx="11" cy="20" rx="1" ry="2" fill="#FDF2E9" />
      <ellipse cx="21" cy="22" rx="1" ry="1.5" fill="#FDF2E9" />
      
      {/* Flame */}
      <ellipse cx="16" cy="14" rx="2" ry="4" fill="#F1C40F" />
      <ellipse cx="16" cy="13" rx="1.5" ry="3" fill="#FF6B35" />
      
      {/* Wick */}
      <line x1="16" y1="16" x2="16" y2="18" stroke="#2C3E50" strokeWidth="1" />
      
      {/* Glow effect */}
      <circle cx="16" cy="14" r="6" fill="url(#candleGlow)" opacity="0.3" />
      
      <defs>
        <radialGradient id="candleGlow">
          <stop offset="0%" stopColor="#F1C40F" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
    </svg>
  );
};

const OfferingSVG: React.FC<{ size: DecorationSize }> = ({ size }) => {
  const sizeMap = { small: 24, medium: 36, large: 48 };
  const svgSize = sizeMap[size];

  return (
    <svg width={svgSize} height={svgSize} viewBox="0 0 48 48" className={styles.offeringSvg}>
      {/* Plate */}
      <ellipse cx="24" cy="36" rx="16" ry="4" fill="#BDC3C7" />
      <ellipse cx="24" cy="34" rx="16" ry="4" fill="#ECF0F1" />
      
      {/* Bread (pan de muerto) */}
      <circle cx="24" cy="28" r="8" fill="#D4AC0D" />
      <circle cx="24" cy="26" r="8" fill="#F1C40F" />
      
      {/* Cross decoration on bread */}
      <rect x="22" y="20" width="4" height="12" fill="#D4AC0D" rx="1" />
      <rect x="18" y="24" width="12" height="4" fill="#D4AC0D" rx="1" />
      
      {/* Bone decorations */}
      <ellipse cx="20" cy="22" rx="2" ry="1" fill="#D4AC0D" />
      <ellipse cx="28" cy="22" rx="2" ry="1" fill="#D4AC0D" />
      <ellipse cx="20" cy="30" rx="2" ry="1" fill="#D4AC0D" />
      <ellipse cx="28" cy="30" rx="2" ry="1" fill="#D4AC0D" />
      
      {/* Fruits */}
      <circle cx="16" cy="30" r="3" fill="#FF6B35" />
      <circle cx="32" cy="30" r="3" fill="#8E44AD" />
      <circle cx="24" cy="18" r="2" fill="#F1C40F" />
    </svg>
  );
};