import React from 'react';
import { Loading } from '../Loading/Loading';
import styles from './LoadingStates.module.css';

export interface LoadingStateProps {
  type: 'altar' | 'family-member' | 'memory' | 'decoration' | 'photo' | 'general';
  message?: string;
  progress?: number;
  culturalMessage?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

/**
 * Culturally appropriate loading messages for different operations
 */
const CULTURAL_MESSAGES = {
  altar: [
    'Preparando el altar sagrado...',
    'Encendiendo las velas del recuerdo...',
    'Colocando las flores de cempasúchil...',
    'Organizando las ofrendas familiares...'
  ],
  'family-member': [
    'Honrando la memoria familiar...',
    'Reuniendo los recuerdos queridos...',
    'Preparando el lugar en el altar...',
    'Invocando las memorias del corazón...'
  ],
  memory: [
    'Tejiendo los hilos de la memoria...',
    'Guardando las historias del alma...',
    'Preservando los momentos sagrados...',
    'Escribiendo en el libro de los recuerdos...'
  ],
  decoration: [
    'Adornando con tradición...',
    'Colocando los elementos sagrados...',
    'Preparando las decoraciones ancestrales...',
    'Embelleciendo el altar familiar...'
  ],
  photo: [
    'Revelando los rostros queridos...',
    'Capturando las sonrisas eternas...',
    'Procesando las imágenes del corazón...',
    'Guardando los momentos preciosos...'
  ],
  general: [
    'Un momento, por favor...',
    'Preparando la experiencia...',
    'Cargando contenido...',
    'Procesando información...'
  ]
};

export const LoadingState: React.FC<LoadingStateProps> = ({
  type,
  message,
  progress,
  culturalMessage = true,
  size = 'medium',
  className = ''
}) => {
  const getMessage = () => {
    if (message) return message;
    
    if (culturalMessage && CULTURAL_MESSAGES[type]) {
      const messages = CULTURAL_MESSAGES[type];
      return messages[Math.floor(Math.random() * messages.length)];
    }
    
    return 'Cargando...';
  };

  const loadingClasses = [
    styles.loadingState,
    styles[type],
    styles[size],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={loadingClasses} role="status" aria-live="polite">
      <div className={styles.loadingContent}>
        <Loading 
          variant="cultural" 
          size={size}
          text=""
        />
        
        <div className={styles.messageContainer}>
          <p className={styles.message} aria-label={getMessage()}>
            {getMessage()}
          </p>
          
          {progress !== undefined && (
            <div className={styles.progressContainer}>
              <div 
                className={styles.progressBar}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progreso: ${progress}%`}
              >
                <div 
                  className={styles.progressFill}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className={styles.progressText} aria-hidden="true">
                {progress}%
              </span>
            </div>
          )}
        </div>
        
        {/* Cultural decorative elements */}
        <div className={styles.culturalDecorations} aria-hidden="true">
          <div className={styles.marigoldPetal}></div>
          <div className={styles.marigoldPetal}></div>
          <div className={styles.marigoldPetal}></div>
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton loading component for content placeholders
 */
export interface SkeletonProps {
  type: 'family-card' | 'memory-item' | 'decoration' | 'altar-level' | 'text' | 'image';
  count?: number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  type,
  count = 1,
  className = ''
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'family-card':
        return (
          <div className={styles.skeletonFamilyCard}>
            <div className={styles.skeletonPhoto}></div>
            <div className={styles.skeletonContent}>
              <div className={styles.skeletonTitle}></div>
              <div className={styles.skeletonSubtitle}></div>
              <div className={styles.skeletonText}></div>
            </div>
          </div>
        );
      
      case 'memory-item':
        return (
          <div className={styles.skeletonMemoryItem}>
            <div className={styles.skeletonIcon}></div>
            <div className={styles.skeletonContent}>
              <div className={styles.skeletonTitle}></div>
              <div className={styles.skeletonText}></div>
              <div className={styles.skeletonText}></div>
            </div>
          </div>
        );
      
      case 'decoration':
        return (
          <div className={styles.skeletonDecoration}></div>
        );
      
      case 'altar-level':
        return (
          <div className={styles.skeletonAltarLevel}>
            <div className={styles.skeletonLevelHeader}></div>
            <div className={styles.skeletonLevelContent}>
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className={styles.skeletonFamilyCard}>
                  <div className={styles.skeletonPhoto}></div>
                  <div className={styles.skeletonContent}>
                    <div className={styles.skeletonTitle}></div>
                    <div className={styles.skeletonSubtitle}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div className={styles.skeletonText}></div>
        );
      
      case 'image':
        return (
          <div className={styles.skeletonImage}></div>
        );
      
      default:
        return (
          <div className={styles.skeletonGeneric}></div>
        );
    }
  };

  const skeletonClasses = [
    styles.skeleton,
    styles[type],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={skeletonClasses} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.skeletonItem}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
};

/**
 * Inline loading indicator for buttons and small actions
 */
export interface InlineLoadingProps {
  size?: 'small' | 'medium';
  message?: string;
  className?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  size = 'small',
  message = 'Cargando...',
  className = ''
}) => {
  const inlineClasses = [
    styles.inlineLoading,
    styles[size],
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={inlineClasses} role="status" aria-label={message}>
      <span className={styles.inlineSpinner} aria-hidden="true"></span>
      {message && (
        <span className={styles.inlineMessage}>{message}</span>
      )}
    </span>
  );
};

/**
 * Loading overlay for full-screen operations
 */
export interface LoadingOverlayProps {
  isVisible: boolean;
  type?: LoadingStateProps['type'];
  message?: string;
  progress?: number;
  onCancel?: () => void;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  type = 'general',
  message,
  progress,
  onCancel,
  className = ''
}) => {
  if (!isVisible) return null;

  const overlayClasses = [
    styles.loadingOverlay,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={overlayClasses} role="dialog" aria-modal="true" aria-label="Cargando">
      <div className={styles.overlayBackdrop} onClick={onCancel} />
      <div className={styles.overlayContent}>
        <LoadingState
          type={type}
          message={message}
          progress={progress}
          size="large"
        />
        
        {onCancel && (
          <button
            className={styles.cancelButton}
            onClick={onCancel}
            aria-label="Cancelar operación"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
};