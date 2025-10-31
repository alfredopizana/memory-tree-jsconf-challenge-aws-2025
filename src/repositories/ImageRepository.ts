import { db, ImageBlob } from './database';
import { BaseRepository, NotFoundError, ValidationError } from './BaseRepository';
import { generateId } from '../utils';

/**
 * Repository for managing image blob storage and retrieval
 * Handles photo uploads, storage, and cleanup
 * Requirements: 1.4, 1.5, 4.1, 4.4
 */
export class ImageRepository implements BaseRepository<ImageBlob> {

  /**
   * Store a new image blob
   */
  async create(imageData: Omit<ImageBlob, 'id' | 'uploadedAt'>): Promise<string> {
    this.validateImageData(imageData);
    
    const image: ImageBlob = {
      ...imageData,
      id: generateId(),
      uploadedAt: new Date()
    };

    await db.images.add(image);
    return image.id;
  }

  /**
   * Get image blob by ID
   */
  async getById(id: string): Promise<ImageBlob | undefined> {
    return await db.images.get(id);
  }

  /**
   * Get all image records (without blob data for performance)
   */
  async getAll(): Promise<ImageBlob[]> {
    return await db.images.toArray();
  }

  /**
   * Update image metadata (not the blob itself)
   */
  async update(id: string, updates: Partial<ImageBlob>): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new NotFoundError('Image', id);
    }

    // Only allow updating filename and mimeType, not the blob
    const allowedUpdates: Partial<ImageBlob> = {};
    if (updates.filename !== undefined) {
      allowedUpdates.filename = updates.filename;
    }
    if (updates.mimeType !== undefined) {
      allowedUpdates.mimeType = updates.mimeType;
    }

    await db.images.update(id, allowedUpdates);
    return true;
  }

  /**
   * Delete image blob
   */
  async delete(id: string): Promise<boolean> {
    try {
      await db.images.delete(id);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if image exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await db.images.where('id').equals(id).count();
    return count > 0;
  }

  /**
   * Get count of stored images
   */
  async count(): Promise<number> {
    return await db.images.count();
  }

  /**
   * Upload image from File object
   */
  async uploadFile(file: File): Promise<string> {
    this.validateFile(file);

    const imageData: Omit<ImageBlob, 'id' | 'uploadedAt'> = {
      blob: file,
      filename: file.name,
      mimeType: file.type
    };

    return await this.create(imageData);
  }

  /**
   * Upload image from base64 data URL
   */
  async uploadFromDataUrl(dataUrl: string, filename: string): Promise<string> {
    const blob = this.dataUrlToBlob(dataUrl);
    
    const imageData: Omit<ImageBlob, 'id' | 'uploadedAt'> = {
      blob,
      filename,
      mimeType: blob.type
    };

    return await this.create(imageData);
  }

  /**
   * Get image as data URL for display
   */
  async getAsDataUrl(id: string): Promise<string | null> {
    const image = await this.getById(id);
    if (!image) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image blob'));
      reader.readAsDataURL(image.blob);
    });
  }

  /**
   * Get image as blob URL for display
   */
  async getAsBlobUrl(id: string): Promise<string | null> {
    const image = await this.getById(id);
    if (!image) {
      return null;
    }

    return URL.createObjectURL(image.blob);
  }

  /**
   * Get multiple images as data URLs
   */
  async getMultipleAsDataUrls(ids: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    for (const id of ids) {
      const dataUrl = await this.getAsDataUrl(id);
      if (dataUrl) {
        results[id] = dataUrl;
      }
    }

    return results;
  }

  /**
   * Get images by MIME type
   */
  async getByMimeType(mimeType: string): Promise<ImageBlob[]> {
    return await db.images.where('mimeType').equals(mimeType).toArray();
  }

  /**
   * Get images uploaded in date range
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<ImageBlob[]> {
    return await db.images
      .where('uploadedAt')
      .between(startDate, endDate, true, true)
      .reverse()
      .sortBy('uploadedAt');
  }

  /**
   * Get total storage size used by images
   */
  async getTotalStorageSize(): Promise<number> {
    const images = await this.getAll();
    return images.reduce((total, image) => total + image.blob.size, 0);
  }

  /**
   * Clean up orphaned images (not referenced by any family member or memory)
   */
  async cleanupOrphanedImages(): Promise<string[]> {
    const allImages = await this.getAll();
    const allMembers = await db.familyMembers.toArray();
    const allMemories = await db.memories.toArray();

    // Collect all referenced image IDs
    const referencedIds = new Set<string>();
    
    allMembers.forEach(member => {
      member.photos.forEach(photoId => referencedIds.add(photoId));
    });
    
    allMemories.forEach(memory => {
      memory.photos.forEach(photoId => referencedIds.add(photoId));
    });

    // Find orphaned images
    const orphanedImages = allImages.filter(image => !referencedIds.has(image.id));
    const orphanedIds = orphanedImages.map(image => image.id);

    // Delete orphaned images
    if (orphanedIds.length > 0) {
      await db.images.bulkDelete(orphanedIds);
    }

    return orphanedIds;
  }

  /**
   * Resize image blob to maximum dimensions
   */
  async resizeImage(
    imageId: string, 
    maxWidth: number, 
    maxHeight: number, 
    quality: number = 0.8
  ): Promise<string> {
    const image = await this.getById(imageId);
    if (!image) {
      throw new NotFoundError('Image', imageId);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Resize image
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error('Failed to resize image'));
            return;
          }

          try {
            const resizedImageData: Omit<ImageBlob, 'id' | 'uploadedAt'> = {
              blob,
              filename: `resized_${image.filename}`,
              mimeType: blob.type || image.mimeType || 'image/jpeg'
            };

            const newId = await this.create(resizedImageData);
            resolve(newId);
          } catch (error) {
            reject(error);
          }
        }, image.mimeType, quality);
      };

      img.onerror = () => reject(new Error('Failed to load image for resizing'));
      
      // Create object URL for the image
      const objectUrl = URL.createObjectURL(image.blob);
      img.src = objectUrl;
    });
  }

  /**
   * Convert data URL to Blob
   */
  private dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    if (arr.length < 2) {
      throw new Error('Invalid data URL format');
    }
    
    const mimeMatch = arr[0]?.match(/:(.*?);/);
    const mime = mimeMatch?.[1] || 'image/jpeg';
    const bstr = atob(arr[1] || '');
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  }

  /**
   * Validate image data
   */
  private validateImageData(data: Partial<ImageBlob>): void {
    if (!data.blob) {
      throw new ValidationError('Image blob is required');
    }

    if (!data.filename || data.filename.trim().length === 0) {
      throw new ValidationError('Image filename is required');
    }

    if (!data.mimeType || !data.mimeType.startsWith('image/')) {
      throw new ValidationError('Invalid image MIME type');
    }

    // Check file size (max 10MB)
    if (data.blob.size > 10 * 1024 * 1024) {
      throw new ValidationError('Image file size cannot exceed 10MB');
    }
  }

  /**
   * Validate File object
   */
  private validateFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      throw new ValidationError('File must be an image');
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new ValidationError('Image file size cannot exceed 10MB');
    }

    // Check supported formats
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!supportedTypes.includes(file.type)) {
      throw new ValidationError('Unsupported image format. Please use JPEG, PNG, GIF, or WebP');
    }
  }
}