import React, { useState, useEffect, useMemo } from 'react';
import { Memory, FamilyMember } from '../../types';
import { MemoryManager } from '../../services/MemoryManager';
import { FamilyMemberRepository } from '../../repositories/FamilyMemberRepository';
import { Button } from '../Button/Button';
import { Input } from '../Input/Input';
import { Card } from '../Card/Card';
import { Loading } from '../Loading/Loading';
import styles from './MemoryAssociationManager.module.css';

export interface MemoryAssociationManagerProps {
  memory: Memory;
  onAssociationsUpdate: (memory: Memory, associatedMembers: FamilyMember[]) => void;
  onClose: () => void;
}

interface FamilyMemberWithSelection extends FamilyMember {
  isSelected: boolean;
  isOriginallyAssociated: boolean;
}

export const MemoryAssociationManager: React.FC<MemoryAssociationManagerProps> = ({
  memory,
  onAssociationsUpdate,
  onClose,
}) => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberWithSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const memoryManager = useMemo(() => new MemoryManager(), []);
  const familyMemberRepository = useMemo(() => new FamilyMemberRepository(), []);

  // Load all family members and mark which ones are associated
  useEffect(() => {
    const loadFamilyMembers = async () => {
      setLoading(true);
      setError(null);

      try {
        const allMembers = await familyMemberRepository.getAll();
        const membersWithSelection: FamilyMemberWithSelection[] = allMembers.map(member => ({
          ...member,
          isSelected: memory.associatedMemberIds.includes(member.id),
          isOriginallyAssociated: memory.associatedMemberIds.includes(member.id),
        }));

        setFamilyMembers(membersWithSelection);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load family members');
      } finally {
        setLoading(false);
      }
    };

    loadFamilyMembers();
  }, [memory.associatedMemberIds, familyMemberRepository]);

  // Filter family members based on search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) {
      return familyMembers;
    }

    const query = searchQuery.toLowerCase();
    return familyMembers.filter(member => 
      member.name.toLowerCase().includes(query) ||
      (member.preferredName && member.preferredName.toLowerCase().includes(query))
    );
  }, [familyMembers, searchQuery]);

  // Get counts for display
  const selectedCount = familyMembers.filter(m => m.isSelected).length;
  const originalCount = familyMembers.filter(m => m.isOriginallyAssociated).length;
  const hasChanges = familyMembers.some(m => m.isSelected !== m.isOriginallyAssociated);

  const handleMemberToggle = (memberId: string) => {
    setFamilyMembers(prev => prev.map(member => 
      member.id === memberId 
        ? { ...member, isSelected: !member.isSelected }
        : member
    ));
  };

  const handleSelectAll = () => {
    setFamilyMembers(prev => prev.map(member => ({ ...member, isSelected: true })));
  };

  const handleDeselectAll = () => {
    setFamilyMembers(prev => prev.map(member => ({ ...member, isSelected: false })));
  };

  const handleResetToOriginal = () => {
    setFamilyMembers(prev => prev.map(member => ({ 
      ...member, 
      isSelected: member.isOriginallyAssociated 
    })));
  };

  const handleSave = async () => {
    const selectedMemberIds = familyMembers
      .filter(member => member.isSelected)
      .map(member => member.id);

    if (selectedMemberIds.length === 0) {
      setError('At least one family member must be associated with the memory');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Update the memory associations
      const result = await memoryManager.updateMemory(memory.id, {
        associatedMemberIds: selectedMemberIds
      });

      if (result.success) {
        const updatedMemory: Memory = {
          ...memory,
          associatedMemberIds: selectedMemberIds,
          updatedAt: new Date()
        };

        const associatedMembers = familyMembers.filter(member => member.isSelected);
        onAssociationsUpdate(updatedMemory, associatedMembers);
        onClose();
      } else {
        setError(result.errors?.join(', ') || 'Failed to update associations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save associations');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <Card variant="elevated" padding="none" className={styles.modalCard || ''}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <h2 className={styles.title}>Associate Memory with Family Members</h2>
              <Button
                variant="ghost"
                size="small"
                onClick={onClose}
                className={styles.closeButton}
                aria-label="Close"
              >
                ×
              </Button>
            </div>
            
            <div className={styles.memoryInfo}>
              <h3 className={styles.memoryTitle}>{memory.title}</h3>
              <p className={styles.memoryMeta}>
                Created: {formatDate(memory.createdAt)}
                {memory.photos.length > 0 && (
                  <span className={styles.photoCount}>
                    • {memory.photos.length} photo{memory.photos.length !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className={styles.controls}>
            <div className={styles.searchSection}>
              <Input
                type="text"
                placeholder="Search family members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.selectionControls}>
              <div className={styles.selectionInfo}>
                <span className={styles.selectionCount}>
                  {selectedCount} of {familyMembers.length} selected
                  {hasChanges && (
                    <span className={styles.changesIndicator}>
                      (was {originalCount})
                    </span>
                  )}
                </span>
              </div>

              <div className={styles.bulkActions}>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={handleSelectAll}
                  disabled={selectedCount === familyMembers.length}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={handleDeselectAll}
                  disabled={selectedCount === 0}
                >
                  Deselect All
                </Button>
                {hasChanges && (
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={handleResetToOriginal}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          {/* Family Members List */}
          <div className={styles.membersList}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <Loading />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className={styles.emptyState}>
                {searchQuery ? (
                  <p>No family members found matching "{searchQuery}"</p>
                ) : (
                  <p>No family members available</p>
                )}
              </div>
            ) : (
              filteredMembers.map(member => (
                <FamilyMemberSelectionCard
                  key={member.id}
                  member={member}
                  isSelected={member.isSelected}
                  isOriginallyAssociated={member.isOriginallyAssociated}
                  onToggle={() => handleMemberToggle(member.id)}
                />
              ))
            )}
          </div>

          {/* Footer Actions */}
          <div className={styles.footer}>
            <div className={styles.footerActions}>
              <Button
                variant="ghost"
                size="medium"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="medium"
                onClick={handleSave}
                disabled={saving || !hasChanges || selectedCount === 0}
              >
                {saving ? 'Saving...' : 'Save Associations'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Family Member Selection Card Component
interface FamilyMemberSelectionCardProps {
  member: FamilyMemberWithSelection;
  isSelected: boolean;
  isOriginallyAssociated: boolean;
  onToggle: () => void;
}

const FamilyMemberSelectionCard: React.FC<FamilyMemberSelectionCardProps> = ({
  member,
  isSelected,
  isOriginallyAssociated,
  onToggle,
}) => {
  const displayName = member.preferredName || member.name;
  const isDeceased = !!member.dateOfDeath;
  const hasChanged = isSelected !== isOriginallyAssociated;

  const formatLifeSpan = () => {
    const birthYear = member.dateOfBirth.getFullYear();
    const deathYear = member.dateOfDeath?.getFullYear();
    return deathYear ? `${birthYear} - ${deathYear}` : `${birthYear} - present`;
  };

  return (
    <div
      className={`${styles.memberCard} ${isSelected ? styles.selected : ''} ${hasChanged ? styles.changed : ''}`}
      onClick={onToggle}
    >
      <div className={styles.memberCardContent}>
        <div className={styles.selectionIndicator}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            className={styles.checkbox}
            aria-label={`${isSelected ? 'Deselect' : 'Select'} ${displayName}`}
          />
        </div>

        <div className={styles.memberPhoto}>
          {member.photos?.[0] ? (
            <img
              src={member.photos[0]}
              alt={`Photo of ${displayName}`}
              className={styles.photo}
            />
          ) : (
            <div className={styles.photoPlaceholder}>
              <span className={styles.photoIcon}>👤</span>
            </div>
          )}
          {isDeceased && <div className={styles.deceasedIndicator}>🕯️</div>}
        </div>

        <div className={styles.memberInfo}>
          <h4 className={styles.memberName}>{displayName}</h4>
          {member.name !== displayName && (
            <p className={styles.fullName}>({member.name})</p>
          )}
          <p className={styles.lifeSpan}>{formatLifeSpan()}</p>
          {member.generation && (
            <p className={styles.generation}>Generation {member.generation}</p>
          )}
        </div>

        <div className={styles.statusIndicators}>
          {isOriginallyAssociated && (
            <span className={styles.originallyAssociated} title="Originally associated">
              📌
            </span>
          )}
          {hasChanged && (
            <span className={styles.changeIndicator} title="Changed">
              {isSelected ? '➕' : '➖'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};