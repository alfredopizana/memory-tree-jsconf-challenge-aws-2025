import React, { useState, useEffect } from 'react';
import { FamilyMember, Relationship, RelationshipType } from '../../types';
import { RelationshipEngine } from '../../services/RelationshipEngine';
import { FamilyTreeManager } from '../../services/FamilyTreeManager';
import { Button } from '../Button';
import { Input } from '../Input';
import styles from './RelationshipManager.module.css';

export interface RelationshipManagerProps {
  member: FamilyMember;
  onRelationshipsUpdated: () => void;
  className?: string;
}

interface RelationshipForm {
  targetMemberId: string;
  relationshipType: RelationshipType;
}

interface RelatedMemberInfo {
  member: FamilyMember;
  relationship: Relationship;
  relationshipType: RelationshipType;
}

const RELATIONSHIP_LABELS: Record<RelationshipType, { singular: string; plural: string; description: string }> = {
  parent: { 
    singular: 'Padre/Madre', 
    plural: 'Padres', 
    description: 'Esta persona es padre/madre de' 
  },
  child: { 
    singular: 'Hijo/Hija', 
    plural: 'Hijos', 
    description: 'Esta persona es hijo/hija de' 
  },
  sibling: { 
    singular: 'Hermano/Hermana', 
    plural: 'Hermanos', 
    description: 'Esta persona es hermano/hermana de' 
  },
  spouse: { 
    singular: 'Esposo/Esposa', 
    plural: 'Cónyuges', 
    description: 'Esta persona está casada con' 
  },
  grandparent: { 
    singular: 'Abuelo/Abuela', 
    plural: 'Abuelos', 
    description: 'Esta persona es abuelo/abuela de' 
  },
  grandchild: { 
    singular: 'Nieto/Nieta', 
    plural: 'Nietos', 
    description: 'Esta persona es nieto/nieta de' 
  }
};

export const RelationshipManager: React.FC<RelationshipManagerProps> = ({
  member,
  onRelationshipsUpdated,
  className = '',
}) => {
  const [, setAllMembers] = useState<FamilyMember[]>([]);
  const [relatedMembers, setRelatedMembers] = useState<RelatedMemberInfo[]>([]);
  const [availableMembers, setAvailableMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<RelationshipForm>({
    targetMemberId: '',
    relationshipType: 'parent'
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const relationshipEngine = new RelationshipEngine();
  const familyTreeManager = new FamilyTreeManager();

  useEffect(() => {
    loadData();
  }, [member.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load all family members
      const members = await familyTreeManager.getAllFamilyMembers();
      setAllMembers(members);

      // Load existing relationships for this member
      const { relationships, relatedMembers: related } = await relationshipEngine.getMemberRelationships(member.id);
      
      // Create related member info with relationship details
      const relatedInfo: RelatedMemberInfo[] = [];
      for (const relationship of relationships) {
        const relatedMemberId = relationship.fromMemberId === member.id 
          ? relationship.toMemberId 
          : relationship.fromMemberId;
        
        const relatedMember = related.find(m => m.id === relatedMemberId);
        if (relatedMember) {
          // Determine the relationship type from this member's perspective
          let relationshipType = relationship.type;
          if (relationship.fromMemberId !== member.id) {
            // Reverse the relationship type if we're the target
            relationshipType = reverseRelationshipType(relationship.type);
          }

          relatedInfo.push({
            member: relatedMember,
            relationship,
            relationshipType
          });
        }
      }

      setRelatedMembers(relatedInfo);

      // Filter available members (exclude self and already related)
      const relatedIds = new Set(relatedInfo.map(info => info.member.id));
      const available = members.filter(m => m.id !== member.id && !relatedIds.has(m.id));
      setAvailableMembers(available);

    } catch (error) {
      console.error('Failed to load relationship data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const reverseRelationshipType = (type: RelationshipType): RelationshipType => {
    const reverseMap: Record<RelationshipType, RelationshipType> = {
      parent: 'child',
      child: 'parent',
      sibling: 'sibling',
      spouse: 'spouse',
      grandparent: 'grandchild',
      grandchild: 'grandparent'
    };
    return reverseMap[type];
  };

  const handleCreateRelationship = async () => {
    if (!formData.targetMemberId || !formData.relationshipType) {
      setErrors(['Por favor selecciona un miembro de la familia y tipo de relación']);
      return;
    }

    setIsCreating(true);
    setErrors([]);

    try {
      const result = await relationshipEngine.createRelationship(
        member.id,
        formData.targetMemberId,
        formData.relationshipType
      );

      if (result.success) {
        // Reset form
        setFormData({
          targetMemberId: '',
          relationshipType: 'parent'
        });
        setShowCreateForm(false);
        
        // Reload data
        await loadData();
        onRelationshipsUpdated();
      } else {
        setErrors(result.errors || ['Error al crear la relación']);
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Error inesperado']);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRelationship = async (relatedInfo: RelatedMemberInfo) => {
    try {
      const result = await relationshipEngine.deleteRelationship(
        member.id,
        relatedInfo.member.id,
        relatedInfo.relationshipType
      );

      if (result.success) {
        await loadData();
        onRelationshipsUpdated();
      } else {
        setErrors(result.errors || ['Error al eliminar la relación']);
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Error inesperado']);
    }
  };

  const filteredAvailableMembers = availableMembers.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.preferredName && m.preferredName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedRelatedMembers = relatedMembers.reduce((groups, info) => {
    const type = info.relationshipType;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(info);
    return groups;
  }, {} as Record<RelationshipType, RelatedMemberInfo[]>);

  if (isLoading) {
    return (
      <div className={`${styles.relationshipManager} ${className}`}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <span>Cargando relaciones...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.relationshipManager} ${className}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          Relaciones de {member.preferredName || member.name}
        </h3>
        
        <Button
          variant="primary"
          size="small"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancelar' : '+ Agregar Relación'}
        </Button>
      </div>

      {errors.length > 0 && (
        <div className={styles.errorList}>
          {errors.map((error, index) => (
            <div key={index} className={styles.error}>
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Create Relationship Form */}
      {showCreateForm && (
        <div className={styles.createForm}>
          <h4 className={styles.formTitle}>Nueva Relación</h4>
          
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label className={styles.label}>Tipo de relación:</label>
              <select
                value={formData.relationshipType}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  relationshipType: e.target.value as RelationshipType
                }))}
                className={styles.select}
              >
                {Object.entries(RELATIONSHIP_LABELS).map(([type, label]) => (
                  <option key={type} value={type}>
                    {label.singular}
                  </option>
                ))}
              </select>
              <p className={styles.description}>
                {RELATIONSHIP_LABELS[formData.relationshipType].description} {member.preferredName || member.name}
              </p>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Buscar miembro de la familia:</label>
              <Input
                type="text"
                placeholder="Buscar por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Seleccionar miembro:</label>
              <div className={styles.memberList}>
                {filteredAvailableMembers.length === 0 ? (
                  <p className={styles.noMembers}>
                    {searchQuery ? 'No se encontraron miembros' : 'No hay miembros disponibles'}
                  </p>
                ) : (
                  filteredAvailableMembers.map(availableMember => (
                    <label key={availableMember.id} className={styles.memberOption}>
                      <input
                        type="radio"
                        name="targetMember"
                        value={availableMember.id}
                        checked={formData.targetMemberId === availableMember.id}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          targetMemberId: e.target.value
                        }))}
                      />
                      <div className={styles.memberInfo}>
                        <span className={styles.memberName}>
                          {availableMember.preferredName || availableMember.name}
                        </span>
                        {availableMember.preferredName && availableMember.name !== availableMember.preferredName && (
                          <span className={styles.memberFullName}>({availableMember.name})</span>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className={styles.formActions}>
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateForm(false);
                setFormData({ targetMemberId: '', relationshipType: 'parent' });
                setErrors([]);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateRelationship}
              disabled={isCreating || !formData.targetMemberId}
            >
              {isCreating ? 'Creando...' : 'Crear Relación'}
            </Button>
          </div>
        </div>
      )}

      {/* Existing Relationships */}
      <div className={styles.relationshipsList}>
        {Object.keys(groupedRelatedMembers).length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👥</div>
            <p>No hay relaciones definidas</p>
            <p className={styles.emptyHint}>
              Agrega relaciones para conectar a {member.preferredName || member.name} con otros miembros de la familia
            </p>
          </div>
        ) : (
          Object.entries(groupedRelatedMembers).map(([type, members]) => (
            <div key={type} className={styles.relationshipGroup}>
              <h4 className={styles.groupTitle}>
                {RELATIONSHIP_LABELS[type as RelationshipType].plural} ({members.length})
              </h4>
              
              <div className={styles.memberCards}>
                {members.map(info => (
                  <div key={info.member.id} className={styles.memberCard}>
                    <div className={styles.memberDetails}>
                      <span className={styles.memberName}>
                        {info.member.preferredName || info.member.name}
                      </span>
                      {info.member.preferredName && info.member.name !== info.member.preferredName && (
                        <span className={styles.memberFullName}>({info.member.name})</span>
                      )}
                      <span className={styles.relationshipLabel}>
                        {RELATIONSHIP_LABELS[info.relationshipType].singular}
                      </span>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => handleDeleteRelationship(info)}
                      className={styles.deleteButton}
                      aria-label={`Eliminar relación con ${info.member.name}`}
                    >
                      🗑️
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};