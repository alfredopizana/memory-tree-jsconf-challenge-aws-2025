import React, { useState, useRef } from 'react';
import { FamilyMember } from '../../types';
import { FamilyTreeManager } from '../../services/FamilyTreeManager';
import { Input } from '../Input';
import { Button } from '../Button';
import styles from './FamilyMemberForm.module.css';

export interface FamilyMemberFormProps {
  onSubmit: (member: FamilyMember) => void;
  onCancel: () => void;
  initialData?: Partial<FamilyMember>;
  mode?: 'create' | 'edit';
  className?: string;
}

interface FormData {
  name: string;
  preferredName: string;
  dateOfBirth: string;
  dateOfDeath: string;
  generation: string;
  altarLevel: string;
}

interface FormErrors {
  name?: string;
  dateOfBirth?: string;
  dateOfDeath?: string;
  generation?: string;
  altarLevel?: string;
  photos?: string;
  general?: string;
}

export const FamilyMemberForm: React.FC<FamilyMemberFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  mode = 'create',
  className = '',
}) => {
  const getInitialFormData = (): FormData => {
    return {
      name: (initialData?.name ?? '') as string,
      preferredName: (initialData?.preferredName ?? '') as string,
      dateOfBirth: (initialData?.dateOfBirth ? 
        initialData.dateOfBirth.toISOString().split('T')[0] : '') as string,
      dateOfDeath: (initialData?.dateOfDeath ? 
        initialData.dateOfDeath.toISOString().split('T')[0] : '') as string,
      generation: initialData?.generation ? String(initialData.generation) : '',
      altarLevel: initialData?.altarPosition?.level ? String(initialData.altarPosition.level) : '1',
    };
  };

  const [formData, setFormData] = useState<FormData>(getInitialFormData());

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const familyTreeManager = new FamilyTreeManager();

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    // Clear field-specific error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof FormErrors];
        return newErrors;
      });
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types and sizes
    const validFiles: File[] = [];
    const newErrors: string[] = [];
    
    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        newErrors.push(`${file.name} no es un archivo de imagen válido`);
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        newErrors.push(`${file.name} es demasiado grande (máximo 5MB)`);
        return;
      }
      
      validFiles.push(file);
    });

    if (newErrors.length > 0) {
      setErrors(prev => ({
        ...prev,
        photos: newErrors.join(', ')
      }));
      return;
    }

    // Update selected photos
    setSelectedPhotos(prev => [...prev, ...validFiles]);
    
    // Create preview URLs
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPhotoPreviewUrls(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Clear photo errors
    if (errors.photos) {
      setErrors(prev => {
        const { photos, ...rest } = prev;
        return rest;
      });
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }

    // Date of birth validation
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'La fecha de nacimiento es obligatoria';
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      if (isNaN(birthDate.getTime())) {
        newErrors.dateOfBirth = 'Fecha de nacimiento inválida';
      } else if (birthDate > new Date()) {
        newErrors.dateOfBirth = 'La fecha de nacimiento no puede ser futura';
      }
    }

    // Date of death validation
    if (formData.dateOfDeath) {
      const deathDate = new Date(formData.dateOfDeath);
      const birthDate = new Date(formData.dateOfBirth);
      
      if (isNaN(deathDate.getTime())) {
        newErrors.dateOfDeath = 'Fecha de fallecimiento inválida';
      } else if (deathDate > new Date()) {
        newErrors.dateOfDeath = 'La fecha de fallecimiento no puede ser futura';
      } else if (formData.dateOfBirth && deathDate <= birthDate) {
        newErrors.dateOfDeath = 'La fecha de fallecimiento debe ser posterior al nacimiento';
      }
    }

    // Generation validation
    if (formData.generation) {
      const generation = parseInt(formData.generation);
      if (isNaN(generation) || generation < 0) {
        newErrors.generation = 'La generación debe ser un número positivo';
      }
    }

    // Altar level validation
    if (formData.altarLevel) {
      const level = parseInt(formData.altarLevel);
      if (isNaN(level) || level < 0) {
        newErrors.altarLevel = 'El nivel del altar debe ser un número positivo';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const memberData: {
        name: string;
        preferredName?: string;
        dateOfBirth: Date;
        dateOfDeath?: Date;
        generation?: number;
        altarLevel?: number;
      } = {
        name: formData.name.trim(),
        dateOfBirth: new Date(formData.dateOfBirth),
      };

      if (formData.preferredName.trim()) {
        memberData.preferredName = formData.preferredName.trim();
      }
      if (formData.dateOfDeath) {
        memberData.dateOfDeath = new Date(formData.dateOfDeath);
      }
      if (formData.generation) {
        memberData.generation = parseInt(formData.generation);
      }
      if (formData.altarLevel) {
        memberData.altarLevel = parseInt(formData.altarLevel);
      }

      if (mode === 'create') {
        const result = await familyTreeManager.createFamilyMember(memberData);
        
        if (!result.success) {
          setErrors({ general: result.errors?.join(', ') || 'Error al crear el miembro de la familia' });
          return;
        }

        // Upload photos if any were selected
        if (selectedPhotos.length > 0 && result.memberId) {
          for (const photo of selectedPhotos) {
            const uploadResult = await familyTreeManager.uploadMemberPhoto(result.memberId, photo);
            if (!uploadResult.success) {
              console.warn('Failed to upload photo:', uploadResult.errors);
            }
          }
        }

        // Get the created member with photos
        const { member } = await familyTreeManager.getFamilyMemberWithPhotos(result.memberId!);
        if (member) {
          onSubmit(member);
        }
      } else {
        // Edit mode
        if (!initialData?.id) {
          setErrors({ general: 'ID del miembro requerido para editar' });
          return;
        }

        const updateData: Partial<{
          name: string;
          preferredName: string;
          dateOfBirth: Date;
          dateOfDeath: Date;
          generation: number;
        }> = {
          name: memberData.name,
          dateOfBirth: memberData.dateOfBirth,
        };

        if (memberData.preferredName) {
          updateData.preferredName = memberData.preferredName;
        }
        if (memberData.dateOfDeath) {
          updateData.dateOfDeath = memberData.dateOfDeath;
        }
        if (memberData.generation) {
          updateData.generation = memberData.generation;
        }

        const updateResult = await familyTreeManager.updateFamilyMember(initialData.id, updateData);

        if (!updateResult.success) {
          setErrors({ general: updateResult.errors?.join(', ') || 'Error al actualizar el miembro de la familia' });
          return;
        }

        // Upload new photos if any were selected
        if (selectedPhotos.length > 0) {
          for (const photo of selectedPhotos) {
            const uploadResult = await familyTreeManager.uploadMemberPhoto(initialData.id, photo);
            if (!uploadResult.success) {
              console.warn('Failed to upload photo:', uploadResult.errors);
            }
          }
        }

        // Get the updated member with photos
        const { member } = await familyTreeManager.getFamilyMemberWithPhotos(initialData.id);
        if (member) {
          onSubmit(member);
        }
      }

    } catch (error) {
      setErrors({ 
        general: error instanceof Error ? error.message : 'Error inesperado al procesar el formulario' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formClasses = [
    styles.familyMemberForm,
    className
  ].filter(Boolean).join(' ');

  return (
    <form className={formClasses} onSubmit={handleSubmit}>
      <div className={styles.formHeader}>
        <h3 className={styles.formTitle}>
          {mode === 'create' ? 'Agregar Miembro de la Familia' : 'Editar Miembro de la Familia'}
        </h3>
      </div>

      {errors.general && (
        <div className={styles.generalError} role="alert">
          {errors.general}
        </div>
      )}

      <div className={styles.formGrid}>
        <div className={styles.formRow}>
          <Input
            label="Nombre completo *"
            value={formData.name}
            onChange={handleInputChange('name')}
            {...(errors.name && { error: errors.name })}
            placeholder="Ej: María Elena González"
            required
          />
        </div>

        <div className={styles.formRow}>
          <Input
            label="Nombre preferido"
            value={formData.preferredName}
            onChange={handleInputChange('preferredName')}
            placeholder="Ej: Lena, Abuela María"
            helperText="Nombre por el que se le conoce comúnmente"
          />
        </div>

        <div className={styles.formRow}>
          <Input
            type="date"
            label="Fecha de nacimiento *"
            value={formData.dateOfBirth}
            onChange={handleInputChange('dateOfBirth')}
            {...(errors.dateOfBirth && { error: errors.dateOfBirth })}
            required
          />
        </div>

        <div className={styles.formRow}>
          <Input
            type="date"
            label="Fecha de fallecimiento"
            value={formData.dateOfDeath}
            onChange={handleInputChange('dateOfDeath')}
            {...(errors.dateOfDeath && { error: errors.dateOfDeath })}
            helperText="Dejar vacío si la persona aún vive"
          />
        </div>

        <div className={styles.formRow}>
          <Input
            type="number"
            label="Generación"
            value={formData.generation}
            onChange={handleInputChange('generation')}
            {...(errors.generation && { error: errors.generation })}
            placeholder="Ej: 1, 2, 3"
            helperText="1=Padres, 2=Abuelos, 3=Bisabuelos, etc."
            min="0"
          />
        </div>

        <div className={styles.formRow}>
          <Input
            type="number"
            label="Nivel del altar"
            value={formData.altarLevel}
            onChange={handleInputChange('altarLevel')}
            {...(errors.altarLevel && { error: errors.altarLevel })}
            placeholder="0, 1, 2"
            helperText="0=Cielo, 1=Tierra, 2=Inframundo"
            min="0"
            max="2"
          />
        </div>
      </div>

      {/* Photo upload section */}
      <div className={styles.photoSection}>
        <label className={styles.photoLabel}>
          Fotografías
        </label>
        
        <div className={styles.photoUpload}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className={styles.hiddenFileInput}
          />
          
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
          >
            📷 Seleccionar Fotos
          </Button>
          
          {errors.photos && (
            <span className={styles.errorText} role="alert">
              {errors.photos}
            </span>
          )}
        </div>

        {/* Photo previews */}
        {photoPreviewUrls.length > 0 && (
          <div className={styles.photoPreview}>
            {photoPreviewUrls.map((url, index) => (
              <div key={index} className={styles.photoPreviewItem}>
                <img
                  src={url}
                  alt={`Vista previa ${index + 1}`}
                  className={styles.previewImage}
                />
                <button
                  type="button"
                  className={styles.removePhotoButton}
                  onClick={() => removePhoto(index)}
                  aria-label={`Eliminar foto ${index + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form actions */}
      <div className={styles.formActions}>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Guardando...' : (mode === 'create' ? 'Crear Miembro' : 'Guardar Cambios')}
        </Button>
      </div>
    </form>
  );
};