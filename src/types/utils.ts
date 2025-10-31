/**
 * Data transformation utilities for the Día de los Muertos Memory Tree application
 */

/**
 * Generates a unique ID using timestamp and random string
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomStr}`;
}

/**
 * Date transformation utilities
 */
export class DateUtils {
  
  /**
   * Converts a date string or Date object to a Date instance
   * Handles various input formats safely
   */
  static parseDate(dateInput: string | Date | null | undefined): Date | null {
    if (!dateInput) return null;
    
    if (dateInput instanceof Date) {
      return isNaN(dateInput.getTime()) ? null : dateInput;
    }
    
    if (typeof dateInput === 'string') {
      const parsed = new Date(dateInput);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    
    return null;
  }

  /**
   * Formats a date for display in the UI
   * Returns a culturally appropriate format
   */
  static formatDisplayDate(date: Date | null): string {
    if (!date) return '';
    
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  /**
   * Formats a date for storage (ISO string)
   */
  static formatStorageDate(date: Date): string {
    return date.toISOString();
  }

  /**
   * Calculates age at death or current age
   */
  static calculateAge(birthDate: Date, deathDate?: Date): number {
    const endDate = deathDate || new Date();
    const ageInMs = endDate.getTime() - birthDate.getTime();
    return Math.floor(ageInMs / (1000 * 60 * 60 * 24 * 365.25));
  }

  /**
   * Determines if a person is deceased based on death date
   */
  static isDeceased(deathDate?: Date): boolean {
    return deathDate !== undefined && deathDate !== null;
  }

  /**
   * Validates that a date is reasonable for a birth date
   */
  static isValidBirthDate(date: Date): boolean {
    const now = new Date();
    const minDate = new Date(1850, 0, 1); // Reasonable minimum birth year
    return date >= minDate && date <= now;
  }

  /**
   * Validates that a death date is reasonable
   */
  static isValidDeathDate(deathDate: Date, birthDate: Date): boolean {
    const now = new Date();
    return deathDate > birthDate && deathDate <= now;
  }
}

/**
 * Position utilities for altar layout
 */
export class PositionUtils {
  
  /**
   * Calculates the next available order position for a given altar level
   */
  static getNextOrderPosition(existingPositions: Array<{ level: number; order: number }>, targetLevel: number): number {
    const levelPositions = existingPositions
      .filter(pos => pos.level === targetLevel)
      .map(pos => pos.order);
    
    if (levelPositions.length === 0) return 0;
    
    return Math.max(...levelPositions) + 1;
  }

  /**
   * Validates that a position is within reasonable bounds
   */
  static isValidPosition(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x <= 10000 && y <= 10000; // Reasonable bounds
  }

  /**
   * Normalizes rotation to 0-359 degrees
   */
  static normalizeRotation(rotation: number): number {
    return ((rotation % 360) + 360) % 360;
  }
}

/**
 * String utilities for data processing
 */
export class StringUtils {
  
  /**
   * Sanitizes user input strings
   */
  static sanitizeString(input: string): string {
    return input.trim().replace(/\s+/g, ' ');
  }

  /**
   * Validates that a string is not empty after trimming
   */
  static isNonEmptyString(input: string | null | undefined): boolean {
    return typeof input === 'string' && input.trim().length > 0;
  }

  /**
   * Truncates text to a maximum length with ellipsis
   */
  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Generates a display name from name and preferred name
   */
  static getDisplayName(name: string, preferredName?: string): string {
    if (!preferredName || preferredName.trim().length === 0) {
      return name;
    }
    return `${name} "${preferredName}"`;
  }
}

/**
 * Array utilities for data manipulation
 */
export class ArrayUtils {
  
  /**
   * Removes duplicates from an array of strings
   */
  static removeDuplicates(array: string[]): string[] {
    return [...new Set(array)];
  }

  /**
   * Safely adds an item to an array if it doesn't exist
   */
  static addUnique<T>(array: T[], item: T): T[] {
    return array.includes(item) ? array : [...array, item];
  }

  /**
   * Safely removes an item from an array
   */
  static removeItem<T>(array: T[], item: T): T[] {
    return array.filter(i => i !== item);
  }
}

/**
 * Object utilities for data transformation
 */
export class ObjectUtils {
  
  /**
   * Deep clones an object (for simple objects without functions)
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Merges two objects, with the second object taking precedence
   */
  static merge<T>(obj1: Partial<T>, obj2: Partial<T>): T {
    return { ...obj1, ...obj2 } as T;
  }

  /**
   * Removes undefined and null values from an object
   */
  static removeNullish<T extends Record<string, any>>(obj: T): Partial<T> {
    const result: Partial<T> = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        result[key as keyof T] = value;
      }
    });
    return result;
  }
}