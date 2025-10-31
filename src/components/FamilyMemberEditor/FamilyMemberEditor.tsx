import React, { useState } from 'react';
import { FamilyMember } from '../../types';
import { FamilyMemberForm } from '../FamilyMemberForm';
import { FamilyMemberPhotoManager } from '../FamilyMemberPhotoManager';
import { Button } from '../Button';
import styles from './FamilyMemberEditor.module.css';

export interface FamilyMemberEditorProps {
  member: FamilyMember;
  isOpen: boolean;
  onSave: (updatedMember: FamilyMember) => void;
  onCancel: () => void;
  onDelete?: () => void;
  className?: string;
}

type EditorMode = 'details' | 'photos';

export const FamilyMemberEditor: React.FC<FamilyMemberEditorProps> = ({
  member,
  isOpen,
  onSave,
  onCancel,
  onDelete,
  className = '',
}) => {
  const [mode, setMode] = useState<EditorMode>('details');
  const [currentMember, setCurrentMember] = useState<FamilyMember>(member);

  const handleMemberUpdate = (updatedMember: FamilyMember) => {
    setCurrentMember(updatedMember);
    onSave(updatedMember);
  };

  const handlePhotosUpdated = (updatedMember: FamilyMember) => {
    setCurrentMember(updatedMember);
    // Don't call onSave here as photo updates are handled automatically
  };

  const editorClasses = [
    styles.familyMemberEditor,
    className
  ].filter(Boolean).join(' ');

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={editorClasses} onClick={(e) => e.stopPropagation()}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          Editar: {currentMember.preferredName || currentMember.name}
        </h3>
        
        <div className={styles.headerActions}>
          <div className={styles.modeSelector}>
            <button
              type="button"
              className={`${styles.modeButton} ${mode === 'details' ? styles.active : ''}`}
              onClick={() => setMode('details')}
            >
              📝 Detalles
            </button>
            <button
              type="button"
              className={`${styles.modeButton} ${mode === 'photos' ? styles.active : ''}`}
              onClick={() => setMode('photos')}
            >
              📷 Fotos ({currentMember.photos.length})
            </button>
          </div>
          
          <div className={styles.actionButtons}>
            {onDelete && (
              <Button
                variant="secondary"
                size="small"
                onClick={onDelete}
                aria-label="Eliminar miembro de familia"
                style={{ backgroundColor: '#e74c3c', borderColor: '#c0392b' }}
              >
                🗑️
              </Button>
            )}
            <Button
              variant="ghost"
              size="small"
              onClick={onCancel}
              aria-label="Cerrar editor"
            >
              ✕
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {mode === 'details' ? (
          <FamilyMemberForm
            mode="edit"
            initialData={currentMember}
            onSubmit={handleMemberUpdate}
            onCancel={onCancel}
          />
        ) : (
          <div className={styles.photoSection}>
            <FamilyMemberPhotoManager
              member={currentMember}
              onPhotosUpdated={handlePhotosUpdated}
            />
            
            <div className={styles.photoActions}>
              <Button
                variant="ghost"
                onClick={onCancel}
              >
                Cerrar Editor
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};