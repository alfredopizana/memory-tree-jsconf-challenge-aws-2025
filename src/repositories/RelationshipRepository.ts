import { Relationship, RelationshipType } from '../types';
import { db } from './database';
import { BaseRepository, NotFoundError, ValidationError, DuplicateError } from './BaseRepository';
import { generateId } from '../utils';

/**
 * Repository for managing family relationships with validation logic
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export class RelationshipRepository implements BaseRepository<Relationship> {

  /**
   * Create a new relationship with validation
   */
  async create(relationshipData: Omit<Relationship, 'id' | 'createdAt'>): Promise<string> {
    await this.validateRelationshipData(relationshipData);
    
    const relationship: Relationship = {
      ...relationshipData,
      id: generateId(),
      createdAt: new Date()
    };

    await db.relationships.add(relationship);
    return relationship.id;
  }

  /**
   * Get relationship by ID
   */
  async getById(id: string): Promise<Relationship | undefined> {
    return await db.relationships.get(id);
  }

  /**
   * Get all relationships
   */
  async getAll(): Promise<Relationship[]> {
    return await db.relationships.toArray();
  }

  /**
   * Update existing relationship
   */
  async update(id: string, updates: Partial<Relationship>): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new NotFoundError('Relationship', id);
    }

    // Validate updates
    await this.validateRelationshipData({ ...existing, ...updates });

    await db.relationships.update(id, updates);
    return true;
  }

  /**
   * Delete relationship
   */
  async delete(id: string): Promise<boolean> {
    try {
      await db.relationships.delete(id);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if relationship exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await db.relationships.where('id').equals(id).count();
    return count > 0;
  }

  /**
   * Get count of relationships
   */
  async count(): Promise<number> {
    return await db.relationships.count();
  }

  /**
   * Get relationships for a specific family member
   */
  async getByMemberId(memberId: string): Promise<Relationship[]> {
    const outgoing = await db.relationships.where('fromMemberId').equals(memberId).toArray();
    const incoming = await db.relationships.where('toMemberId').equals(memberId).toArray();
    
    return [...outgoing, ...incoming];
  }

  /**
   * Get relationships of a specific type
   */
  async getByType(type: RelationshipType): Promise<Relationship[]> {
    return await db.relationships.where('type').equals(type).toArray();
  }

  /**
   * Get direct relationships between two members
   */
  async getRelationshipBetween(memberId1: string, memberId2: string): Promise<Relationship[]> {
    const direct = await db.relationships
      .where('fromMemberId').equals(memberId1)
      .and(rel => rel.toMemberId === memberId2)
      .toArray();
    
    const reverse = await db.relationships
      .where('fromMemberId').equals(memberId2)
      .and(rel => rel.toMemberId === memberId1)
      .toArray();

    return [...direct, ...reverse];
  }

  /**
   * Check if a specific relationship exists
   */
  async relationshipExists(fromMemberId: string, toMemberId: string, type: RelationshipType): Promise<boolean> {
    const count = await db.relationships
      .where('fromMemberId').equals(fromMemberId)
      .and(rel => rel.toMemberId === toMemberId && rel.type === type)
      .count();
    
    return count > 0;
  }

  /**
   * Get children of a family member
   */
  async getChildren(parentId: string): Promise<Relationship[]> {
    return await db.relationships
      .where('fromMemberId').equals(parentId)
      .and(rel => rel.type === 'child')
      .toArray();
  }

  /**
   * Get parents of a family member
   */
  async getParents(childId: string): Promise<Relationship[]> {
    return await db.relationships
      .where('toMemberId').equals(childId)
      .and(rel => rel.type === 'child')
      .toArray();
  }

  /**
   * Get siblings of a family member
   */
  async getSiblings(memberId: string): Promise<Relationship[]> {
    return await db.relationships
      .where('fromMemberId').equals(memberId)
      .and(rel => rel.type === 'sibling')
      .toArray();
  }

  /**
   * Get spouse(s) of a family member
   */
  async getSpouses(memberId: string): Promise<Relationship[]> {
    const outgoing = await db.relationships
      .where('fromMemberId').equals(memberId)
      .and(rel => rel.type === 'spouse')
      .toArray();
    
    const incoming = await db.relationships
      .where('toMemberId').equals(memberId)
      .and(rel => rel.type === 'spouse')
      .toArray();

    return [...outgoing, ...incoming];
  }

  /**
   * Get grandparents of a family member
   */
  async getGrandparents(grandchildId: string): Promise<Relationship[]> {
    return await db.relationships
      .where('toMemberId').equals(grandchildId)
      .and(rel => rel.type === 'grandchild')
      .toArray();
  }

  /**
   * Get grandchildren of a family member
   */
  async getGrandchildren(grandparentId: string): Promise<Relationship[]> {
    return await db.relationships
      .where('fromMemberId').equals(grandparentId)
      .and(rel => rel.type === 'grandchild')
      .toArray();
  }

  /**
   * Create bidirectional relationship (e.g., siblings, spouses)
   */
  async createBidirectionalRelationship(
    memberId1: string, 
    memberId2: string, 
    type: 'sibling' | 'spouse'
  ): Promise<string[]> {
    // Check if relationship already exists
    const existing = await this.getRelationshipBetween(memberId1, memberId2);
    const hasType = existing.some(rel => rel.type === type);
    
    if (hasType) {
      throw new DuplicateError('Relationship', 'type', `${type} between ${memberId1} and ${memberId2}`);
    }

    const id1 = await this.create({
      fromMemberId: memberId1,
      toMemberId: memberId2,
      type
    });

    const id2 = await this.create({
      fromMemberId: memberId2,
      toMemberId: memberId1,
      type
    });

    return [id1, id2];
  }

  /**
   * Create parent-child relationship with automatic reverse
   */
  async createParentChildRelationship(parentId: string, childId: string): Promise<string[]> {
    // Check if relationship already exists
    const existing = await this.getRelationshipBetween(parentId, childId);
    const hasParentChild = existing.some(rel => 
      (rel.fromMemberId === parentId && rel.toMemberId === childId && rel.type === 'child') ||
      (rel.fromMemberId === childId && rel.toMemberId === parentId && rel.type === 'parent')
    );
    
    if (hasParentChild) {
      throw new DuplicateError('Relationship', 'type', `parent-child between ${parentId} and ${childId}`);
    }

    const childRelId = await this.create({
      fromMemberId: parentId,
      toMemberId: childId,
      type: 'child'
    });

    const parentRelId = await this.create({
      fromMemberId: childId,
      toMemberId: parentId,
      type: 'parent'
    });

    return [childRelId, parentRelId];
  }

  /**
   * Create grandparent-grandchild relationship with automatic reverse
   */
  async createGrandparentGrandchildRelationship(
    grandparentId: string, 
    grandchildId: string
  ): Promise<string[]> {
    // Check if relationship already exists
    const existing = await this.getRelationshipBetween(grandparentId, grandchildId);
    const hasGrandparentGrandchild = existing.some(rel => 
      (rel.fromMemberId === grandparentId && rel.toMemberId === grandchildId && rel.type === 'grandchild') ||
      (rel.fromMemberId === grandchildId && rel.toMemberId === grandparentId && rel.type === 'grandparent')
    );
    
    if (hasGrandparentGrandchild) {
      throw new DuplicateError('Relationship', 'type', `grandparent-grandchild between ${grandparentId} and ${grandchildId}`);
    }

    const grandchildRelId = await this.create({
      fromMemberId: grandparentId,
      toMemberId: grandchildId,
      type: 'grandchild'
    });

    const grandparentRelId = await this.create({
      fromMemberId: grandchildId,
      toMemberId: grandparentId,
      type: 'grandparent'
    });

    return [grandchildRelId, grandparentRelId];
  }

  /**
   * Delete bidirectional relationship
   */
  async deleteBidirectionalRelationship(
    memberId1: string, 
    memberId2: string, 
    type: RelationshipType
  ): Promise<boolean> {
    const relationships = await this.getRelationshipBetween(memberId1, memberId2);
    const toDelete = relationships.filter(rel => rel.type === type);
    
    if (toDelete.length === 0) {
      return false;
    }

    await db.relationships.bulkDelete(toDelete.map(rel => rel.id));
    return true;
  }

  /**
   * Validate relationship data and business rules
   */
  private async validateRelationshipData(data: Partial<Relationship>): Promise<void> {
    if (!data.fromMemberId || !data.toMemberId) {
      throw new ValidationError('Both fromMemberId and toMemberId are required');
    }

    if (data.fromMemberId === data.toMemberId) {
      throw new ValidationError('Cannot create relationship with self');
    }

    if (!data.type) {
      throw new ValidationError('Relationship type is required');
    }

    // Validate that both members exist
    const fromMemberExists = await db.familyMembers.where('id').equals(data.fromMemberId).count() > 0;
    const toMemberExists = await db.familyMembers.where('id').equals(data.toMemberId).count() > 0;

    if (!fromMemberExists) {
      throw new ValidationError(`Family member with ID ${data.fromMemberId} does not exist`);
    }

    if (!toMemberExists) {
      throw new ValidationError(`Family member with ID ${data.toMemberId} does not exist`);
    }

    // Validate relationship logic
    await this.validateRelationshipLogic(data.fromMemberId, data.toMemberId, data.type);
  }

  /**
   * Validate relationship business logic to prevent impossible relationships
   */
  private async validateRelationshipLogic(
    fromMemberId: string, 
    toMemberId: string, 
    type: RelationshipType
  ): Promise<void> {
    const existingRelationships = await this.getRelationshipBetween(fromMemberId, toMemberId);

    // Check for conflicting relationships
    for (const existing of existingRelationships) {
      if (this.areConflictingRelationships(existing.type, type)) {
        throw new ValidationError(
          `Cannot create ${type} relationship: conflicts with existing ${existing.type} relationship`
        );
      }
    }

    // Additional validation based on relationship type
    switch (type) {
      case 'spouse':
        await this.validateSpouseRelationship(fromMemberId, toMemberId);
        break;
      case 'parent':
      case 'child':
        await this.validateParentChildRelationship(fromMemberId, toMemberId, type);
        break;
      case 'grandparent':
      case 'grandchild':
        await this.validateGrandparentGrandchildRelationship(fromMemberId, toMemberId, type);
        break;
    }
  }

  /**
   * Check if two relationship types conflict
   */
  private areConflictingRelationships(type1: RelationshipType, type2: RelationshipType): boolean {
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
   * Validate spouse relationship rules
   */
  private async validateSpouseRelationship(memberId1: string, memberId2: string): Promise<void> {
    // Check if either member already has a spouse (assuming monogamy)
    const member1Spouses = await this.getSpouses(memberId1);
    const member2Spouses = await this.getSpouses(memberId2);

    if (member1Spouses.length > 0) {
      throw new ValidationError('Family member already has a spouse');
    }

    if (member2Spouses.length > 0) {
      throw new ValidationError('Family member already has a spouse');
    }
  }

  /**
   * Validate parent-child relationship rules
   */
  private async validateParentChildRelationship(
    fromMemberId: string, 
    toMemberId: string, 
    type: RelationshipType
  ): Promise<void> {
    // Get birth dates to validate age relationships
    const fromMember = await db.familyMembers.get(fromMemberId);
    const toMember = await db.familyMembers.get(toMemberId);

    if (fromMember && toMember && type === 'child') {
      // Parent should be older than child
      if (fromMember.dateOfBirth >= toMember.dateOfBirth) {
        throw new ValidationError('Parent must be born before child');
      }
    }
  }

  /**
   * Validate grandparent-grandchild relationship rules
   */
  private async validateGrandparentGrandchildRelationship(
    fromMemberId: string, 
    toMemberId: string, 
    type: RelationshipType
  ): Promise<void> {
    // Get birth dates to validate age relationships
    const fromMember = await db.familyMembers.get(fromMemberId);
    const toMember = await db.familyMembers.get(toMemberId);

    if (fromMember && toMember && type === 'grandchild') {
      // Grandparent should be significantly older than grandchild
      const ageDifference = toMember.dateOfBirth.getTime() - fromMember.dateOfBirth.getTime();
      const yearsInMs = 365.25 * 24 * 60 * 60 * 1000;
      const yearsDifference = ageDifference / yearsInMs;

      if (yearsDifference < 20) {
        throw new ValidationError('Grandparent must be at least 20 years older than grandchild');
      }
    }
  }
}