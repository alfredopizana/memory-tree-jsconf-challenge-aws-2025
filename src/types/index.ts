// Core data models for Día de los Muertos Memory Tree application

/**
 * Position interface for 2D coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Family member interface representing an individual in the family tree
 * Requirements: 1.1, 1.3
 */
export interface FamilyMember {
  id: string;
  name: string;
  preferredName?: string;
  dateOfBirth: Date;
  dateOfDeath?: Date;
  photos: string[]; // IndexedDB blob references
  generation?: number;
  altarPosition: {
    level: number;
    order: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Relationship types supported in the family tree
 * Requirements: 5.1
 */
export type RelationshipType = 
  | 'parent' 
  | 'child' 
  | 'sibling' 
  | 'spouse' 
  | 'grandparent' 
  | 'grandchild';

/**
 * Relationship interface defining connections between family members
 * Requirements: 5.1
 */
export interface Relationship {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  type: RelationshipType;
  createdAt: Date;
}

/**
 * Memory interface for storing family stories and remembrances
 * Requirements: 4.1
 */
export interface Memory {
  id: string;
  title: string;
  content: string;
  photos: string[]; // IndexedDB blob references
  associatedMemberIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Decoration types for traditional Day of the Dead altar elements
 */
export type DecorationType = 
  | 'cempasuchil' 
  | 'papel-picado' 
  | 'salt-cross' 
  | 'candle' 
  | 'offering';

/**
 * Size options for decoration elements
 */
export type DecorationSize = 'small' | 'medium' | 'large';

/**
 * Decoration element interface for altar decorations
 */
export interface DecorationElement {
  id: string;
  type: DecorationType;
  position: {
    x: number;
    y: number;
    level: number;
  };
  size: DecorationSize;
  rotation: number;
}

/**
 * Altar theme options
 */
export type AltarTheme = 'traditional' | 'modern' | 'minimal';

/**
 * Altar state interface for persisting altar layout and configuration
 */
export interface AltarState {
  id: string;
  name: string;
  memberPositions: Record<string, { level: number; order: number }>;
  decorations: DecorationElement[];
  backgroundTheme: AltarTheme;
  lastModified: Date;
}

// Re-export validation and utility functions
export * from './validation';
export * from './utils';