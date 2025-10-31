import React, { useState, useEffect } from 'react';
import { FamilyMember } from '../../types';
import { FamilyTreeManager } from '../../services/FamilyTreeManager';

import styles from './FamilyMemberPhotoManager.module.css';

export interface FamilyMemberPhotoManagerProps {
  member: FamilyMember;
  onPhotosUpdated: (updatedMember: FamilyMember) => void;
  className?: string;
}

interface PhotoItem {
  id: string;
  url: string;
  isLoading?: boolean;
}

export const FamilyMemberPhotoManager: React.FC<FamilyMemberPhotoManagerProps> = ({
  member,
  onPhotosUpdated,
  className = '',
}) => {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  const familyTreeManager = new FamilyTreeManager();

  // Load photos on component mount
  useEffect(() => {
    loadPhotos();
  }, [member.id]);

  const loadPhotos = async () => {
    setIsLoading(true);
    try {
      const { photoUrls } = await familyTreeManager.getFamilyMemberWithPhotos(member.id);
      const photoItems: PhotoItem[] = member.photos.map((photoId, index) => ({
        id: photoId,
        url: photoUrls[index] || '',
      }));
      setPhotos(photoItems);
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePhoto = async (photoId: string, index: number) => {
    // Optimistically update UI
    setPhotos(prev => prev.map((photo, i) => 
      i === index ? { ...photo, isLoading: true } : photo
    ));

    try {
      const result = await familyTreeManager.removeMemberPhoto(member.id, photoId);
      
      if (result.success) {
        // Remove from local state
        setPhotos(prev => prev.filter((_, i) => i !== index));
        
        // Get updated member and notify parent
        const { member: updatedMember } = await familyTreeManager.getFamilyMemberWithPhotos(member.id);
        if (updatedMember) {
          onPhotosUpdated(updatedMember);
        }
      } else {
        console.error('Failed to remove photo:', result.errors);
        // Revert optimistic update
        setPhotos(prev => prev.map((photo, i) => 
          i === index ? { ...photo, isLoading: false } : photo
        ));
      }
    } catch (error) {
      console.error('Error removing photo:', error);
      // Revert optimistic update
      setPhotos(prev => prev.map((photo, i) => 
        i === index ? { ...photo, isLoading: false } : photo
      ));
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder photos array
    const newPhotos = [...photos];
    const draggedPhoto = newPhotos[draggedIndex];
    if (!draggedPhoto) return;
    
    newPhotos.splice(draggedIndex, 1);
    newPhotos.splice(dropIndex, 0, draggedPhoto);
    
    // Update local state optimistically
    setPhotos(newPhotos);
    setDraggedIndex(null);
    setDragOverIndex(null);

    try {
      // Update photo order in backend
      const newPhotoIds = newPhotos.map(photo => photo.id);
      const result = await familyTreeManager.reorderMemberPhotos(member.id, newPhotoIds);
      
      if (result.success) {
        // Get updated member and notify parent
        const { member: updatedMember } = await familyTreeManager.getFamilyMemberWithPhotos(member.id);
        if (updatedMember) {
          onPhotosUpdated(updatedMember);
        }
      } else {
        console.error('Failed to reorder photos:', result.errors);
        // Revert to original order
        await loadPhotos();
      }
    } catch (error) {
      console.error('Error reordering photos:', error);
      // Revert to original order
      await loadPhotos();
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (isLoading) {
    return (
      <div className={`${styles.photoManager} ${className}`}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <span>Cargando fotos...</span>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className={`${styles.photoManager} ${className}`}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📷</div>
          <p>No hay fotos para este miembro de la familia</p>
          <p className={styles.emptyHint}>
            Usa el formulario de edición para agregar fotos
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.photoManager} ${className}`}>
      <div className={styles.header}>
        <h4 className={styles.title}>
          Fotos de {member.preferredName || member.name}
        </h4>
        <p className={styles.subtitle}>
          Arrastra para reordenar • {photos.length} foto{photos.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className={styles.photoGrid}>
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className={`${styles.photoItem} ${
              draggedIndex === index ? styles.dragging : ''
            } ${
              dragOverIndex === index ? styles.dragOver : ''
            }`}
            draggable={!photo.isLoading}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <div className={styles.photoContainer}>
              <img
                src={photo.url}
                alt={`Foto ${index + 1} de ${member.name}`}
                className={styles.photo}
              />
              
              {/* Photo overlay with controls */}
              <div className={styles.photoOverlay}>
                <div className={styles.photoControls}>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => handleRemovePhoto(photo.id, index)}
                    disabled={photo.isLoading}
                    aria-label={`Eliminar foto ${index + 1}`}
                  >
                    {photo.isLoading ? '⏳' : '🗑️'}
                  </button>
                </div>
                
                <div className={styles.photoIndex}>
                  {index + 1}
                </div>
              </div>

              {/* Drag handle */}
              <div className={styles.dragHandle} aria-label="Arrastrar para reordenar">
                <div className={styles.dragDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <p className={styles.footerText}>
          💡 La primera foto se usa como foto principal en la tarjeta del altar
        </p>
      </div>
    </div>
  );
};