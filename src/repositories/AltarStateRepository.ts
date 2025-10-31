import { AltarState, AltarTheme } from '../types';
import { db } from './database';
import { BaseRepository, NotFoundError, ValidationError } from './BaseRepository';
import { generateId } from '../utils';

/**
 * Repository for managing altar layout and configuration persistence
 * Requirements: 2.1, 2.3, 2.4, 2.5
 */
export class AltarStateRepository implements BaseRepository<AltarState> {

  /**
   * Create a new altar state
   */
  async create(altarData: Omit<AltarState, 'id' | 'lastModified'>): Promise<string> {
    this.validateAltarData(altarData);
    
    const altarState: AltarState = {
      ...altarData,
      id: generateId(),
      lastModified: new Date()
    };

    await db.altarStates.add(altarState);
    return altarState.id;
  }

  /**
   * Get altar state by ID
   */
  async getById(id: string): Promise<AltarState | undefined> {
    return await db.altarStates.get(id);
  }

  /**
   * Get all altar states
   */
  async getAll(): Promise<AltarState[]> {
    return await db.altarStates.orderBy('lastModified').reverse().toArray();
  }

  /**
   * Update existing altar state
   */
  async update(id: string, updates: Partial<AltarState>): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new NotFoundError('AltarState', id);
    }

    // Validate updates
    this.validateAltarData({ ...existing, ...updates });

    await db.altarStates.update(id, {
      ...updates,
      lastModified: new Date()
    });

    return true;
  }

  /**
   * Delete altar state
   */
  async delete(id: string): Promise<boolean> {
    try {
      await db.altarStates.delete(id);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if altar state exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await db.altarStates.where('id').equals(id).count();
    return count > 0;
  }

  /**
   * Get count of altar states
   */
  async count(): Promise<number> {
    return await db.altarStates.count();
  }

  /**
   * Get the default altar state
   */
  async getDefault(): Promise<AltarState | undefined> {
    return await db.altarStates.get('default-altar');
  }

  /**
   * Get altar states by theme
   */
  async getByTheme(theme: AltarTheme): Promise<AltarState[]> {
    return await db.altarStates.where('backgroundTheme').equals(theme).toArray();
  }

  /**
   * Update member position in altar
   */
  async updateMemberPosition(
    altarId: string, 
    memberId: string, 
    level: number, 
    order: number
  ): Promise<boolean> {
    const altar = await this.getById(altarId);
    if (!altar) {
      throw new NotFoundError('AltarState', altarId);
    }

    // Validate that member exists
    const memberExists = await db.familyMembers.where('id').equals(memberId).count() > 0;
    if (!memberExists) {
      throw new ValidationError(`Family member with ID ${memberId} does not exist`);
    }

    const updatedPositions = {
      ...altar.memberPositions,
      [memberId]: { level, order }
    };

    return await this.update(altarId, {
      memberPositions: updatedPositions
    });
  }

  /**
   * Remove member from altar
   */
  async removeMember(altarId: string, memberId: string): Promise<boolean> {
    const altar = await this.getById(altarId);
    if (!altar) {
      throw new NotFoundError('AltarState', altarId);
    }

    const updatedPositions = { ...altar.memberPositions };
    delete updatedPositions[memberId];

    return await this.update(altarId, {
      memberPositions: updatedPositions
    });
  }

  /**
   * Get members at specific altar level
   */
  async getMembersAtLevel(altarId: string, level: number): Promise<Array<{memberId: string, order: number}>> {
    const altar = await this.getById(altarId);
    if (!altar) {
      return [];
    }

    return Object.entries(altar.memberPositions)
      .filter(([_, position]) => position.level === level)
      .map(([memberId, position]) => ({ memberId, order: position.order }))
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Reorder members within a level
   */
  async reorderMembersInLevel(
    altarId: string, 
    level: number, 
    memberOrder: string[]
  ): Promise<boolean> {
    const altar = await this.getById(altarId);
    if (!altar) {
      throw new NotFoundError('AltarState', altarId);
    }

    const updatedPositions = { ...altar.memberPositions };

    // Update order for members in the specified level
    memberOrder.forEach((memberId, index) => {
      if (updatedPositions[memberId] && updatedPositions[memberId].level === level) {
        updatedPositions[memberId] = {
          level,
          order: index
        };
      }
    });

    return await this.update(altarId, {
      memberPositions: updatedPositions
    });
  }

  /**
   * Add decoration to altar
   */
  async addDecoration(altarId: string, decoration: AltarState['decorations'][0]): Promise<boolean> {
    const altar = await this.getById(altarId);
    if (!altar) {
      throw new NotFoundError('AltarState', altarId);
    }

    const updatedDecorations = [...altar.decorations, decoration];

    return await this.update(altarId, {
      decorations: updatedDecorations
    });
  }

  /**
   * Update decoration position
   */
  async updateDecorationPosition(
    altarId: string, 
    decorationId: string, 
    x: number, 
    y: number, 
    level?: number
  ): Promise<boolean> {
    const altar = await this.getById(altarId);
    if (!altar) {
      throw new NotFoundError('AltarState', altarId);
    }

    const updatedDecorations = altar.decorations.map(decoration => {
      if (decoration.id === decorationId) {
        return {
          ...decoration,
          position: {
            x,
            y,
            level: level !== undefined ? level : decoration.position.level
          }
        };
      }
      return decoration;
    });

    return await this.update(altarId, {
      decorations: updatedDecorations
    });
  }

  /**
   * Remove decoration from altar
   */
  async removeDecoration(altarId: string, decorationId: string): Promise<boolean> {
    const altar = await this.getById(altarId);
    if (!altar) {
      throw new NotFoundError('AltarState', altarId);
    }

    const updatedDecorations = altar.decorations.filter(
      decoration => decoration.id !== decorationId
    );

    return await this.update(altarId, {
      decorations: updatedDecorations
    });
  }

  /**
   * Update altar theme
   */
  async updateTheme(altarId: string, theme: AltarTheme): Promise<boolean> {
    return await this.update(altarId, {
      backgroundTheme: theme
    });
  }

  /**
   * Clone altar state with new name
   */
  async cloneAltar(sourceId: string, newName: string): Promise<string> {
    const source = await this.getById(sourceId);
    if (!source) {
      throw new NotFoundError('AltarState', sourceId);
    }

    const clonedAltar: Omit<AltarState, 'id' | 'lastModified'> = {
      name: newName,
      memberPositions: { ...source.memberPositions },
      decorations: source.decorations.map(decoration => ({
        ...decoration,
        id: generateId() // Generate new IDs for decorations
      })),
      backgroundTheme: source.backgroundTheme
    };

    return await this.create(clonedAltar);
  }

  /**
   * Get altar layout statistics
   */
  async getLayoutStats(altarId: string): Promise<{
    totalMembers: number;
    membersByLevel: Record<number, number>;
    totalDecorations: number;
    decorationsByType: Record<string, number>;
  }> {
    const altar = await this.getById(altarId);
    if (!altar) {
      throw new NotFoundError('AltarState', altarId);
    }

    const membersByLevel: Record<number, number> = {};
    Object.values(altar.memberPositions).forEach(position => {
      membersByLevel[position.level] = (membersByLevel[position.level] || 0) + 1;
    });

    const decorationsByType: Record<string, number> = {};
    altar.decorations.forEach(decoration => {
      decorationsByType[decoration.type] = (decorationsByType[decoration.type] || 0) + 1;
    });

    return {
      totalMembers: Object.keys(altar.memberPositions).length,
      membersByLevel,
      totalDecorations: altar.decorations.length,
      decorationsByType
    };
  }

  /**
   * Validate altar data
   */
  private validateAltarData(data: Partial<AltarState>): void {
    if (data.name !== undefined && (!data.name || data.name.trim().length === 0)) {
      throw new ValidationError('Altar name is required');
    }

    if (data.name !== undefined && data.name.length > 100) {
      throw new ValidationError('Altar name cannot exceed 100 characters');
    }

    if (data.memberPositions !== undefined) {
      if (typeof data.memberPositions !== 'object') {
        throw new ValidationError('Member positions must be an object');
      }

      // Validate position values
      Object.entries(data.memberPositions).forEach(([memberId, position]) => {
        if (!memberId || typeof memberId !== 'string') {
          throw new ValidationError('Member ID must be a non-empty string');
        }

        if (!position || typeof position !== 'object') {
          throw new ValidationError('Position must be an object with level and order');
        }

        if (typeof position.level !== 'number' || position.level < 0) {
          throw new ValidationError('Position level must be a non-negative number');
        }

        if (typeof position.order !== 'number' || position.order < 0) {
          throw new ValidationError('Position order must be a non-negative number');
        }
      });
    }

    if (data.decorations !== undefined) {
      if (!Array.isArray(data.decorations)) {
        throw new ValidationError('Decorations must be an array');
      }

      // Validate each decoration
      data.decorations.forEach((decoration, index) => {
        if (!decoration.id || typeof decoration.id !== 'string') {
          throw new ValidationError(`Decoration at index ${index} must have a valid ID`);
        }

        if (!decoration.type) {
          throw new ValidationError(`Decoration at index ${index} must have a type`);
        }

        if (!decoration.position || typeof decoration.position !== 'object') {
          throw new ValidationError(`Decoration at index ${index} must have a position object`);
        }

        if (typeof decoration.position.x !== 'number' || typeof decoration.position.y !== 'number') {
          throw new ValidationError(`Decoration at index ${index} position must have numeric x and y coordinates`);
        }

        if (typeof decoration.position.level !== 'number' || decoration.position.level < 0) {
          throw new ValidationError(`Decoration at index ${index} position level must be a non-negative number`);
        }
      });
    }

    if (data.backgroundTheme !== undefined) {
      const validThemes: AltarTheme[] = ['traditional', 'modern', 'minimal'];
      if (!validThemes.includes(data.backgroundTheme)) {
        throw new ValidationError(`Background theme must be one of: ${validThemes.join(', ')}`);
      }
    }
  }
}