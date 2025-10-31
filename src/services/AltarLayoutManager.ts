import { AltarState, DecorationElement, FamilyMember, AltarTheme, Position } from '../types';
import { AltarStateRepository } from '../repositories/AltarStateRepository';
import { FamilyMemberRepository } from '../repositories/FamilyMemberRepository';
import { ValidationService } from '../types/validation';
import { PositionUtils, StringUtils } from '../types/utils';
import { generateId } from '../utils';

/**
 * Business logic manager for altar layout and positioning
 * Handles drag-and-drop position tracking, layout persistence, and collision detection
 * Requirements: 2.1, 2.3, 2.4, 2.5
 */
export class AltarLayoutManager {
  private altarStateRepository: AltarStateRepository;
  private familyMemberRepository: FamilyMemberRepository;

  constructor(
    altarStateRepository?: AltarStateRepository,
    familyMemberRepository?: FamilyMemberRepository
  ) {
    this.altarStateRepository = altarStateRepository || new AltarStateRepository();
    this.familyMemberRepository = familyMemberRepository || new FamilyMemberRepository();
  }

  /**
   * Create a new altar layout
   * Requirements: 2.1, 2.5
   */
  async createAltarLayout(layoutData: {
    name: string;
    backgroundTheme?: AltarTheme;
  }): Promise<{ success: boolean; altarId?: string; errors?: string[] }> {
    try {
      const sanitizedName = StringUtils.sanitizeString(layoutData.name);
      
      if (!StringUtils.isNonEmptyString(sanitizedName)) {
        return { success: false, errors: ['Altar name is required'] };
      }

      const altarState: Omit<AltarState, 'id' | 'lastModified'> = {
        name: sanitizedName,
        memberPositions: {},
        decorations: [],
        backgroundTheme: layoutData.backgroundTheme || 'traditional'
      };

      // Validate the altar state
      const validation = ValidationService.validateAltarState(altarState);
      if (!validation.isValid) {
        return { success: false, errors: validation.errors };
      }

      const altarId = await this.altarStateRepository.create(altarState);
      return { success: true, altarId };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to create altar layout']
      };
    }
  }

  /**
   * Move family member to new position on altar
   * Requirements: 2.3, 2.4, 2.5
   */
  async moveFamilyMember(
    altarId: string,
    memberId: string,
    newLevel: number,
    targetOrder?: number
  ): Promise<{ success: boolean; finalOrder?: number; errors?: string[] }> {
    try {
      // Validate inputs
      if (newLevel < 0) {
        return { success: false, errors: ['Altar level must be non-negative'] };
      }

      // Check if member exists
      const memberExists = await this.familyMemberRepository.exists(memberId);
      if (!memberExists) {
        return { success: false, errors: ['Family member not found'] };
      }

      // Get current altar state
      const altar = await this.altarStateRepository.getById(altarId);
      if (!altar) {
        return { success: false, errors: ['Altar not found'] };
      }

      // Calculate final order position
      let finalOrder: number;
      if (targetOrder !== undefined && targetOrder >= 0) {
        finalOrder = targetOrder;
        // Adjust orders of other members at the same level
        await this.adjustMemberOrdersForInsertion(altarId, newLevel, targetOrder, memberId);
      } else {
        // Get next available order position
        const membersAtLevel = await this.altarStateRepository.getMembersAtLevel(altarId, newLevel);
        finalOrder = membersAtLevel.length > 0 ? Math.max(...membersAtLevel.map(m => m.order)) + 1 : 0;
      }

      // Update member position in altar
      await this.altarStateRepository.updateMemberPosition(altarId, memberId, newLevel, finalOrder);

      // Update member's altar position in family member record
      await this.familyMemberRepository.updateAltarPosition(memberId, newLevel, finalOrder);

      return { success: true, finalOrder };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to move family member']
      };
    }
  }

  /**
   * Reorder family members within the same altar level
   * Requirements: 2.4, 2.5
   */
  async reorderMembersInLevel(
    altarId: string,
    level: number,
    memberOrder: string[]
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      // Validate that all members exist and are at the specified level
      const altar = await this.altarStateRepository.getById(altarId);
      if (!altar) {
        return { success: false, errors: ['Altar not found'] };
      }

      const currentMembersAtLevel = await this.altarStateRepository.getMembersAtLevel(altarId, level);
      const currentMemberIds = new Set(currentMembersAtLevel.map(m => m.memberId));

      // Validate that all provided members are currently at this level
      for (const memberId of memberOrder) {
        if (!currentMemberIds.has(memberId)) {
          return { 
            success: false, 
            errors: [`Member ${memberId} is not currently at level ${level}`] 
          };
        }
      }

      // Validate that all current members are included in the new order
      if (memberOrder.length !== currentMembersAtLevel.length) {
        return { 
          success: false, 
          errors: ['All members at the level must be included in reorder operation'] 
        };
      }

      // Update altar state
      await this.altarStateRepository.reorderMembersInLevel(altarId, level, memberOrder);

      // Update individual family member records
      for (let i = 0; i < memberOrder.length; i++) {
        const memberId = memberOrder[i];
        if (memberId) {
          await this.familyMemberRepository.updateAltarPosition(memberId, level, i);
        }
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to reorder members']
      };
    }
  }

  /**
   * Add decoration element to altar
   * Requirements: 2.1, 2.5
   */
  async addDecoration(
    altarId: string,
    decoration: Omit<DecorationElement, 'id'>
  ): Promise<{ success: boolean; decorationId?: string; errors?: string[] }> {
    try {
      // Validate decoration data
      const decorationWithId: DecorationElement = {
        ...decoration,
        id: generateId()
      };

      const validation = ValidationService.validateDecorationElement(decorationWithId);
      if (!validation.isValid) {
        return { success: false, errors: validation.errors };
      }

      // Check for collisions with existing decorations
      const collisionCheck = await this.checkDecorationCollision(altarId, decorationWithId);
      if (!collisionCheck.isValid) {
        return { success: false, errors: collisionCheck.errors };
      }

      // Check if altar exists
      const altar = await this.altarStateRepository.getById(altarId);
      if (!altar) {
        return { success: false, errors: ['Altar not found'] };
      }

      // Add decoration to altar
      await this.altarStateRepository.addDecoration(altarId, decorationWithId);

      return { success: true, decorationId: decorationWithId.id };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to add decoration']
      };
    }
  }

  /**
   * Move decoration to new position
   * Requirements: 2.3, 2.4, 2.5
   */
  async moveDecoration(
    altarId: string,
    decorationId: string,
    newPosition: Position,
    newLevel?: number
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      // Validate position
      if (!PositionUtils.isValidPosition(newPosition.x, newPosition.y)) {
        return { success: false, errors: ['Invalid position coordinates'] };
      }

      // Get current altar state
      const altar = await this.altarStateRepository.getById(altarId);
      if (!altar) {
        return { success: false, errors: ['Altar not found'] };
      }

      // Find the decoration
      const decoration = altar.decorations.find(d => d.id === decorationId);
      if (!decoration) {
        return { success: false, errors: ['Decoration not found'] };
      }

      // Create updated decoration for collision check
      const updatedDecoration: DecorationElement = {
        ...decoration,
        position: {
          x: newPosition.x,
          y: newPosition.y,
          level: newLevel !== undefined ? newLevel : decoration.position.level
        }
      };

      // Check for collisions (excluding the decoration being moved)
      const collisionCheck = await this.checkDecorationCollision(altarId, updatedDecoration, decorationId);
      if (!collisionCheck.isValid) {
        return { success: false, errors: collisionCheck.errors };
      }

      // Update decoration position
      await this.altarStateRepository.updateDecorationPosition(
        altarId,
        decorationId,
        newPosition.x,
        newPosition.y,
        newLevel !== undefined ? newLevel : decoration.position.level
      );

      return { success: true };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to move decoration']
      };
    }
  }

  /**
   * Remove decoration from altar
   * Requirements: 2.5
   */
  async removeDecoration(
    altarId: string,
    decorationId: string
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const removed = await this.altarStateRepository.removeDecoration(altarId, decorationId);
      
      if (!removed) {
        return { success: false, errors: ['Decoration not found or could not be removed'] };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to remove decoration']
      };
    }
  }

  /**
   * Get complete altar layout with members and decorations
   * Requirements: 2.1, 2.5
   */
  async getAltarLayout(altarId: string): Promise<{
    altar: AltarState | null;
    membersByLevel: Record<number, FamilyMember[]>;
    decorationsByLevel: Record<number, DecorationElement[]>;
  }> {
    try {
      const altar = await this.altarStateRepository.getById(altarId);
      if (!altar) {
        return { altar: null, membersByLevel: {}, decorationsByLevel: {} };
      }

      // Get family members organized by level
      const membersByLevel: Record<number, FamilyMember[]> = {};
      for (const [memberId, position] of Object.entries(altar.memberPositions)) {
        const member = await this.familyMemberRepository.getById(memberId);
        if (member) {
          if (!membersByLevel[position.level]) {
            membersByLevel[position.level] = [];
          }
          const levelArray = membersByLevel[position.level];
          if (levelArray) {
            levelArray.push(member);
          }
        }
      }

      // Sort members by order within each level
      Object.keys(membersByLevel).forEach(level => {
        const levelNum = parseInt(level);
        const membersAtLevel = membersByLevel[levelNum];
        if (membersAtLevel) {
          membersAtLevel.sort((a, b) => {
            const aPos = altar.memberPositions[a.id];
            const bPos = altar.memberPositions[b.id];
            if (!aPos || !bPos) return 0;
            return aPos.order - bPos.order;
          });
        }
      });

      // Get decorations organized by level
      const decorationsByLevel: Record<number, DecorationElement[]> = {};
      if (altar.decorations) {
        altar.decorations.forEach(decoration => {
          const level = decoration.position.level;
          if (!decorationsByLevel[level]) {
            decorationsByLevel[level] = [];
          }
          decorationsByLevel[level].push(decoration);
        });
      }

      return { altar, membersByLevel, decorationsByLevel };

    } catch (error) {
      return { altar: null, membersByLevel: {}, decorationsByLevel: {} };
    }
  }

  /**
   * Update altar theme
   * Requirements: 2.1, 2.5
   */
  async updateAltarTheme(
    altarId: string,
    theme: AltarTheme
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      await this.altarStateRepository.updateTheme(altarId, theme);
      return { success: true };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to update altar theme']
      };
    }
  }

  /**
   * Get valid drop zones for a family member
   * Requirements: 2.3, 2.4
   */
  async getValidDropZones(
    altarId: string,
    _memberId: string
  ): Promise<{
    validLevels: number[];
    suggestedPositions: Array<{ level: number; order: number }>;
  }> {
    try {
      const altar = await this.altarStateRepository.getById(altarId);
      if (!altar) {
        return { validLevels: [], suggestedPositions: [] };
      }

      // All levels are valid for family members (0-2 for traditional altar)
      const validLevels = [0, 1, 2];
      const suggestedPositions: Array<{ level: number; order: number }> = [];

      // Calculate suggested positions for each level
      for (const level of validLevels) {
        const membersAtLevel = await this.altarStateRepository.getMembersAtLevel(altarId, level);
        const nextOrder = membersAtLevel.length > 0 ? Math.max(...membersAtLevel.map(m => m.order)) + 1 : 0;
        
        suggestedPositions.push({ level, order: nextOrder });
      }

      return { validLevels, suggestedPositions };

    } catch (error) {
      return { validLevels: [0, 1, 2], suggestedPositions: [] };
    }
  }

  /**
   * Check for decoration collisions
   * Requirements: 2.4
   */
  async checkDecorationCollision(
    altarId: string,
    decoration: DecorationElement,
    excludeDecorationId?: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const altar = await this.altarStateRepository.getById(altarId);
      if (!altar) {
        return { isValid: false, errors: ['Altar not found'] };
      }

      const errors: string[] = [];
      const decorationSize = this.getDecorationSize(decoration.size);
      const decorationBounds = {
        left: decoration.position.x,
        right: decoration.position.x + decorationSize.width,
        top: decoration.position.y,
        bottom: decoration.position.y + decorationSize.height
      };

      // Check collisions with other decorations at the same level
      const decorationsAtLevel = altar.decorations.filter(d => 
        d.position.level === decoration.position.level && 
        d.id !== excludeDecorationId
      );

      for (const existingDecoration of decorationsAtLevel) {
        const existingSize = this.getDecorationSize(existingDecoration.size);
        const existingBounds = {
          left: existingDecoration.position.x,
          right: existingDecoration.position.x + existingSize.width,
          top: existingDecoration.position.y,
          bottom: existingDecoration.position.y + existingSize.height
        };

        // Check for overlap
        if (this.boundsOverlap(decorationBounds, existingBounds)) {
          errors.push(`Decoration would overlap with existing ${existingDecoration.type} decoration`);
        }
      }

      return { isValid: errors.length === 0, errors };

    } catch (error) {
      return { isValid: false, errors: ['Error checking decoration collision'] };
    }
  }

  /**
   * Get altar layout statistics
   * Requirements: 2.5
   */
  async getLayoutStatistics(altarId: string): Promise<{
    totalMembers: number;
    membersByLevel: Record<number, number>;
    totalDecorations: number;
    decorationsByType: Record<string, number>;
    decorationsByLevel: Record<number, number>;
  }> {
    try {
      const stats = await this.altarStateRepository.getLayoutStats(altarId);
      const altar = await this.altarStateRepository.getById(altarId);
      
      const decorationsByLevel: Record<number, number> = {};
      if (altar) {
        altar.decorations.forEach(decoration => {
          const level = decoration.position.level;
          decorationsByLevel[level] = (decorationsByLevel[level] || 0) + 1;
        });
      }

      return {
        ...stats,
        decorationsByLevel
      };

    } catch (error) {
      return {
        totalMembers: 0,
        membersByLevel: {},
        totalDecorations: 0,
        decorationsByType: {},
        decorationsByLevel: {}
      };
    }
  }

  /**
   * Clone altar layout with new name
   * Requirements: 2.5
   */
  async cloneAltarLayout(
    sourceAltarId: string,
    newName: string
  ): Promise<{ success: boolean; newAltarId?: string; errors?: string[] }> {
    try {
      const sanitizedName = StringUtils.sanitizeString(newName);
      
      if (!StringUtils.isNonEmptyString(sanitizedName)) {
        return { success: false, errors: ['New altar name is required'] };
      }

      const newAltarId = await this.altarStateRepository.cloneAltar(sourceAltarId, sanitizedName);
      return { success: true, newAltarId };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to clone altar layout']
      };
    }
  }

  /**
   * Adjust member orders when inserting at specific position
   * Private helper method
   */
  private async adjustMemberOrdersForInsertion(
    altarId: string,
    level: number,
    insertOrder: number,
    insertingMemberId: string
  ): Promise<void> {
    const membersAtLevel = await this.altarStateRepository.getMembersAtLevel(altarId, level);
    
    // Increment order for members at or after the insertion point
    for (const memberInfo of membersAtLevel) {
      if (memberInfo.order >= insertOrder && memberInfo.memberId !== insertingMemberId) {
        await this.altarStateRepository.updateMemberPosition(
          altarId,
          memberInfo.memberId,
          level,
          memberInfo.order + 1
        );
        await this.familyMemberRepository.updateAltarPosition(
          memberInfo.memberId,
          level,
          memberInfo.order + 1
        );
      }
    }
  }

  /**
   * Get decoration size based on size category
   * Private helper method
   */
  private getDecorationSize(size: DecorationElement['size']): { width: number; height: number } {
    switch (size) {
      case 'small':
        return { width: 50, height: 50 };
      case 'medium':
        return { width: 100, height: 100 };
      case 'large':
        return { width: 150, height: 150 };
      default:
        return { width: 100, height: 100 };
    }
  }

  /**
   * Check if two rectangular bounds overlap
   * Private helper method
   */
  private boundsOverlap(
    bounds1: { left: number; right: number; top: number; bottom: number },
    bounds2: { left: number; right: number; top: number; bottom: number }
  ): boolean {
    return !(
      bounds1.right <= bounds2.left ||
      bounds1.left >= bounds2.right ||
      bounds1.bottom <= bounds2.top ||
      bounds1.top >= bounds2.bottom
    );
  }
}