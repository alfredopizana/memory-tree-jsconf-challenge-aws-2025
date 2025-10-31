import { Relationship, RelationshipType, FamilyMember } from '../types';
import { RelationshipRepository } from '../repositories/RelationshipRepository';
import { FamilyMemberRepository } from '../repositories/FamilyMemberRepository';
import { ValidationService } from '../types/validation';

/**
 * Business logic engine for managing family relationships
 * Handles relationship creation, validation, conflict detection, and family tree traversal
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export class RelationshipEngine {
  private relationshipRepository: RelationshipRepository;
  private familyMemberRepository: FamilyMemberRepository;

  constructor(
    relationshipRepository?: RelationshipRepository,
    familyMemberRepository?: FamilyMemberRepository
  ) {
    this.relationshipRepository = relationshipRepository || new RelationshipRepository();
    this.familyMemberRepository = familyMemberRepository || new FamilyMemberRepository();
  }

  /**
   * Create a new relationship with comprehensive validation
   * Requirements: 5.1, 5.2
   */
  async createRelationship(
    fromMemberId: string,
    toMemberId: string,
    type: RelationshipType
  ): Promise<{ success: boolean; relationshipIds?: string[]; errors?: string[] }> {
    try {
      // Validate basic relationship data
      const validation = ValidationService.validateRelationship({
        fromMemberId,
        toMemberId,
        type,
        id: 'temp',
        createdAt: new Date()
      });

      if (!validation.isValid) {
        return { success: false, errors: validation.errors };
      }

      // Check for relationship conflicts
      const conflicts = await this.detectRelationshipConflicts(fromMemberId, toMemberId, type);
      if (conflicts.length > 0) {
        return { success: false, errors: conflicts };
      }

      // Create appropriate relationship(s) based on type
      let relationshipIds: string[];

      switch (type) {
        case 'parent':
          relationshipIds = await this.relationshipRepository.createParentChildRelationship(fromMemberId, toMemberId);
          break;
        case 'child':
          relationshipIds = await this.relationshipRepository.createParentChildRelationship(toMemberId, fromMemberId);
          break;
        case 'sibling':
          relationshipIds = await this.relationshipRepository.createBidirectionalRelationship(fromMemberId, toMemberId, 'sibling');
          break;
        case 'spouse':
          relationshipIds = await this.relationshipRepository.createBidirectionalRelationship(fromMemberId, toMemberId, 'spouse');
          break;
        case 'grandparent':
          relationshipIds = await this.relationshipRepository.createGrandparentGrandchildRelationship(fromMemberId, toMemberId);
          break;
        case 'grandchild':
          relationshipIds = await this.relationshipRepository.createGrandparentGrandchildRelationship(toMemberId, fromMemberId);
          break;
        default:
          return { success: false, errors: [`Unsupported relationship type: ${type}`] };
      }

      return { success: true, relationshipIds };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to create relationship']
      };
    }
  }

  /**
   * Delete a relationship and its reciprocal
   * Requirements: 5.1
   */
  async deleteRelationship(
    fromMemberId: string,
    toMemberId: string,
    type: RelationshipType
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const deleted = await this.relationshipRepository.deleteBidirectionalRelationship(
        fromMemberId,
        toMemberId,
        type
      );

      if (!deleted) {
        return { success: false, errors: ['Relationship not found'] };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to delete relationship']
      };
    }
  }

  /**
   * Get all relationships for a family member
   * Requirements: 5.3
   */
  async getMemberRelationships(memberId: string): Promise<{
    relationships: Relationship[];
    relatedMembers: FamilyMember[];
  }> {
    try {
      const relationships = await this.relationshipRepository.getByMemberId(memberId);
      const relatedMemberIds = new Set<string>();

      relationships.forEach(rel => {
        if (rel.fromMemberId !== memberId) {
          relatedMemberIds.add(rel.fromMemberId);
        }
        if (rel.toMemberId !== memberId) {
          relatedMemberIds.add(rel.toMemberId);
        }
      });

      const relatedMembers: FamilyMember[] = [];
      for (const id of relatedMemberIds) {
        const member = await this.familyMemberRepository.getById(id);
        if (member) {
          relatedMembers.push(member);
        }
      }

      return { relationships, relatedMembers };

    } catch (error) {
      return { relationships: [], relatedMembers: [] };
    }
  }

  /**
   * Get family members by relationship type
   * Requirements: 5.3
   */
  async getRelatedMembers(
    memberId: string,
    relationshipType: RelationshipType
  ): Promise<FamilyMember[]> {
    try {
      let relationships: Relationship[] = [];

      switch (relationshipType) {
        case 'parent':
          relationships = await this.relationshipRepository.getParents(memberId);
          break;
        case 'child':
          relationships = await this.relationshipRepository.getChildren(memberId);
          break;
        case 'sibling':
          relationships = await this.relationshipRepository.getSiblings(memberId);
          break;
        case 'spouse':
          relationships = await this.relationshipRepository.getSpouses(memberId);
          break;
        case 'grandparent':
          relationships = await this.relationshipRepository.getGrandparents(memberId);
          break;
        case 'grandchild':
          relationships = await this.relationshipRepository.getGrandchildren(memberId);
          break;
      }

      const members: FamilyMember[] = [];
      for (const rel of relationships) {
        const relatedMemberId = rel.fromMemberId === memberId ? rel.toMemberId : rel.fromMemberId;
        const member = await this.familyMemberRepository.getById(relatedMemberId);
        if (member) {
          members.push(member);
        }
      }

      return members;

    } catch (error) {
      return [];
    }
  }

  /**
   * Detect potential relationship conflicts
   * Requirements: 5.2, 5.4
   */
  async detectRelationshipConflicts(
    fromMemberId: string,
    toMemberId: string,
    proposedType: RelationshipType
  ): Promise<string[]> {
    try {
      const conflicts: string[] = [];

      // Check if members exist
      const fromMember = await this.familyMemberRepository.getById(fromMemberId);
      const toMember = await this.familyMemberRepository.getById(toMemberId);

      if (!fromMember) {
        conflicts.push('Source family member not found');
      }
      if (!toMember) {
        conflicts.push('Target family member not found');
      }

      if (conflicts.length > 0) {
        return conflicts;
      }

      // Get existing relationships between these members
      const existingRelationships = await this.relationshipRepository.getRelationshipBetween(
        fromMemberId,
        toMemberId
      );

      // Check for direct conflicts
      for (const existing of existingRelationships) {
        if (this.areConflictingRelationshipTypes(existing.type, proposedType)) {
          conflicts.push(
            `Cannot create ${proposedType} relationship: conflicts with existing ${existing.type} relationship`
          );
        }
      }

      // Check for age-based conflicts
      if (fromMember && toMember) {
        const ageConflicts = this.validateAgeBasedRelationship(fromMember, toMember, proposedType);
        conflicts.push(...ageConflicts);
      }

      // Check for logical conflicts (e.g., spouse already exists)
      const logicalConflicts = await this.validateRelationshipLogic(fromMemberId, toMemberId, proposedType);
      conflicts.push(...logicalConflicts);

      return conflicts;

    } catch (error) {
      return ['Error validating relationship conflicts'];
    }
  }

  /**
   * Traverse family tree to find relationships
   * Requirements: 5.3, 5.5
   */
  async findFamilyPath(
    fromMemberId: string,
    toMemberId: string,
    maxDepth: number = 5
  ): Promise<{
    path: FamilyMember[];
    relationships: Relationship[];
    pathExists: boolean;
  }> {
    try {
      const visited = new Set<string>();
      const queue: Array<{
        memberId: string;
        path: FamilyMember[];
        relationships: Relationship[];
        depth: number;
      }> = [];

      const startMember = await this.familyMemberRepository.getById(fromMemberId);
      if (!startMember) {
        return { path: [], relationships: [], pathExists: false };
      }

      queue.push({
        memberId: fromMemberId,
        path: [startMember],
        relationships: [],
        depth: 0
      });

      while (queue.length > 0) {
        const current = queue.shift()!;

        if (current.memberId === toMemberId) {
          return {
            path: current.path,
            relationships: current.relationships,
            pathExists: true
          };
        }

        if (current.depth >= maxDepth || visited.has(current.memberId)) {
          continue;
        }

        visited.add(current.memberId);

        // Get all relationships for current member
        const memberRelationships = await this.relationshipRepository.getByMemberId(current.memberId);

        for (const rel of memberRelationships) {
          const nextMemberId = rel.fromMemberId === current.memberId ? rel.toMemberId : rel.fromMemberId;

          if (!visited.has(nextMemberId)) {
            const nextMember = await this.familyMemberRepository.getById(nextMemberId);
            if (nextMember) {
              queue.push({
                memberId: nextMemberId,
                path: [...current.path, nextMember],
                relationships: [...current.relationships, rel],
                depth: current.depth + 1
              });
            }
          }
        }
      }

      return { path: [], relationships: [], pathExists: false };

    } catch (error) {
      return { path: [], relationships: [], pathExists: false };
    }
  }

  /**
   * Get family tree structure organized by generations
   * Requirements: 5.3, 5.5
   */
  async getFamilyTreeStructure(): Promise<{
    generations: Record<number, FamilyMember[]>;
    relationships: Relationship[];
    orphanedMembers: FamilyMember[];
  }> {
    try {
      const allMembers = await this.familyMemberRepository.getAll();
      const allRelationships = await this.relationshipRepository.getAll();

      const generations: Record<number, FamilyMember[]> = {};
      const orphanedMembers: FamilyMember[] = [];

      // Group members by generation
      for (const member of allMembers) {
        const generation = member.generation ?? this.inferGeneration(member.id, allRelationships);
        
        if (generation !== null) {
          if (!generations[generation]) {
            generations[generation] = [];
          }
          generations[generation].push(member);
        } else {
          orphanedMembers.push(member);
        }
      }

      return {
        generations,
        relationships: allRelationships,
        orphanedMembers
      };

    } catch (error) {
      return {
        generations: {},
        relationships: [],
        orphanedMembers: []
      };
    }
  }

  /**
   * Get relationship statistics
   * Requirements: 5.5
   */
  async getRelationshipStatistics(): Promise<{
    totalRelationships: number;
    relationshipCounts: Record<RelationshipType, number>;
    connectedMembers: number;
    isolatedMembers: number;
  }> {
    try {
      const allRelationships = await this.relationshipRepository.getAll();
      const allMembers = await this.familyMemberRepository.getAll();

      const relationshipCounts: Record<RelationshipType, number> = {
        parent: 0,
        child: 0,
        sibling: 0,
        spouse: 0,
        grandparent: 0,
        grandchild: 0
      };

      // Count relationships by type
      allRelationships.forEach(rel => {
        relationshipCounts[rel.type]++;
      });

      // Count connected vs isolated members
      const connectedMemberIds = new Set<string>();
      allRelationships.forEach(rel => {
        connectedMemberIds.add(rel.fromMemberId);
        connectedMemberIds.add(rel.toMemberId);
      });

      return {
        totalRelationships: allRelationships.length,
        relationshipCounts,
        connectedMembers: connectedMemberIds.size,
        isolatedMembers: allMembers.length - connectedMemberIds.size
      };

    } catch (error) {
      return {
        totalRelationships: 0,
        relationshipCounts: {
          parent: 0,
          child: 0,
          sibling: 0,
          spouse: 0,
          grandparent: 0,
          grandchild: 0
        },
        connectedMembers: 0,
        isolatedMembers: 0
      };
    }
  }

  /**
   * Check if two relationship types conflict with each other
   * Private helper method
   */
  private areConflictingRelationshipTypes(type1: RelationshipType, type2: RelationshipType): boolean {
    const conflicts: Record<RelationshipType, RelationshipType[]> = {
      parent: ['child', 'sibling', 'spouse'],
      child: ['parent', 'sibling', 'spouse'],
      sibling: ['parent', 'child', 'spouse'],
      spouse: ['parent', 'child', 'sibling'],
      grandparent: ['grandchild'],
      grandchild: ['grandparent']
    };

    return conflicts[type1]?.includes(type2) || false;
  }

  /**
   * Validate age-based relationship constraints
   * Private helper method
   */
  private validateAgeBasedRelationship(
    fromMember: FamilyMember,
    toMember: FamilyMember,
    relationshipType: RelationshipType
  ): string[] {
    const errors: string[] = [];

    const fromBirth = fromMember.dateOfBirth;
    const toBirth = toMember.dateOfBirth;

    switch (relationshipType) {
      case 'parent':
        if (fromBirth >= toBirth) {
          errors.push('Parent must be born before child');
        }
        break;
      case 'child':
        if (toBirth >= fromBirth) {
          errors.push('Child must be born after parent');
        }
        break;
      case 'grandparent':
        const yearsDiff = (toBirth.getTime() - fromBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (yearsDiff < 20) {
          errors.push('Grandparent must be at least 20 years older than grandchild');
        }
        break;
      case 'grandchild':
        const yearsReverseDiff = (fromBirth.getTime() - toBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (yearsReverseDiff < 20) {
          errors.push('Grandchild must be at least 20 years younger than grandparent');
        }
        break;
    }

    return errors;
  }

  /**
   * Validate relationship business logic
   * Private helper method
   */
  private async validateRelationshipLogic(
    fromMemberId: string,
    toMemberId: string,
    relationshipType: RelationshipType
  ): Promise<string[]> {
    const errors: string[] = [];

    try {
      switch (relationshipType) {
        case 'spouse':
          // Check if either member already has a spouse
          const fromSpouses = await this.relationshipRepository.getSpouses(fromMemberId);
          const toSpouses = await this.relationshipRepository.getSpouses(toMemberId);

          if (fromSpouses.length > 0) {
            errors.push('Source member already has a spouse');
          }
          if (toSpouses.length > 0) {
            errors.push('Target member already has a spouse');
          }
          break;

        case 'sibling':
          // Siblings should have at least one common parent (if parents are defined)
          const fromParents = await this.relationshipRepository.getParents(fromMemberId);
          const toParents = await this.relationshipRepository.getParents(toMemberId);

          if (fromParents.length > 0 && toParents.length > 0) {
            const commonParents = fromParents.filter(fp =>
              toParents.some(tp => tp.fromMemberId === fp.fromMemberId)
            );

            if (commonParents.length === 0) {
              errors.push('Siblings should have at least one common parent');
            }
          }
          break;
      }
    } catch (error) {
      // Don't fail validation due to lookup errors
    }

    return errors;
  }

  /**
   * Infer generation from relationships
   * Private helper method
   */
  private inferGeneration(memberId: string, relationships: Relationship[]): number | null {
    // Simple generation inference based on parent-child relationships
    let generation = 0;
    const visited = new Set<string>();
    const queue = [{ id: memberId, gen: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.id)) {
        continue;
      }
      visited.add(current.id);

      // Find parents to go up a generation
      const parentRels = relationships.filter(
        rel => rel.toMemberId === current.id && rel.type === 'child'
      );

      if (parentRels.length > 0) {
        generation = Math.max(generation, current.gen + 1);
        parentRels.forEach(rel => {
          if (!visited.has(rel.fromMemberId)) {
            queue.push({ id: rel.fromMemberId, gen: current.gen + 1 });
          }
        });
      }
    }

    return generation > 0 ? generation : null;
  }
}