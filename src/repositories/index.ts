// Database and core exports
export { db, MemoryTreeDatabase } from './database';
export type { ImageBlob } from './database';

// Migration utilities
export { 
  runMigrations, 
  backupDatabase, 
  restoreDatabase, 
  checkDatabaseIntegrity 
} from './migrations';
export type { MigrationResult } from './migrations';

// Base repository interfaces and errors
export type { BaseRepository } from './BaseRepository';
export { 
  RepositoryError, 
  NotFoundError, 
  ValidationError, 
  DuplicateError 
} from './BaseRepository';

// Repository implementations
export { FamilyMemberRepository } from './FamilyMemberRepository';
export { MemoryRepository } from './MemoryRepository';
export { ImageRepository } from './ImageRepository';
export { RelationshipRepository } from './RelationshipRepository';
export { AltarStateRepository } from './AltarStateRepository';

// Create repository instances (singletons)
import { FamilyMemberRepository } from './FamilyMemberRepository';
import { MemoryRepository } from './MemoryRepository';
import { ImageRepository } from './ImageRepository';
import { RelationshipRepository } from './RelationshipRepository';
import { AltarStateRepository } from './AltarStateRepository';

export const familyMemberRepository = new FamilyMemberRepository();
export const memoryRepository = new MemoryRepository();
export const imageRepository = new ImageRepository();
export const relationshipRepository = new RelationshipRepository();
export const altarStateRepository = new AltarStateRepository();