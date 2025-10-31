import { Memory, FamilyMember } from '../types';
import { MemoryRepository } from '../repositories/MemoryRepository';
import { FamilyMemberRepository } from '../repositories/FamilyMemberRepository';
import { ImageRepository } from '../repositories/ImageRepository';
import { ValidationService } from '../types/validation';
import { StringUtils, ArrayUtils } from '../types/utils';

/**
 * Business logic manager for memory operations
 * Handles memory creation, editing, deletion, associations, and search functionality
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class MemoryManager {
  private memoryRepository: MemoryRepository;
  private familyMemberRepository: FamilyMemberRepository;
  private imageRepository: ImageRepository;

  constructor(
    memoryRepository?: MemoryRepository,
    familyMemberRepository?: FamilyMemberRepository,
    imageRepository?: ImageRepository
  ) {
    this.memoryRepository = memoryRepository || new MemoryRepository();
    this.familyMemberRepository = familyMemberRepository || new FamilyMemberRepository();
    this.imageRepository = imageRepository || new ImageRepository();
  }

  /**
   * Create a new memory with validation
   * Requirements: 4.1, 4.2
   */
  async createMemory(memoryData: {
    title: string;
    content: string;
    associatedMemberIds: string[];
    photos?: File[];
  }): Promise<{ success: boolean; memoryId?: string; errors?: string[] }> {
    try {
      // Sanitize input data
      const sanitizedData = {
        title: StringUtils.sanitizeString(memoryData.title),
        content: StringUtils.sanitizeString(memoryData.content),
        associatedMemberIds: ArrayUtils.removeDuplicates(memoryData.associatedMemberIds),
        photos: []
      };

      // Validate the memory data
      const validation = ValidationService.validateMemory(sanitizedData);
      if (!validation.isValid) {
        return { success: false, errors: validation.errors };
      }

      // Validate that all associated members exist
      const memberValidation = await this.validateMemberAssociations(sanitizedData.associatedMemberIds);
      if (!memberValidation.isValid) {
        return { success: false, errors: memberValidation.errors };
      }

      // Upload photos if provided
      const photoIds: string[] = [];
      if (memoryData.photos && memoryData.photos.length > 0) {
        for (const photo of memoryData.photos) {
          try {
            const photoId = await this.imageRepository.uploadFile(photo);
            photoIds.push(photoId);
          } catch (error) {
            // Clean up already uploaded photos on error
            for (const uploadedId of photoIds) {
              await this.imageRepository.delete(uploadedId);
            }
            return { 
              success: false, 
              errors: [`Failed to upload photo: ${error instanceof Error ? error.message : 'Unknown error'}`] 
            };
          }
        }
      }

      // Create the memory
      const memoryToCreate: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'> = {
        title: sanitizedData.title,
        content: sanitizedData.content,
        associatedMemberIds: sanitizedData.associatedMemberIds,
        photos: photoIds
      };

      const memoryId = await this.memoryRepository.create(memoryToCreate);
      return { success: true, memoryId };

    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Failed to create memory'] 
      };
    }
  }

  /**
   * Update an existing memory
   * Requirements: 4.1, 4.5
   */
  async updateMemory(
    memoryId: string,
    updates: Partial<{
      title: string;
      content: string;
      associatedMemberIds: string[];
    }>
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const existingMemory = await this.memoryRepository.getById(memoryId);
      if (!existingMemory) {
        return { success: false, errors: ['Memory not found'] };
      }

      // Sanitize updates
      const sanitizedUpdates: Partial<Memory> = {};
      
      if (updates.title !== undefined) {
        sanitizedUpdates.title = StringUtils.sanitizeString(updates.title);
      }
      
      if (updates.content !== undefined) {
        sanitizedUpdates.content = StringUtils.sanitizeString(updates.content);
      }
      
      if (updates.associatedMemberIds !== undefined) {
        sanitizedUpdates.associatedMemberIds = ArrayUtils.removeDuplicates(updates.associatedMemberIds);
        
        // Validate member associations
        const memberValidation = await this.validateMemberAssociations(sanitizedUpdates.associatedMemberIds);
        if (!memberValidation.isValid) {
          return { success: false, errors: memberValidation.errors };
        }
      }

      // Validate the updated memory
      const updatedMemory = { ...existingMemory, ...sanitizedUpdates };
      const validation = ValidationService.validateMemory(updatedMemory);
      if (!validation.isValid) {
        return { success: false, errors: validation.errors };
      }

      await this.memoryRepository.update(memoryId, sanitizedUpdates);
      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Failed to update memory'] 
      };
    }
  }

  /**
   * Delete a memory and cleanup associated photos
   * Requirements: 4.1
   */
  async deleteMemory(memoryId: string): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const memory = await this.memoryRepository.getById(memoryId);
      if (!memory) {
        return { success: false, errors: ['Memory not found'] };
      }

      // Clean up associated photos
      if (memory.photos.length > 0) {
        for (const photoId of memory.photos) {
          await this.imageRepository.delete(photoId);
        }
      }

      // Delete the memory
      const deleted = await this.memoryRepository.delete(memoryId);
      
      if (!deleted) {
        return { success: false, errors: ['Failed to delete memory'] };
      }

      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Failed to delete memory'] 
      };
    }
  }

  /**
   * Add photo to an existing memory
   * Requirements: 4.1, 4.4
   */
  async addPhotoToMemory(
    memoryId: string, 
    photo: File
  ): Promise<{ success: boolean; photoId?: string; errors?: string[] }> {
    try {
      const memory = await this.memoryRepository.getById(memoryId);
      if (!memory) {
        return { success: false, errors: ['Memory not found'] };
      }

      // Upload the photo
      const photoId = await this.imageRepository.uploadFile(photo);

      // Associate the photo with the memory
      await this.memoryRepository.addPhoto(memoryId, photoId);

      return { success: true, photoId };

    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Failed to add photo to memory'] 
      };
    }
  }

  /**
   * Remove photo from a memory
   * Requirements: 4.1, 4.4
   */
  async removePhotoFromMemory(
    memoryId: string, 
    photoId: string
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const memory = await this.memoryRepository.getById(memoryId);
      if (!memory) {
        return { success: false, errors: ['Memory not found'] };
      }

      if (!memory.photos.includes(photoId)) {
        return { success: false, errors: ['Photo not associated with this memory'] };
      }

      // Remove photo from memory
      await this.memoryRepository.removePhoto(memoryId, photoId);

      // Delete the image
      await this.imageRepository.delete(photoId);

      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Failed to remove photo from memory'] 
      };
    }
  }

  /**
   * Associate memory with additional family members
   * Requirements: 4.2, 4.3
   */
  async associateMemoryWithMembers(
    memoryId: string, 
    memberIds: string[]
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const memory = await this.memoryRepository.getById(memoryId);
      if (!memory) {
        return { success: false, errors: ['Memory not found'] };
      }

      // Validate member associations
      const memberValidation = await this.validateMemberAssociations(memberIds);
      if (!memberValidation.isValid) {
        return { success: false, errors: memberValidation.errors };
      }

      await this.memoryRepository.associateWithMembers(memoryId, memberIds);
      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Failed to associate memory with members'] 
      };
    }
  }

  /**
   * Remove association between memory and family members
   * Requirements: 4.2, 4.3
   */
  async removeMemoryAssociationWithMembers(
    memoryId: string, 
    memberIds: string[]
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const memory = await this.memoryRepository.getById(memoryId);
      if (!memory) {
        return { success: false, errors: ['Memory not found'] };
      }

      // Ensure at least one member remains associated
      const remainingMembers = memory.associatedMemberIds.filter(id => !memberIds.includes(id));
      if (remainingMembers.length === 0) {
        return { success: false, errors: ['Memory must remain associated with at least one family member'] };
      }

      await this.memoryRepository.removeAssociationWithMembers(memoryId, memberIds);
      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Failed to remove memory association'] 
      };
    }
  }

  /**
   * Search memories by text query
   * Requirements: 4.3, 4.5
   */
  async searchMemories(query: string): Promise<{
    memories: Memory[];
    associatedMembers: Record<string, FamilyMember[]>;
  }> {
    try {
      if (!query || query.trim().length === 0) {
        return await this.getAllMemoriesWithMembers();
      }

      const memories = await this.memoryRepository.search(query.trim());
      const associatedMembers = await this.getAssociatedMembersForMemories(memories);

      return { memories, associatedMembers };

    } catch (error) {
      return { memories: [], associatedMembers: {} };
    }
  }

  /**
   * Get memories for a specific family member
   * Requirements: 4.2, 4.3
   */
  async getMemoriesForMember(memberId: string): Promise<{
    memories: Memory[];
    member: FamilyMember | null;
  }> {
    try {
      const member = await this.familyMemberRepository.getById(memberId);
      if (!member) {
        return { memories: [], member: null };
      }

      const memories = await this.memoryRepository.getByMemberId(memberId);
      return { memories, member };

    } catch (error) {
      return { memories: [], member: null };
    }
  }

  /**
   * Get memories for multiple family members
   * Requirements: 4.2, 4.3
   */
  async getMemoriesForMembers(memberIds: string[]): Promise<{
    memories: Memory[];
    members: FamilyMember[];
  }> {
    try {
      const memories = await this.memoryRepository.getByMemberIds(memberIds);
      
      const members: FamilyMember[] = [];
      for (const memberId of memberIds) {
        const member = await this.familyMemberRepository.getById(memberId);
        if (member) {
          members.push(member);
        }
      }

      return { memories, members };

    } catch (error) {
      return { memories: [], members: [] };
    }
  }

  /**
   * Get all memories with associated members
   * Requirements: 4.3
   */
  async getAllMemoriesWithMembers(): Promise<{
    memories: Memory[];
    associatedMembers: Record<string, FamilyMember[]>;
  }> {
    try {
      const memories = await this.memoryRepository.getAll();
      const associatedMembers = await this.getAssociatedMembersForMemories(memories);

      return { memories, associatedMembers };

    } catch (error) {
      return { memories: [], associatedMembers: {} };
    }
  }

  /**
   * Get memory with photos and associated members
   * Requirements: 4.1, 4.4
   */
  async getMemoryWithDetails(memoryId: string): Promise<{
    memory: Memory | null;
    associatedMembers: FamilyMember[];
    photoUrls: string[];
  }> {
    try {
      const memory = await this.memoryRepository.getById(memoryId);
      if (!memory) {
        return { memory: null, associatedMembers: [], photoUrls: [] };
      }

      // Get associated members
      const associatedMembers: FamilyMember[] = [];
      for (const memberId of memory.associatedMemberIds) {
        const member = await this.familyMemberRepository.getById(memberId);
        if (member) {
          associatedMembers.push(member);
        }
      }

      // Get photo URLs
      const photoUrls: string[] = [];
      for (const photoId of memory.photos) {
        const url = await this.imageRepository.getAsDataUrl(photoId);
        if (url) {
          photoUrls.push(url);
        }
      }

      return { memory, associatedMembers, photoUrls };

    } catch (error) {
      return { memory: null, associatedMembers: [], photoUrls: [] };
    }
  }

  /**
   * Filter memories by date range
   * Requirements: 4.3, 4.5
   */
  async filterMemoriesByDateRange(
    startDate: Date, 
    endDate: Date
  ): Promise<{
    memories: Memory[];
    associatedMembers: Record<string, FamilyMember[]>;
  }> {
    try {
      const memories = await this.memoryRepository.getByDateRange(startDate, endDate);
      const associatedMembers = await this.getAssociatedMembersForMemories(memories);

      return { memories, associatedMembers };

    } catch (error) {
      return { memories: [], associatedMembers: {} };
    }
  }

  /**
   * Get recent memories
   * Requirements: 4.3, 4.5
   */
  async getRecentMemories(days: number = 30): Promise<{
    memories: Memory[];
    associatedMembers: Record<string, FamilyMember[]>;
  }> {
    try {
      const memories = await this.memoryRepository.getRecentMemories(days);
      const associatedMembers = await this.getAssociatedMembersForMemories(memories);

      return { memories, associatedMembers };

    } catch (error) {
      return { memories: [], associatedMembers: {} };
    }
  }

  /**
   * Get memories with photos
   * Requirements: 4.4, 4.5
   */
  async getMemoriesWithPhotos(): Promise<{
    memories: Memory[];
    associatedMembers: Record<string, FamilyMember[]>;
  }> {
    try {
      const memories = await this.memoryRepository.getMemoriesWithPhotos();
      const associatedMembers = await this.getAssociatedMembersForMemories(memories);

      return { memories, associatedMembers };

    } catch (error) {
      return { memories: [], associatedMembers: {} };
    }
  }

  /**
   * Validate memory data before operations
   * Requirements: 4.1
   */
  validateMemoryData(memoryData: Partial<Memory>): { isValid: boolean; errors: string[] } {
    return ValidationService.validateMemory(memoryData);
  }

  /**
   * Validate that all member IDs exist and are valid
   * Private helper method
   */
  private async validateMemberAssociations(memberIds: string[]): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      errors.push('At least one family member must be associated with the memory');
      return { isValid: false, errors };
    }

    // Check for duplicates
    const uniqueIds = new Set(memberIds);
    if (uniqueIds.size !== memberIds.length) {
      errors.push('Duplicate member IDs are not allowed');
    }

    // Validate that all members exist
    for (const memberId of memberIds) {
      if (!memberId || memberId.trim().length === 0) {
        errors.push('Member ID cannot be empty');
        continue;
      }

      const exists = await this.familyMemberRepository.exists(memberId);
      if (!exists) {
        errors.push(`Family member with ID ${memberId} does not exist`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Get associated members for a list of memories
   * Private helper method
   */
  private async getAssociatedMembersForMemories(memories: Memory[]): Promise<Record<string, FamilyMember[]>> {
    const associatedMembers: Record<string, FamilyMember[]> = {};

    for (const memory of memories) {
      const members: FamilyMember[] = [];
      for (const memberId of memory.associatedMemberIds) {
        const member = await this.familyMemberRepository.getById(memberId);
        if (member) {
          members.push(member);
        }
      }
      associatedMembers[memory.id] = members;
    }

    return associatedMembers;
  }
}