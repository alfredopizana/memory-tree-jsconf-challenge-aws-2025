import { FamilyMember } from '../types';
import { db } from './database';
import { BaseRepository, NotFoundError, ValidationError } from './BaseRepository';
import { generateId } from '../utils';

/**
 * Repository for managing family member data
 * Implements CRUD operations with validation and business logic
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export class FamilyMemberRepository implements BaseRepository<FamilyMember> {
  
  /**
   * Create a new family member
   */
  async create(memberData: Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    this.validateMemberData(memberData);
    
    const member: FamilyMember = {
      ...memberData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.familyMembers.add(member);
    return member.id;
  }

  /**
   * Get family member by ID
   */
  async getById(id: string): Promise<FamilyMember | undefined> {
    return await db.familyMembers.get(id);
  }

  /**
   * Get all family members
   */
  async getAll(): Promise<FamilyMember[]> {
    return await db.familyMembers.toArray();
  }

  /**
   * Update existing family member
   */
  async update(id: string, updates: Partial<FamilyMember>): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new NotFoundError('FamilyMember', id);
    }

    // Validate updates if they contain critical fields
    if (updates.name !== undefined || updates.dateOfBirth !== undefined) {
      this.validateMemberData({ ...existing, ...updates });
    }

    await db.familyMembers.update(id, {
      ...updates,
      updatedAt: new Date()
    });

    return true;
  }

  /**
   * Delete family member and cleanup related data
   */
  async delete(id: string): Promise<boolean> {
    const member = await this.getById(id);
    if (!member) {
      return false;
    }

    try {
      await db.transaction('rw', [db.familyMembers, db.relationships, db.memories], async () => {
        // Delete the family member
        await db.familyMembers.delete(id);
        
        // Delete related relationships
        await db.relationships.where('fromMemberId').equals(id).delete();
        await db.relationships.where('toMemberId').equals(id).delete();
        
        // Update memories to remove associations
        const memories = await db.memories.where('associatedMemberIds').anyOf([id]).toArray();
        for (const memory of memories) {
          const updatedMemberIds = memory.associatedMemberIds.filter(memberId => memberId !== id);
          await db.memories.update(memory.id, { associatedMemberIds: updatedMemberIds });
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if family member exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await db.familyMembers.where('id').equals(id).count();
    return count > 0;
  }

  /**
   * Get count of family members
   */
  async count(): Promise<number> {
    return await db.familyMembers.count();
  }

  /**
   * Get family members by generation
   */
  async getByGeneration(generation: number): Promise<FamilyMember[]> {
    return await db.familyMembers.where('generation').equals(generation).toArray();
  }

  /**
   * Get living family members
   */
  async getLiving(): Promise<FamilyMember[]> {
    return await db.familyMembers.filter(member => !member.dateOfDeath).toArray();
  }

  /**
   * Get deceased family members
   */
  async getDeceased(): Promise<FamilyMember[]> {
    return await db.familyMembers.where('dateOfDeath').above(new Date(0)).toArray();
  }

  /**
   * Search family members by name
   */
  async searchByName(query: string): Promise<FamilyMember[]> {
    const lowerQuery = query.toLowerCase();
    return await db.familyMembers
      .filter(member => 
        member.name.toLowerCase().includes(lowerQuery) ||
        (member.preferredName ? member.preferredName.toLowerCase().includes(lowerQuery) : false)
      )
      .toArray();
  }

  /**
   * Get family members by altar level
   */
  async getByAltarLevel(level: number): Promise<FamilyMember[]> {
    return await db.familyMembers
      .where('altarPosition.level')
      .equals(level)
      .sortBy('altarPosition.order');
  }

  /**
   * Update altar position for a family member
   */
  async updateAltarPosition(id: string, level: number, order: number): Promise<boolean> {
    try {
      await this.update(id, {
        altarPosition: { level, order }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate family member data
   */
  private validateMemberData(data: Partial<FamilyMember>): void {
    if (data.name !== undefined && (!data.name || data.name.trim().length === 0)) {
      throw new ValidationError('Family member name is required');
    }

    if (data.dateOfBirth !== undefined && !(data.dateOfBirth instanceof Date)) {
      throw new ValidationError('Date of birth must be a valid Date object');
    }

    if (data.dateOfDeath !== undefined && data.dateOfDeath !== null) {
      if (!(data.dateOfDeath instanceof Date)) {
        throw new ValidationError('Date of death must be a valid Date object');
      }
      
      if (data.dateOfBirth && data.dateOfDeath < data.dateOfBirth) {
        throw new ValidationError('Date of death cannot be before date of birth');
      }
    }

    if (data.generation !== undefined && data.generation < 0) {
      throw new ValidationError('Generation must be a non-negative number');
    }

    if (data.altarPosition !== undefined) {
      if (data.altarPosition.level < 0 || data.altarPosition.order < 0) {
        throw new ValidationError('Altar position level and order must be non-negative');
      }
    }
  }
}