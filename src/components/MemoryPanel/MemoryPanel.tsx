import React, { useState, useEffect, useMemo } from 'react';
import { Memory, FamilyMember } from '../../types';
import { MemoryManager } from '../../services/MemoryManager';
import { Button } from '../Button/Button';
import { Input } from '../Input/Input';
import { Card } from '../Card/Card';
import { Loading } from '../Loading/Loading';
import { MemoryAssociationManager } from '../MemoryAssociationManager/MemoryAssociationManager';
import { MemoryPhotoManager } from '../MemoryPhotoManager/MemoryPhotoManager';
import styles from './MemoryPanel.module.css';

export interface MemoryPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedMemberIds?: string[];
  onMemorySelect?: (memory: Memory) => void;
  onMemoryCreate?: (memory: Memory) => void;
  onMemoryUpdate?: (memory: Memory) => void;
  onMemoryDelete?: (memoryId: string) => void;
}

interface MemoryWithMembers {
  memory: Memory;
  associatedMembers: FamilyMember[];
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({
  isOpen,
  onToggle,
  selectedMemberIds = [],
  onMemorySelect,
  onMemoryCreate,
  onMemoryUpdate,
  onMemoryDelete,
}) => {
  const [memories, setMemories] = useState<MemoryWithMembers[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'recent' | 'with-photos'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [managingAssociations, setManagingAssociations] = useState<Memory | null>(null);
  const [managingPhotos, setManagingPhotos] = useState<Memory | null>(null);

  const memoryManager = useMemo(() => new MemoryManager(), []);

  // Load memories based on filter and search
  const loadMemories = async () => {
    setLoading(true);
    setError(null);

    try {
      let result: { memories: Memory[]; associatedMembers: Record<string, FamilyMember[]> };
      
      if (searchQuery.trim()) {
        result = await memoryManager.searchMemories(searchQuery);
      } else if (selectedMemberIds.length > 0) {
        const memberResult = await memoryManager.getMemoriesForMembers(selectedMemberIds);
        // Transform the result to match our expected format
        result = {
          memories: memberResult.memories,
          associatedMembers: memberResult.memories.reduce((acc, memory) => {
            acc[memory.id] = memberResult.members.filter((member: FamilyMember) => 
              memory.associatedMemberIds.includes(member.id)
            );
            return acc;
          }, {} as Record<string, FamilyMember[]>)
        };
      } else {
        switch (filterType) {
          case 'recent':
            result = await memoryManager.getRecentMemories(30);
            break;
          case 'with-photos':
            result = await memoryManager.getMemoriesWithPhotos();
            break;
          default:
            result = await memoryManager.getAllMemoriesWithMembers();
        }
      }

      const memoriesWithMembers: MemoryWithMembers[] = result.memories.map(memory => ({
        memory,
        associatedMembers: result.associatedMembers[memory.id] || []
      }));

      setMemories(memoriesWithMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMemories();
    }
  }, [isOpen, searchQuery, filterType, selectedMemberIds]);

  const handleCreateMemory = () => {
    setIsCreating(true);
    setEditingMemory(null);
  };

  const handleEditMemory = (memory: Memory) => {
    setEditingMemory(memory);
    setIsCreating(false);
  };

  const handleMemoryFormSubmit = async (memoryData: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingMemory) {
        // Update existing memory
        const result = await memoryManager.updateMemory(editingMemory.id, memoryData);
        if (result.success) {
          const updatedMemory = { ...editingMemory, ...memoryData, updatedAt: new Date() };
          onMemoryUpdate?.(updatedMemory);
          setEditingMemory(null);
          await loadMemories();
        } else {
          setError(result.errors?.join(', ') || 'Failed to update memory');
        }
      } else {
        // Create new memory
        const result = await memoryManager.createMemory({
          title: memoryData.title,
          content: memoryData.content,
          associatedMemberIds: memoryData.associatedMemberIds,
        });
        
        if (result.success && result.memoryId) {
          const newMemory: Memory = {
            id: result.memoryId,
            ...memoryData,
            photos: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          onMemoryCreate?.(newMemory);
          setIsCreating(false);
          await loadMemories();
        } else {
          setError(result.errors?.join(', ') || 'Failed to create memory');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save memory');
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!confirm('Are you sure you want to delete this memory? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await memoryManager.deleteMemory(memoryId);
      if (result.success) {
        onMemoryDelete?.(memoryId);
        await loadMemories();
      } else {
        setError(result.errors?.join(', ') || 'Failed to delete memory');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete memory');
    }
  };

  const handleMemoryClick = (memory: Memory) => {
    onMemorySelect?.(memory);
  };

  const handleManageAssociations = (memory: Memory) => {
    setManagingAssociations(memory);
  };

  const handleManagePhotos = (memory: Memory) => {
    setManagingPhotos(memory);
  };

  const handleAssociationsUpdate = (updatedMemory: Memory, associatedMembers: FamilyMember[]) => {
    // Update the memory in our local state
    setMemories(prev => prev.map(item => 
      item.memory.id === updatedMemory.id 
        ? { memory: updatedMemory, associatedMembers }
        : item
    ));
    
    // Notify parent component
    onMemoryUpdate?.(updatedMemory);
    
    // Close the association manager
    setManagingAssociations(null);
  };

  const handlePhotosUpdate = (updatedMemory: Memory, _photoUrls: string[]) => {
    // Update the memory in our local state
    setMemories(prev => prev.map(item => 
      item.memory.id === updatedMemory.id 
        ? { ...item, memory: updatedMemory }
        : item
    ));
    
    // Notify parent component
    onMemoryUpdate?.(updatedMemory);
    
    // Close the photo manager
    setManagingPhotos(null);
  };

  return (
    <div className={`${styles.memoryPanel} ${isOpen ? styles.open : styles.closed}`}>
      {/* Panel Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h2 className={styles.title}>Family Memories</h2>
          <Button
            variant="ghost"
            size="small"
            onClick={onToggle}
            className={styles.toggleButton}
            aria-label={isOpen ? 'Close memory panel' : 'Open memory panel'}
          >
            {isOpen ? '×' : '📖'}
          </Button>
        </div>
      </div>

      {/* Panel Content */}
      {isOpen && (
        <div className={styles.content}>
          {/* Search and Filters */}
          <div className={styles.controls}>
            <Input
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            
            <div className={styles.filters}>
              <Button
                variant={filterType === 'all' ? 'primary' : 'ghost'}
                size="small"
                onClick={() => setFilterType('all')}
              >
                All
              </Button>
              <Button
                variant={filterType === 'recent' ? 'primary' : 'ghost'}
                size="small"
                onClick={() => setFilterType('recent')}
              >
                Recent
              </Button>
              <Button
                variant={filterType === 'with-photos' ? 'primary' : 'ghost'}
                size="small"
                onClick={() => setFilterType('with-photos')}
              >
                With Photos
              </Button>
            </div>

            <Button
              variant="accent"
              size="medium"
              onClick={handleCreateMemory}
              className={styles.createButton}
            >
              + New Memory
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className={styles.error} role="alert">
              {error}
              <Button
                variant="ghost"
                size="small"
                onClick={() => setError(null)}
                className={styles.errorClose}
              >
                ×
              </Button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className={styles.loadingContainer}>
              <Loading />
            </div>
          )}

          {/* Memory List */}
          {!loading && (
            <div className={styles.memoryList}>
              {memories.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No memories found</p>
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => setSearchQuery('')}
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                memories.map(({ memory, associatedMembers }) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    associatedMembers={associatedMembers}
                    onClick={() => handleMemoryClick(memory)}
                    onEdit={() => handleEditMemory(memory)}
                    onDelete={() => handleDeleteMemory(memory.id)}
                    onManageAssociations={() => handleManageAssociations(memory)}
                    onManagePhotos={() => handleManagePhotos(memory)}
                  />
                ))
              )}
            </div>
          )}

          {/* Memory Form */}
          {(isCreating || editingMemory) && (
            <MemoryForm
              memory={editingMemory}
              selectedMemberIds={selectedMemberIds}
              onSubmit={handleMemoryFormSubmit}
              onCancel={() => {
                setIsCreating(false);
                setEditingMemory(null);
              }}
            />
          )}
        </div>
      )}

      {/* Memory Association Manager */}
      {managingAssociations && (
        <MemoryAssociationManager
          memory={managingAssociations}
          onAssociationsUpdate={handleAssociationsUpdate}
          onClose={() => setManagingAssociations(null)}
        />
      )}

      {/* Memory Photo Manager */}
      {managingPhotos && (
        <MemoryPhotoManager
          memory={managingPhotos}
          onPhotosUpdate={handlePhotosUpdate}
          onClose={() => setManagingPhotos(null)}
        />
      )}
    </div>
  );
};

// Memory Card Component
interface MemoryCardProps {
  memory: Memory;
  associatedMembers: FamilyMember[];
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onManageAssociations: () => void;
  onManagePhotos: () => void;
}

const MemoryCard: React.FC<MemoryCardProps> = ({
  memory,
  associatedMembers,
  onClick,
  onEdit,
  onDelete,
  onManageAssociations,
  onManagePhotos,
}) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <Card
      variant="cultural"
      padding="medium"
      hoverable
      className={styles.memoryCard || ''}
    >
      <div className={styles.memoryCardContent} onClick={onClick}>
        <div className={styles.memoryHeader}>
          <h3 className={styles.memoryTitle}>{memory.title}</h3>
          <div className={styles.memoryMeta}>
            <span className={styles.memoryDate}>
              {formatDate(memory.createdAt)}
            </span>
            {memory.photos.length > 0 && (
              <span className={styles.photoIndicator}>
                📷 {memory.photos.length}
              </span>
            )}
          </div>
        </div>
        
        <p className={styles.memoryContent}>
          {memory.content.length > 150 
            ? `${memory.content.substring(0, 150)}...` 
            : memory.content
          }
        </p>
        
        {associatedMembers.length > 0 && (
          <div className={styles.associatedMembers}>
            <div className={styles.membersHeader}>
              <span className={styles.membersLabel}>Associated with:</span>
              <Button
                variant="ghost"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onManageAssociations();
                }}
                className={styles.manageButton}
                title="Manage associations"
              >
                🔗
              </Button>
            </div>
            <div className={styles.membersList}>
              {associatedMembers.map(member => (
                <span key={member.id} className={styles.memberName}>
                  {member.preferredName || member.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className={styles.memoryActions}>
        <Button
          variant="ghost"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onManagePhotos();
          }}
          title="Manage photos"
        >
          📷
        </Button>
        <Button
          variant="ghost"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={styles.deleteButton}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
};

// Memory Form Component (placeholder for now)
interface MemoryFormProps {
  memory?: Memory | null;
  selectedMemberIds: string[];
  onSubmit: (memoryData: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const MemoryForm: React.FC<MemoryFormProps> = ({
  onCancel,
}) => {
  // This will be implemented in the next subtask
  return (
    <div className={styles.memoryForm}>
      <p>Memory form will be implemented in the next subtask</p>
      <Button variant="ghost" onClick={onCancel}>Cancel</Button>
    </div>
  );
};