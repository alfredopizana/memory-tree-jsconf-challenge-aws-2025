import { FamilyMember } from '../types';
import { FamilyMemberRepository } from '../repositories/FamilyMemberRepository';
import { ImageRepository } from '../repositories/ImageRepository';
import { ValidationService } from '../types/validation';
import { StringUtils, DateUtils, PositionUtils } from '../types/utils';

/**
 * Business logic manager for family member operations
 * Handles creation, editing, deletion, and photo management
 * Requirements: 1.1, 1.3, 1.4, 1.5
 */
export class FamilyTreeManager {
  private familyMemberRepository: FamilyMemberRepository;
  private imageRepository: ImageRepository;

  constructor(
    familyMemberRepository?: FamilyMemberRepository,
    imageRepository?: ImageRepository
  ) {
    this.familyMemberRepository = familyMemberRepository || new FamilyMemberRepository();
    this.imageRepository = imageRepository || new ImageRepository();
  }

  /**
   * Create a new family member with validation
   * Requirements: 1.1, 1.3
   */
  async createFamilyMember(memberData: {
    name: string;
    preferredName?: string;
    dateOfBirth: Date;
    dateOfDeath?: Date;
    generation?: number;
    altarLevel?: number;
  }): Promise<{ success: boolean; memberId?: string; errors?: string[] }> {
    try {
      // Sanitize input data
      const sanitizedData = {
        ...memberData,
        name: StringUtils.sanitizeString(memberData.name),
        preferredName: memberData.preferredName ? StringUtils.sanitizeString(memberData.preferredName) : undefined,
        dateOfBirth: DateUtils.parseDate(memberData.dateOfBirth),
        dateOfDeath: memberData.dateOfDeath ? DateUtils.parseDate(memberData.dateOfDeath) : undefined
      };

      // Validate the sanitized data
      if (!sanitizedData.dateOfBirth) {
        return { success: false, errors: ['Invalid date of birth'] };
      }

      // Get next available altar position
      const existingMembers = await this.familyMemberRepository.getAll();
      const targetLevel = memberData.altarLevel || this.determineDefaultAltarLevel(memberData.generation);
      const nextOrder = PositionUtils.getNextOrderPosition(
        existingMembers.map(m => m.altarPosition),
        targetLevel
      );

      const familyMember: Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt'> = {
        name: sanitizedData.name,
        dateOfBirth: sanitizedData.dateOfBirth,
        photos: [],
        altarPosition: {
          level: targetLevel,
          order: nextOrder
        }
      };

      // Add optional properties only if they have values
      if (sanitizedData.preferredName) {
        familyMember.preferredName = sanitizedData.preferredName;
      }
      if (sanitizedData.dateOfDeath) {
        familyMember.dateOfDeath = sanitizedData.dateOfDeath;
      }
      if (memberData.generation !== undefined) {
        familyMember.generation = memberData.generation;
      }

      // Validate the complete family member object
      const validation = ValidationService.validateFamilyMember(familyMember);
      if (!validation.isValid) {
        return { success: false, errors: validation.errors };
      }

      const memberId = await this.familyMemberRepository.create(familyMember);
      return { success: true, memberId };

    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Failed to create family member'] 
      };
    }
  }

  /**
   * Update an existing family member
   * Requirements: 1.1, 1.4
   */
  async updateFamilyMember(
    memberId: string,
    updates: Partial<{
      name: string;
      preferredName: string;
      dateOfBirth: Date;
      dateOfDeath: Date;
      generation: number;
    }>
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const existingMember = await this.familyMemberRepository.getById(memberId);
      if (!existingMember) {
        return { success: false, errors: ['Family member not found'] };
      }

      // Sanitize updates
      const sanitizedUpdates: Partial<FamilyMember> = {};
      
      if (updates.name !== undefined) {
        sanitizedUpdates.name = StringUtils.sanitizeString(updates.name);
      }
      
      if (updates.preferredName !== undefined) {
        const sanitized = StringUtils.sanitizeString(updates.preferredName);
        if (sanitized.length > 0) {
          sanitizedUpdates.preferredName = sanitized;
        }
      }
      
      if (updates.dateOfBirth !== undefined) {
        const parsedDate = DateUtils.parseDate(updates.dateOfBirth);
        if (!parsedDate) {
          return { success: false, errors: ['Invalid date of birth'] };
        }
        sanitizedUpdates.dateOfBirth = parsedDate;
      }
      
      if (updates.dateOfDeath !== undefined) {
        const parsedDate = DateUtils.parseDate(updates.dateOfDeath);
        if (updates.dateOfDeath && !parsedDate) {
          return { success: false, errors: ['Invalid date of death'] };
        }
        if (parsedDate) {
          sanitizedUpdates.dateOfDeath = parsedDate;
        }
      }
      
      if (updates.generation !== undefined) {
        sanitizedUpdates.generation = updates.generation;
      }

      // Validate the updated member
      const updatedMember = { ...existingMember, ...sanitizedUpdates };
      const validation = ValidationService.validateFamilyMember(updatedMember);
      if (!validation.isValid) {
        return { success: false, errors: validation.errors };
      }

      await this.familyMemberRepository.update(memberId, sanitizedUpdates);
      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Failed to update family member'] 
      };
    }
  }

  /**
   * Delete a family member and handle cleanup
   * Requirements: 1.1
   */
  async deleteFamilyMember(memberId: string): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const member = await this.familyMemberRepository.getById(memberId);
      if (!member) {
        return { success: false, errors: ['Family member not found'] };
      }

      // Clean up associated photos
      if (member.photos.length > 0) {
        for (const photoId of member.photos) {
          await this.imageRepository.delete(photoId);
        }
      }

      // Delete the family member (repository handles relationship cleanup)
      const deleted = await this.familyMemberRepository.delete(memberId);
      
      if (!deleted) {
        return { success: false, errors: ['Failed to delete family member'] };
      }

      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Failed to delete family member'] 
      };
    }
  }

  /**
   * Upload and associate a photo with a family member
   * Requirements: 1.4, 1.5
   */
  async uploadMemberPhoto(
    memberId: string, 
    file: File
  ): Promise<{ success: boolean; photoId?: string; errors?: string[] }> {
    try {
      const member = await this.familyMemberRepository.getById(memberId);
      if (!member) {
        return { success: false, errors: ['Family member not found'] };
      }

      // Upload the image
      const photoId = await this.imageRepository.uploadFile(file);

      // Associate the photo with the family member
      const updatedPhotos = [...member.photos, photoId];
      await this.familyMemberRepository.update(memberId, { photos: updatedPhotos });

      return { success: true, photoId };

    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Failed to upload photo'] 
      };
    }
  }

  /**
   * Remove a photo from a family member
   * Requirements: 1.4
   */
  async removeMemberPhoto(
    memberId: string, 
    photoId: string
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const member = await this.familyMemberRepository.getById(memberId);
      if (!member) {
        return { success: false, errors: ['Family member not found'] };
      }

      if (!member.photos.includes(photoId)) {
        return { success: false, errors: ['Photo not associated with this family member'] };
      }

      // Remove photo from member's photo list
      const updatedPhotos = member.photos.filter(id => id !== photoId);
      await this.familyMemberRepository.update(memberId, { photos: updatedPhotos });

      // Delete the image if it's not used elsewhere
      await this.imageRepository.delete(photoId);

      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Failed to remove photo'] 
      };
    }
  }

  /**
   * Reorder photos for a family member
   * Requirements: 1.4
   */
  async reorderMemberPhotos(
    memberId: string, 
    photoIds: string[]
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const member = await this.familyMemberRepository.getById(memberId);
      if (!member) {
        return { success: false, errors: ['Family member not found'] };
      }

      // Validate that all provided photo IDs belong to this member
      const invalidPhotos = photoIds.filter(id => !member.photos.includes(id));
      if (invalidPhotos.length > 0) {
        return { success: false, errors: ['Some photos do not belong to this family member'] };
      }

      // Validate that all member's photos are included
      if (photoIds.length !== member.photos.length) {
        return { success: false, errors: ['All photos must be included in reorder operation'] };
      }

      await this.familyMemberRepository.update(memberId, { photos: photoIds });
      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Failed to reorder photos'] 
      };
    }
  }

  /**
   * Get family member with photo URLs for display
   * Requirements: 1.4, 1.5
   */
  async getFamilyMemberWithPhotos(memberId: string): Promise<{
    member: FamilyMember | null;
    photoUrls: string[];
  }> {
    try {
      const member = await this.familyMemberRepository.getById(memberId);
      if (!member) {
        return { member: null, photoUrls: [] };
      }

      const photoUrls: string[] = [];
      for (const photoId of member.photos) {
        const url = await this.imageRepository.getAsDataUrl(photoId);
        if (url) {
          photoUrls.push(url);
        }
      }

      return { member, photoUrls };

    } catch (error) {
      return { member: null, photoUrls: [] };
    }
  }

  /**
   * Get all family members with basic info
   * Requirements: 1.1
   */
  async getAllFamilyMembers(): Promise<FamilyMember[]> {
    try {
      return await this.familyMemberRepository.getAll();
    } catch (error) {
      return [];
    }
  }

  /**
   * Search family members by name
   * Requirements: 1.1
   */
  async searchFamilyMembers(query: string): Promise<FamilyMember[]> {
    try {
      if (!query || query.trim().length === 0) {
        return await this.getAllFamilyMembers();
      }

      return await this.familyMemberRepository.searchByName(query.trim());
    } catch (error) {
      return [];
    }
  }

  /**
   * Get family members by generation
   * Requirements: 1.1
   */
  async getFamilyMembersByGeneration(generation: number): Promise<FamilyMember[]> {
    try {
      return await this.familyMemberRepository.getByGeneration(generation);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get living family members
   * Requirements: 1.1
   */
  async getLivingFamilyMembers(): Promise<FamilyMember[]> {
    try {
      return await this.familyMemberRepository.getLiving();
    } catch (error) {
      return [];
    }
  }

  /**
   * Get deceased family members
   * Requirements: 1.1
   */
  async getDeceasedFamilyMembers(): Promise<FamilyMember[]> {
    try {
      return await this.familyMemberRepository.getDeceased();
    } catch (error) {
      return [];
    }
  }

  /**
   * Move family member to different altar level
   * Requirements: 1.1
   */
  async moveFamilyMemberToLevel(
    memberId: string, 
    newLevel: number
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const member = await this.familyMemberRepository.getById(memberId);
      if (!member) {
        return { success: false, errors: ['Family member not found'] };
      }

      if (newLevel < 0) {
        return { success: false, errors: ['Altar level must be non-negative'] };
      }

      // Get next available order position for the new level
      const existingMembers = await this.familyMemberRepository.getAll();
      const nextOrder = PositionUtils.getNextOrderPosition(
        existingMembers.map(m => m.altarPosition),
        newLevel
      );

      await this.familyMemberRepository.updateAltarPosition(memberId, newLevel, nextOrder);
      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Failed to move family member'] 
      };
    }
  }

  /**
   * Validate family member data before operations
   * Requirements: 1.1, 1.3
   */
  validateFamilyMemberData(memberData: Partial<FamilyMember>): { isValid: boolean; errors: string[] } {
    return ValidationService.validateFamilyMember(memberData);
  }

  /**
   * Determine default altar level based on generation or other factors
   * Private helper method
   */
  private determineDefaultAltarLevel(generation?: number): number {
    if (generation === undefined) {
      return 1; // Default middle level
    }

    // Traditional altar levels: 0 (top/heaven), 1 (middle/earth), 2 (bottom/underworld)
    if (generation >= 3) return 0; // Great-grandparents and above
    if (generation === 2) return 0; // Grandparents
    if (generation === 1) return 1; // Parents
    return 2; // Current generation and children
  }
}