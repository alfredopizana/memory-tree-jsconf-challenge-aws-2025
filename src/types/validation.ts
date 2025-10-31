import { 
  FamilyMember, 
  Relationship, 
  Memory, 
  DecorationElement, 
  AltarState,
  RelationshipType,
  DecorationType,
  DecorationSize,
  AltarTheme
} from './index';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validation utilities for data models
 */
export class ValidationService {
  
  /**
   * Validates a FamilyMember object
   * Requirements: 1.1, 1.3
   */
  static validateFamilyMember(member: Partial<FamilyMember>): ValidationResult {
    const errors: string[] = [];

    // Required fields validation
    if (!member.name || member.name.trim().length === 0) {
      errors.push('Name is required and cannot be empty');
    }

    if (!member.dateOfBirth) {
      errors.push('Date of birth is required');
    } else if (!(member.dateOfBirth instanceof Date) || isNaN(member.dateOfBirth.getTime())) {
      errors.push('Date of birth must be a valid date');
    }

    // Date logic validation
    if (member.dateOfBirth && member.dateOfDeath) {
      if (member.dateOfDeath <= member.dateOfBirth) {
        errors.push('Date of death must be after date of birth');
      }
    }

    // Generation validation
    if (member.generation !== undefined && (member.generation < 0 || !Number.isInteger(member.generation))) {
      errors.push('Generation must be a non-negative integer');
    }

    // Altar position validation
    if (member.altarPosition) {
      if (member.altarPosition.level < 0 || !Number.isInteger(member.altarPosition.level)) {
        errors.push('Altar level must be a non-negative integer');
      }
      if (member.altarPosition.order < 0 || !Number.isInteger(member.altarPosition.order)) {
        errors.push('Altar order must be a non-negative integer');
      }
    }

    // Photos validation
    if (member.photos && !Array.isArray(member.photos)) {
      errors.push('Photos must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates a Relationship object
   * Requirements: 5.1
   */
  static validateRelationship(relationship: Partial<Relationship>): ValidationResult {
    const errors: string[] = [];

    // Required fields validation
    if (!relationship.fromMemberId || relationship.fromMemberId.trim().length === 0) {
      errors.push('From member ID is required');
    }

    if (!relationship.toMemberId || relationship.toMemberId.trim().length === 0) {
      errors.push('To member ID is required');
    }

    // Self-relationship validation
    if (relationship.fromMemberId === relationship.toMemberId) {
      errors.push('A family member cannot have a relationship with themselves');
    }

    // Relationship type validation
    const validTypes: RelationshipType[] = ['parent', 'child', 'sibling', 'spouse', 'grandparent', 'grandchild'];
    if (!relationship.type || !validTypes.includes(relationship.type)) {
      errors.push(`Relationship type must be one of: ${validTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates a Memory object
   * Requirements: 4.1
   */
  static validateMemory(memory: Partial<Memory>): ValidationResult {
    const errors: string[] = [];

    // Required fields validation
    if (!memory.title || memory.title.trim().length === 0) {
      errors.push('Memory title is required and cannot be empty');
    }

    if (!memory.content || memory.content.trim().length === 0) {
      errors.push('Memory content is required and cannot be empty');
    }

    // Content length validation
    if (memory.content && memory.content.length > 10000) {
      errors.push('Memory content cannot exceed 10,000 characters');
    }

    // Associated members validation
    if (memory.associatedMemberIds && !Array.isArray(memory.associatedMemberIds)) {
      errors.push('Associated member IDs must be an array');
    }

    if (memory.associatedMemberIds && memory.associatedMemberIds.length === 0) {
      errors.push('Memory must be associated with at least one family member');
    }

    // Photos validation
    if (memory.photos && !Array.isArray(memory.photos)) {
      errors.push('Photos must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates a DecorationElement object
   */
  static validateDecorationElement(decoration: Partial<DecorationElement>): ValidationResult {
    const errors: string[] = [];

    // Decoration type validation
    const validTypes: DecorationType[] = ['cempasuchil', 'papel-picado', 'salt-cross', 'candle', 'offering'];
    if (!decoration.type || !validTypes.includes(decoration.type)) {
      errors.push(`Decoration type must be one of: ${validTypes.join(', ')}`);
    }

    // Position validation
    if (!decoration.position) {
      errors.push('Position is required for decoration elements');
    } else {
      if (typeof decoration.position.x !== 'number' || decoration.position.x < 0) {
        errors.push('Position x must be a non-negative number');
      }
      if (typeof decoration.position.y !== 'number' || decoration.position.y < 0) {
        errors.push('Position y must be a non-negative number');
      }
      if (typeof decoration.position.level !== 'number' || decoration.position.level < 0 || !Number.isInteger(decoration.position.level)) {
        errors.push('Position level must be a non-negative integer');
      }
    }

    // Size validation
    const validSizes: DecorationSize[] = ['small', 'medium', 'large'];
    if (!decoration.size || !validSizes.includes(decoration.size)) {
      errors.push(`Decoration size must be one of: ${validSizes.join(', ')}`);
    }

    // Rotation validation
    if (typeof decoration.rotation !== 'number' || decoration.rotation < 0 || decoration.rotation >= 360) {
      errors.push('Rotation must be a number between 0 and 359 degrees');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates an AltarState object
   */
  static validateAltarState(altarState: Partial<AltarState>): ValidationResult {
    const errors: string[] = [];

    // Required fields validation
    if (!altarState.name || altarState.name.trim().length === 0) {
      errors.push('Altar state name is required and cannot be empty');
    }

    // Member positions validation
    if (!altarState.memberPositions || typeof altarState.memberPositions !== 'object') {
      errors.push('Member positions must be an object');
    } else {
      Object.entries(altarState.memberPositions).forEach(([memberId, position]) => {
        if (!memberId || memberId.trim().length === 0) {
          errors.push('Member ID cannot be empty in member positions');
        }
        if (typeof position.level !== 'number' || position.level < 0 || !Number.isInteger(position.level)) {
          errors.push(`Invalid level for member ${memberId}: must be a non-negative integer`);
        }
        if (typeof position.order !== 'number' || position.order < 0 || !Number.isInteger(position.order)) {
          errors.push(`Invalid order for member ${memberId}: must be a non-negative integer`);
        }
      });
    }

    // Decorations validation
    if (!altarState.decorations || !Array.isArray(altarState.decorations)) {
      errors.push('Decorations must be an array');
    } else {
      altarState.decorations.forEach((decoration, index) => {
        const decorationValidation = this.validateDecorationElement(decoration);
        if (!decorationValidation.isValid) {
          errors.push(`Decoration ${index}: ${decorationValidation.errors.join(', ')}`);
        }
      });
    }

    // Background theme validation
    const validThemes: AltarTheme[] = ['traditional', 'modern', 'minimal'];
    if (!altarState.backgroundTheme || !validThemes.includes(altarState.backgroundTheme)) {
      errors.push(`Background theme must be one of: ${validThemes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}