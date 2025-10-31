import Dexie, { Table } from 'dexie';
import { 
  FamilyMember, 
  Relationship, 
  Memory, 
  DecorationElement, 
  AltarState 
} from '../types';

/**
 * Interface for storing image blobs in IndexedDB
 */
export interface ImageBlob {
  id: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  uploadedAt: Date;
}

/**
 * Main database class for Día de los Muertos Memory Tree application
 * Handles all IndexedDB operations with proper schema versioning
 */
export class MemoryTreeDatabase extends Dexie {
  // Define tables with proper typing
  familyMembers!: Table<FamilyMember>;
  relationships!: Table<Relationship>;
  memories!: Table<Memory>;
  decorations!: Table<DecorationElement>;
  altarStates!: Table<AltarState>;
  images!: Table<ImageBlob>;

  constructor() {
    super('MemoryTreeDatabase');
    
    // Define schema version 1
    this.version(1).stores({
      familyMembers: 'id, name, dateOfBirth, dateOfDeath, generation, createdAt, updatedAt',
      relationships: 'id, fromMemberId, toMemberId, type, createdAt',
      memories: 'id, title, *associatedMemberIds, createdAt, updatedAt',
      decorations: 'id, type, position.level',
      altarStates: 'id, name, lastModified',
      images: 'id, filename, mimeType, uploadedAt'
    });

    // Add hooks for automatic timestamp management
    this.familyMembers.hook('creating', (_primKey, obj, _trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.familyMembers.hook('updating', (modifications, _primKey, _obj, _trans) => {
      (modifications as any).updatedAt = new Date();
    });

    this.memories.hook('creating', (_primKey, obj, _trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.memories.hook('updating', (modifications, _primKey, _obj, _trans) => {
      (modifications as any).updatedAt = new Date();
    });

    this.relationships.hook('creating', (_primKey, obj, _trans) => {
      obj.createdAt = new Date();
    });

    this.images.hook('creating', (_primKey, obj, _trans) => {
      obj.uploadedAt = new Date();
    });

    this.altarStates.hook('creating', (_primKey, obj, _trans) => {
      obj.lastModified = new Date();
    });

    this.altarStates.hook('updating', (modifications, _primKey, _obj, _trans) => {
      (modifications as any).lastModified = new Date();
    });
  }

  /**
   * Initialize database with default data if empty
   */
  async initializeDefaults(): Promise<void> {
    const memberCount = await this.familyMembers.count();
    
    if (memberCount === 0) {
      // Create default altar state
      const defaultAltarState: AltarState = {
        id: 'default-altar',
        name: 'Mi Altar Familiar',
        memberPositions: {},
        decorations: [],
        backgroundTheme: 'traditional',
        lastModified: new Date()
      };

      await this.altarStates.add(defaultAltarState);
    }
  }

  /**
   * Clear all data from the database (for testing or reset purposes)
   */
  async clearAllData(): Promise<void> {
    await this.transaction('rw', this.tables, async () => {
      await Promise.all(this.tables.map(table => table.clear()));
    });
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    familyMembers: number;
    relationships: number;
    memories: number;
    decorations: number;
    images: number;
  }> {
    return {
      familyMembers: await this.familyMembers.count(),
      relationships: await this.relationships.count(),
      memories: await this.memories.count(),
      decorations: await this.decorations.count(),
      images: await this.images.count()
    };
  }
}

// Create and export singleton database instance
export const db = new MemoryTreeDatabase();

// Initialize database when module is loaded
db.open().then(() => {
  return db.initializeDefaults();
}).catch(error => {
  console.error('Failed to initialize database:', error);
});