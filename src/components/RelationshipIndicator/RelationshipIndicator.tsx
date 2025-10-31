import React, { useState, useEffect } from 'react';
import { FamilyMember, Relationship } from '../../types';
import { RelationshipEngine } from '../../services/RelationshipEngine';
import styles from './RelationshipIndicator.module.css';

export interface RelationshipIndicatorProps {
  members: FamilyMember[];
  selectedMemberId?: string;
  showAllRelationships?: boolean;
  className?: string;
}

interface RelationshipLine {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  type: string;
  fromPosition: { x: number; y: number };
  toPosition: { x: number; y: number };
}

export const RelationshipIndicator: React.FC<RelationshipIndicatorProps> = ({
  members,
  selectedMemberId,
  showAllRelationships = false,
  className = '',
}) => {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [relationshipLines, setRelationshipLines] = useState<RelationshipLine[]>([]);
  const [memberPositions, setMemberPositions] = useState<Record<string, { x: number; y: number }>>({});
  
  const relationshipEngine = new RelationshipEngine();

  useEffect(() => {
    loadRelationships();
  }, [members]);

  useEffect(() => {
    updateMemberPositions();
  }, [members]);

  useEffect(() => {
    calculateRelationshipLines();
  }, [relationships, memberPositions, selectedMemberId, showAllRelationships]);

  const loadRelationships = async () => {
    try {
      const allRelationships: Relationship[] = [];
      
      for (const member of members) {
        const { relationships: memberRels } = await relationshipEngine.getMemberRelationships(member.id);
        
        // Add relationships that haven't been added yet (avoid duplicates)
        memberRels.forEach(rel => {
          const exists = allRelationships.some(existing => 
            (existing.fromMemberId === rel.fromMemberId && existing.toMemberId === rel.toMemberId) ||
            (existing.fromMemberId === rel.toMemberId && existing.toMemberId === rel.fromMemberId)
          );
          
          if (!exists) {
            allRelationships.push(rel);
          }
        });
      }
      
      setRelationships(allRelationships);
    } catch (error) {
      console.error('Failed to load relationships:', error);
    }
  };

  const updateMemberPositions = () => {
    const positions: Record<string, { x: number; y: number }> = {};
    
    members.forEach(member => {
      const element = document.querySelector(`[data-member-id="${member.id}"]`) as HTMLElement;
      if (element) {
        const rect = element.getBoundingClientRect();
        const containerRect = element.closest('.altar-interface')?.getBoundingClientRect();
        
        if (containerRect) {
          positions[member.id] = {
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top + rect.height / 2
          };
        }
      }
    });
    
    setMemberPositions(positions);
  };

  const calculateRelationshipLines = () => {
    const lines: RelationshipLine[] = [];
    
    relationships.forEach(relationship => {
      const fromPos = memberPositions[relationship.fromMemberId];
      const toPos = memberPositions[relationship.toMemberId];
      
      if (!fromPos || !toPos) return;
      
      // Only show relationships if:
      // 1. showAllRelationships is true, OR
      // 2. selectedMemberId is involved in the relationship
      const shouldShow = showAllRelationships || 
        (selectedMemberId && (
          relationship.fromMemberId === selectedMemberId || 
          relationship.toMemberId === selectedMemberId
        ));
      
      if (shouldShow) {
        lines.push({
          id: relationship.id,
          fromMemberId: relationship.fromMemberId,
          toMemberId: relationship.toMemberId,
          type: relationship.type,
          fromPosition: fromPos,
          toPosition: toPos
        });
      }
    });
    
    setRelationshipLines(lines);
  };

  const getLineColor = (relationshipType: string): string => {
    const colors: Record<string, string> = {
      parent: '#E74C3C',      // Red for parent-child
      child: '#E74C3C',       // Red for parent-child
      sibling: '#F39C12',     // Orange for siblings
      spouse: '#8E44AD',      // Purple for spouses
      grandparent: '#3498DB', // Blue for grandparent-grandchild
      grandchild: '#3498DB'   // Blue for grandparent-grandchild
    };
    return colors[relationshipType] || '#BDC3C7';
  };

  const getLineStyle = (relationshipType: string): string => {
    const styles: Record<string, string> = {
      parent: 'solid',
      child: 'solid',
      sibling: 'dashed',
      spouse: 'dotted',
      grandparent: 'solid',
      grandchild: 'solid'
    };
    return styles[relationshipType] || 'solid';
  };

  const calculatePath = (from: { x: number; y: number }, to: { x: number; y: number }): string => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    
    // Create a curved path for better visual appeal
    const midX = from.x + dx / 2;
    const midY = from.y + dy / 2;
    
    // Add some curve based on the distance
    const curve = Math.min(Math.abs(dx), Math.abs(dy)) * 0.3;
    const controlX = midX + (dy > 0 ? curve : -curve);
    const controlY = midY - Math.abs(dx) * 0.1;
    
    return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
  };

  // Calculate SVG viewBox to contain all lines
  const calculateViewBox = (): string => {
    if (relationshipLines.length === 0) return '0 0 100 100';
    
    const allX = relationshipLines.flatMap(line => [line.fromPosition.x, line.toPosition.x]);
    const allY = relationshipLines.flatMap(line => [line.fromPosition.y, line.toPosition.y]);
    
    const minX = Math.min(...allX) - 20;
    const maxX = Math.max(...allX) + 20;
    const minY = Math.min(...allY) - 20;
    const maxY = Math.max(...allY) + 20;
    
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  };

  if (relationshipLines.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.relationshipIndicator} ${className}`}>
      <svg
        className={styles.relationshipSvg}
        viewBox={calculateViewBox()}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Define arrow markers for different relationship types */}
          <marker
            id="arrowhead-parent"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#E74C3C"
            />
          </marker>
          
          <marker
            id="arrowhead-sibling"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#F39C12"
            />
          </marker>
          
          <marker
            id="arrowhead-spouse"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#8E44AD"
            />
          </marker>
          
          <marker
            id="arrowhead-grandparent"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#3498DB"
            />
          </marker>
        </defs>
        
        {relationshipLines.map(line => (
          <g key={line.id} className={styles.relationshipLine}>
            <path
              d={calculatePath(line.fromPosition, line.toPosition)}
              stroke={getLineColor(line.type)}
              strokeWidth="2"
              strokeDasharray={getLineStyle(line.type) === 'dashed' ? '5,5' : 
                              getLineStyle(line.type) === 'dotted' ? '2,2' : 'none'}
              fill="none"
              markerEnd={`url(#arrowhead-${line.type === 'child' ? 'parent' : line.type})`}
              className={styles.relationshipPath}
            />
            
            {/* Relationship label */}
            <text
              x={(line.fromPosition.x + line.toPosition.x) / 2}
              y={(line.fromPosition.y + line.toPosition.y) / 2 - 5}
              textAnchor="middle"
              className={styles.relationshipLabel}
              fill={getLineColor(line.type)}
            >
              {line.type}
            </text>
          </g>
        ))}
      </svg>
      
      {/* Legend */}
      {showAllRelationships && (
        <div className={styles.legend}>
          <h4 className={styles.legendTitle}>Relaciones</h4>
          <div className={styles.legendItems}>
            <div className={styles.legendItem}>
              <div className={styles.legendLine} style={{ backgroundColor: '#E74C3C' }}></div>
              <span>Padre/Hijo</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendLine} style={{ backgroundColor: '#F39C12', borderStyle: 'dashed' }}></div>
              <span>Hermanos</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendLine} style={{ backgroundColor: '#8E44AD', borderStyle: 'dotted' }}></div>
              <span>Esposos</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendLine} style={{ backgroundColor: '#3498DB' }}></div>
              <span>Abuelo/Nieto</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};