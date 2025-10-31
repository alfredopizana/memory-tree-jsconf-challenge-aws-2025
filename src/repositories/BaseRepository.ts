/**
 * Base repository interface defining common CRUD operations
 * All repositories should implement this interface for consistency
 */
export interface BaseRepository<T, K = string> {
  /**
   * Create a new entity
   */
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<K>;

  /**
   * Get entity by ID
   */
  getById(id: K): Promise<T | undefined>;

  /**
   * Get all entities
   */
  getAll(): Promise<T[]>;

  /**
   * Update existing entity
   */
  update(id: K, updates: Partial<T>): Promise<boolean>;

  /**
   * Delete entity by ID
   */
  delete(id: K): Promise<boolean>;

  /**
   * Check if entity exists
   */
  exists(id: K): Promise<boolean>;

  /**
   * Get count of entities
   */
  count(): Promise<number>;
}

/**
 * Common repository error types
 */
export class RepositoryError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class NotFoundError extends RepositoryError {
  constructor(entityType: string, id: string) {
    super(`${entityType} with id ${id} not found`, 'NOT_FOUND');
  }
}

export class ValidationError extends RepositoryError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class DuplicateError extends RepositoryError {
  constructor(entityType: string, field: string, value: string) {
    super(`${entityType} with ${field} ${value} already exists`, 'DUPLICATE');
  }
}