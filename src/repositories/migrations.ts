import { db } from './database';

/**
 * Database migration utilities for handling schema changes
 * Ensures data integrity during application updates
 */

export interface MigrationResult {
  success: boolean;
  version: number;
  error?: string;
}

/**
 * Migration functions for each database version
 */
const migrations: Record<number, () => Promise<void>> = {
  // Future migrations will be added here as needed
  // Example:
  // 2: async () => {
  //   // Migration logic for version 2
  // }
};

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<MigrationResult> {
  try {
    const currentVersion = db.verno;
    
    // Check if any migrations need to be run
    const pendingMigrations = Object.keys(migrations)
      .map(Number)
      .filter(version => version > currentVersion)
      .sort((a, b) => a - b);

    if (pendingMigrations.length === 0) {
      return {
        success: true,
        version: currentVersion
      };
    }

    // Run pending migrations in order
    for (const version of pendingMigrations) {
      const migrationFn = migrations[version as keyof typeof migrations];
      if (migrationFn) {
        await migrationFn();
      }
    }

    return {
      success: true,
      version: Math.max(...pendingMigrations)
    };
  } catch (error) {
    return {
      success: false,
      version: db.verno,
      error: error instanceof Error ? error.message : 'Unknown migration error'
    };
  }
}

/**
 * Backup database data to JSON format
 */
export async function backupDatabase(): Promise<string> {
  const backup = {
    version: db.verno,
    timestamp: new Date().toISOString(),
    data: {
      familyMembers: await db.familyMembers.toArray(),
      relationships: await db.relationships.toArray(),
      memories: await db.memories.toArray(),
      decorations: await db.decorations.toArray(),
      altarStates: await db.altarStates.toArray()
      // Note: Images are not included in JSON backup due to size
    }
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Restore database from JSON backup
 * Warning: This will clear existing data
 */
export async function restoreDatabase(backupJson: string): Promise<MigrationResult> {
  try {
    const backup = JSON.parse(backupJson);
    
    await db.transaction('rw', db.tables, async () => {
      // Clear existing data (except images)
      await db.familyMembers.clear();
      await db.relationships.clear();
      await db.memories.clear();
      await db.decorations.clear();
      await db.altarStates.clear();

      // Restore data
      if (backup.data.familyMembers) {
        await db.familyMembers.bulkAdd(backup.data.familyMembers);
      }
      if (backup.data.relationships) {
        await db.relationships.bulkAdd(backup.data.relationships);
      }
      if (backup.data.memories) {
        await db.memories.bulkAdd(backup.data.memories);
      }
      if (backup.data.decorations) {
        await db.decorations.bulkAdd(backup.data.decorations);
      }
      if (backup.data.altarStates) {
        await db.altarStates.bulkAdd(backup.data.altarStates);
      }
    });

    return {
      success: true,
      version: backup.version || db.verno
    };
  } catch (error) {
    return {
      success: false,
      version: db.verno,
      error: error instanceof Error ? error.message : 'Failed to restore backup'
    };
  }
}

/**
 * Check database integrity and repair if needed
 */
export async function checkDatabaseIntegrity(): Promise<{
  isValid: boolean;
  issues: string[];
  repaired: boolean;
}> {
  const issues: string[] = [];
  let repaired = false;

  try {
    // Check for orphaned relationships
    const relationships = await db.relationships.toArray();
    const memberIds = new Set((await db.familyMembers.toArray()).map(m => m.id));
    
    const orphanedRelationships = relationships.filter(
      rel => !memberIds.has(rel.fromMemberId) || !memberIds.has(rel.toMemberId)
    );

    if (orphanedRelationships.length > 0) {
      issues.push(`Found ${orphanedRelationships.length} orphaned relationships`);
      
      // Remove orphaned relationships
      await db.relationships.bulkDelete(orphanedRelationships.map(r => r.id));
      repaired = true;
    }

    // Check for orphaned memory associations
    const memories = await db.memories.toArray();
    for (const memory of memories) {
      const validMemberIds = memory.associatedMemberIds.filter(id => memberIds.has(id));
      
      if (validMemberIds.length !== memory.associatedMemberIds.length) {
        issues.push(`Memory "${memory.title}" has orphaned member associations`);
        
        // Update memory with valid associations only
        await db.memories.update(memory.id, {
          associatedMemberIds: validMemberIds
        });
        repaired = true;
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      repaired
    };
  } catch (error) {
    return {
      isValid: false,
      issues: [`Database integrity check failed: ${error}`],
      repaired: false
    };
  }
}