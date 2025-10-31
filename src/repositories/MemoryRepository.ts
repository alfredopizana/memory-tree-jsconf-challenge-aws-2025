import { Memory } from '../types';
import { db } from './database';
import { BaseRepository, NotFoundError, ValidationError } from './BaseRepository';
import { generateId } from '../utils';

/**
 * Repository for managing memory records and their associations
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class MemoryRepository implements BaseRepository<Memory> {

  /**
   * Create a new memory record
   */
  async create(memoryData: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    this.validateMemoryData(memoryData);
    
    const memory: Memory = {
      ...memoryData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.memories.add(memory);
    return memory.id;
  }

  /**
   * Get memory by ID
   */
  async getById(id: string): Promise<Memory | undefined> {
    return await db.memories.get(id);
  }

  /**
   * Get all memories
   */
  async getAll(): Promise<Memory[]> {
    return await db.memories.orderBy('createdAt').reverse().toArray();
  }

  /**
   * Update existing memory
   */
  async update(id: string, updates: Partial<Memory>): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new NotFoundError('Memory', id);
    }

    // Validate updates
    this.validateMemoryData({ ...existing, ...updates });

    await db.memories.update(id, {
      ...updates,
      updatedAt: new Date()
    });

    return true;
  }

  /**
   * Delete memory record
   */
  async delete(id: string): Promise<boolean> {
    try {
      await db.memories.delete(id);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if memory exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await db.memories.where('id').equals(id).count();
    return count > 0;
  }

  /**
   * Get count of memories
   */
  async count(): Promise<number> {
    return await db.memories.count();
  }

  /**
   * Get memories associated with a specific family member
   */
  async getByMemberId(memberId: string): Promise<Memory[]> {
    return await db.memories
      .where('associatedMemberIds')
      .anyOf([memberId])
      .reverse()
      .sortBy('createdAt');
  }

  /**
   * Get memories associated with multiple family members
   */
  async getByMemberIds(memberIds: string[]): Promise<Memory[]> {
    return await db.memories
      .where('associatedMemberIds')
      .anyOf(memberIds)
      .reverse()
      .sortBy('createdAt');
  }

  /**
   * Search memories by title or content
   */
  async search(query: string): Promise<Memory[]> {
    const lowerQuery = query.toLowerCase();
    return await db.memories
      .filter(memory => 
        memory.title.toLowerCase().includes(lowerQuery) ||
        memory.content.toLowerCase().includes(lowerQuery)
      )
      .reverse()
      .sortBy('createdAt');
  }

  /**
   * Associate memory with family members
   */
  async associateWithMembers(memoryId: string, memberIds: string[]): Promise<boolean> {
    const memory = await this.getById(memoryId);
    if (!memory) {
      throw new NotFoundError('Memory', memoryId);
    }

    // Validate that all member IDs exist
    for (const memberId of memberIds) {
      const memberExists = await db.familyMembers.where('id').equals(memberId).count() > 0;
      if (!memberExists) {
        throw new ValidationError(`Family member with ID ${memberId} does not exist`);
      }
    }

    // Combine existing and new associations, removing duplicates
    const existingIds = new Set(memory.associatedMemberIds);
    const newIds = memberIds.filter(id => !existingIds.has(id));
    const updatedIds = [...memory.associatedMemberIds, ...newIds];

    return await this.update(memoryId, {
      associatedMemberIds: updatedIds
    });
  }

  /**
   * Remove association between memory and family members
   */
  async removeAssociationWithMembers(memoryId: string, memberIds: string[]): Promise<boolean> {
    const memory = await this.getById(memoryId);
    if (!memory) {
      throw new NotFoundError('Memory', memoryId);
    }

    const idsToRemove = new Set(memberIds);
    const updatedIds = memory.associatedMemberIds.filter(id => !idsToRemove.has(id));

    return await this.update(memoryId, {
      associatedMemberIds: updatedIds
    });
  }

  /**
   * Get memories with photos
   */
  async getMemoriesWithPhotos(): Promise<Memory[]> {
    return await db.memories
      .filter(memory => memory.photos && memory.photos.length > 0)
      .reverse()
      .sortBy('createdAt');
  }

  /**
   * Get recent memories (last 30 days)
   */
  async getRecentMemories(days: number = 30): Promise<Memory[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await db.memories
      .where('createdAt')
      .above(cutoffDate)
      .reverse()
      .sortBy('createdAt');
  }

  /**
   * Get memories by date range
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<Memory[]> {
    return await db.memories
      .where('createdAt')
      .between(startDate, endDate, true, true)
      .reverse()
      .sortBy('createdAt');
  }

  /**
   * Add photo to memory
   */
  async addPhoto(memoryId: string, photoId: string): Promise<boolean> {
    const memory = await this.getById(memoryId);
    if (!memory) {
      throw new NotFoundError('Memory', memoryId);
    }

    if (memory.photos.includes(photoId)) {
      return true; // Photo already associated
    }

    const updatedPhotos = [...memory.photos, photoId];
    return await this.update(memoryId, { photos: updatedPhotos });
  }

  /**
   * Remove photo from memory
   */
  async removePhoto(memoryId: string, photoId: string): Promise<boolean> {
    const memory = await this.getById(memoryId);
    if (!memory) {
      throw new NotFoundError('Memory', memoryId);
    }

    const updatedPhotos = memory.photos.filter(id => id !== photoId);
    return await this.update(memoryId, { photos: updatedPhotos });
  }

  /**
   * Validate memory data
   */
  private validateMemoryData(data: Partial<Memory>): void {
    if (data.title !== undefined && (!data.title || data.title.trim().length === 0)) {
      throw new ValidationError('Memory title is required');
    }

    if (data.content !== undefined && (!data.content || data.content.trim().length === 0)) {
      throw new ValidationError('Memory content is required');
    }

    if (data.title !== undefined && data.title.length > 200) {
      throw new ValidationError('Memory title cannot exceed 200 characters');
    }

    if (data.content !== undefined && data.content.length > 10000) {
      throw new ValidationError('Memory content cannot exceed 10,000 characters');
    }

    if (data.associatedMemberIds !== undefined) {
      if (!Array.isArray(data.associatedMemberIds)) {
        throw new ValidationError('Associated member IDs must be an array');
      }
      
      if (data.associatedMemberIds.length === 0) {
        throw new ValidationError('Memory must be associated with at least one family member');
      }
    }

    if (data.photos !== undefined && !Array.isArray(data.photos)) {
      throw new ValidationError('Photos must be an array of photo IDs');
    }
  }
}