import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Memory } from '../../types';
import { MemoryManager } from '../../services/MemoryManager';
import { ImageRepository } from '../../repositories/ImageRepository';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { Loading } from '../Loading/Loading';
import styles from './MemoryPhotoManager.module.css';

export interface MemoryPhotoManagerProps {
  memory: Memory;
  onPhotosUpdate: (memory: Memory, photoUrls: string[]) => void;
  onClose: () => void;
}

interface PhotoWithUrl {
  id: string;
  url: string;
  isLoading?: boolean;
}

export const MemoryPhotoManager: React.FC<MemoryPhotoManagerProps> = ({
  memory,
  onPhotosUpdate,
  onClose,
}) => {
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const memoryManager = useMemo(() => new MemoryManager(), []);
  const imageRepository = useMemo(() => new ImageRepository(), []);

  // Load existing photos
  useEffect(() => {
    const loadPhotos = async () => {
      setLoading(true);
      setError(null);

      try {
        const photoUrls: PhotoWithUrl[] = [];
        
        for (const photoId of memory.photos) {
          try {
            const url = await imageRepository.getAsDataUrl(photoId);
            if (url) {
              photoUrls.push({ id: photoId, url });
            }
          } catch (err) {
            console.warn(`Failed to load photo ${photoId}:`, err);
          }
        }

        setPhotos(photoUrls);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load photos');
      } finally {
        setLoading(false);
      }
    };

    loadPhotos();
  }, [memory.photos, imageRepository]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    handlePhotoUpload(Array.from(files));
  };

  const handlePhotoUpload = async (files: File[]) => {
    setUploading(true);
    setError(null);

    try {
      const uploadPromises = files.map(async (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not a valid image file`);
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} is too large. Maximum size is 5MB`);
        }

        // Add photo to memory
        const result = await memoryManager.addPhotoToMemory(memory.id, file);
        if (!result.success || !result.photoId) {
          throw new Error(result.errors?.join(', ') || `Failed to upload ${file.name}`);
        }

        // Get the uploaded photo URL
        const url = await imageRepository.getAsDataUrl(result.photoId);
        if (!url) {
          throw new Error(`Failed to load uploaded photo ${file.name}`);
        }

        return { id: result.photoId, url };
      });

      const uploadedPhotos = await Promise.all(uploadPromises);
      
      // Update local state
      setPhotos(prev => [...prev, ...uploadedPhotos]);
      
      // Update parent component
      const updatedMemory: Memory = {
        ...memory,
        photos: [...memory.photos, ...uploadedPhotos.map(p => p.id)],
        updatedAt: new Date()
      };
      
      const allPhotoUrls = [...photos.map(p => p.url), ...uploadedPhotos.map(p => p.url)];
      onPhotosUpdate(updatedMemory, allPhotoUrls);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photos');
    } finally {
      setUploading(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePhotoDelete = async (photoId: string, index: number) => {
    if (!confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await memoryManager.removePhotoFromMemory(memory.id, photoId);
      if (!result.success) {
        throw new Error(result.errors?.join(', ') || 'Failed to delete photo');
      }

      // Update local state
      const updatedPhotos = photos.filter(p => p.id !== photoId);
      setPhotos(updatedPhotos);
      
      // Close photo viewer if this photo was selected
      if (selectedPhotoIndex === index) {
        setSelectedPhotoIndex(null);
      } else if (selectedPhotoIndex !== null && selectedPhotoIndex > index) {
        setSelectedPhotoIndex(selectedPhotoIndex - 1);
      }

      // Update parent component
      const updatedMemory: Memory = {
        ...memory,
        photos: memory.photos.filter(id => id !== photoId),
        updatedAt: new Date()
      };
      
      onPhotosUpdate(updatedMemory, updatedPhotos.map(p => p.url));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete photo');
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    
    const files = Array.from(event.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      handlePhotoUpload(files);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (selectedPhotoIndex === null) return;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        setSelectedPhotoIndex(prev => 
          prev === null ? null : Math.max(0, prev - 1)
        );
        break;
      case 'ArrowRight':
        event.preventDefault();
        setSelectedPhotoIndex(prev => 
          prev === null ? null : Math.min(photos.length - 1, prev + 1)
        );
        break;
      case 'Escape':
        event.preventDefault();
        setSelectedPhotoIndex(null);
        break;
      case 'Delete':
        event.preventDefault();
        if (selectedPhotoIndex !== null && selectedPhotoIndex < photos.length) {
          const photo = photos[selectedPhotoIndex];
          if (photo) {
            handlePhotoDelete(photo.id, selectedPhotoIndex);
          }
        }
        break;
    }
  };

  return (
    <div className={styles.overlay} onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className={styles.modal}>
        <Card variant="elevated" padding="none" className={styles.modalCard || ''}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <h2 className={styles.title}>Manage Photos</h2>
              <Button
                variant="ghost"
                size="small"
                onClick={onClose}
                className={styles.closeButton}
                aria-label="Close"
              >
                ×
              </Button>
            </div>
            
            <div className={styles.memoryInfo}>
              <h3 className={styles.memoryTitle}>{memory.title}</h3>
              <p className={styles.photoCount}>
                {photos.length} photo{photos.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Upload Area */}
          <div className={styles.uploadSection}>
            <div
              className={`${styles.dropZone} ${uploading ? styles.uploading : ''}`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={openFileDialog}
            >
              <div className={styles.dropZoneContent}>
                {uploading ? (
                  <>
                    <Loading />
                    <p>Uploading photos...</p>
                  </>
                ) : (
                  <>
                    <div className={styles.uploadIcon}>📷</div>
                    <p className={styles.uploadText}>
                      Drag photos here or click to select
                    </p>
                    <p className={styles.uploadHint}>
                      Supports JPG, PNG, GIF up to 5MB each
                    </p>
                  </>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className={styles.hiddenInput}
              aria-label="Select photos to upload"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className={styles.error} role="alert">
              {error}
              <Button
                variant="ghost"
                size="small"
                onClick={() => setError(null)}
                className={styles.errorClose}
              >
                ×
              </Button>
            </div>
          )}

          {/* Photo Gallery */}
          <div className={styles.gallery}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <Loading />
              </div>
            ) : photos.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No photos yet</p>
                <p className={styles.emptyHint}>Upload some photos to get started</p>
              </div>
            ) : (
              <div className={styles.photoGrid}>
                {photos.map((photo, index) => (
                  <PhotoThumbnail
                    key={photo.id}
                    photo={photo}
                    index={index}
                    isSelected={selectedPhotoIndex === index}
                    onClick={() => setSelectedPhotoIndex(index)}
                    onDelete={() => handlePhotoDelete(photo.id, index)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <div className={styles.footerActions}>
              <Button
                variant="ghost"
                size="medium"
                onClick={onClose}
              >
                Done
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Photo Viewer */}
      {selectedPhotoIndex !== null && selectedPhotoIndex < photos.length && photos[selectedPhotoIndex] && (
        <PhotoViewer
          photo={photos[selectedPhotoIndex]}
          index={selectedPhotoIndex}
          total={photos.length}
          onClose={() => setSelectedPhotoIndex(null)}
          onPrevious={() => setSelectedPhotoIndex(Math.max(0, selectedPhotoIndex - 1))}
          onNext={() => setSelectedPhotoIndex(Math.min(photos.length - 1, selectedPhotoIndex + 1))}
          onDelete={() => {
            const photo = photos[selectedPhotoIndex];
            if (photo) {
              handlePhotoDelete(photo.id, selectedPhotoIndex);
            }
          }}
        />
      )}
    </div>
  );
};

// Photo Thumbnail Component
interface PhotoThumbnailProps {
  photo: PhotoWithUrl;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
}

const PhotoThumbnail: React.FC<PhotoThumbnailProps> = ({
  photo,
  index,
  isSelected,
  onClick,
  onDelete,
}) => {
  return (
    <div
      className={`${styles.thumbnail} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
    >
      <img
        src={photo.url}
        alt={`Photo ${index + 1}`}
        className={styles.thumbnailImage}
        loading="lazy"
      />
      
      <div className={styles.thumbnailOverlay}>
        <Button
          variant="ghost"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={styles.deleteButton}
          aria-label={`Delete photo ${index + 1}`}
        >
          🗑️
        </Button>
      </div>
      
      {isSelected && (
        <div className={styles.selectionIndicator}>
          ✓
        </div>
      )}
    </div>
  );
};

// Photo Viewer Component
interface PhotoViewerProps {
  photo: PhotoWithUrl;
  index: number;
  total: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onDelete: () => void;
}

const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photo,
  index,
  total,
  onClose,
  onPrevious,
  onNext,
  onDelete,
}) => {
  return (
    <div className={styles.photoViewer} onClick={onClose}>
      <div className={styles.photoViewerContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.photoViewerHeader}>
          <span className={styles.photoCounter}>
            {index + 1} of {total}
          </span>
          <div className={styles.photoViewerActions}>
            <Button
              variant="ghost"
              size="small"
              onClick={onDelete}
              className={styles.viewerDeleteButton}
              aria-label="Delete photo"
            >
              🗑️
            </Button>
            <Button
              variant="ghost"
              size="small"
              onClick={onClose}
              aria-label="Close viewer"
            >
              ×
            </Button>
          </div>
        </div>
        
        <div className={styles.photoContainer}>
          <img
            src={photo.url}
            alt={`Photo ${index + 1}`}
            className={styles.fullPhoto}
          />
        </div>
        
        <div className={styles.photoViewerControls}>
          <Button
            variant="ghost"
            size="medium"
            onClick={onPrevious}
            disabled={index === 0}
            aria-label="Previous photo"
          >
            ← Previous
          </Button>
          <Button
            variant="ghost"
            size="medium"
            onClick={onNext}
            disabled={index === total - 1}
            aria-label="Next photo"
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
};