import React from 'react';
import { FamilyMember, DecorationElement } from '../../types';
import { AltarLevel } from '../AltarLevel/AltarLevel';
import styles from './AltarInterface.module.css';

export interface AltarInterfaceProps {
  familyMembers: FamilyMember[];
  decorations: DecorationElement[];
  onMemberMove: (member: FamilyMember, newLevel: number, newOrder: number) => void;
  onDecorationMove: (decoration: DecorationElement, newPosition: { x: number; y: number; level: number }) => void;
  onMemberEdit?: (member: FamilyMember) => void | undefined;
  onMemberViewMemories?: (memberId: string) => void | undefined;
  onMemberSelect?: (memberId: string) => void | undefined;
  onDecorationSelect?: (decorationId: string) => void | undefined;
  className?: string;
}

// Traditional altar level configuration
const ALTAR_LEVELS = [
  {
    level: 1,
    name: 'Cielo - Abuelos y Ancestros',
    description: 'El nivel superior representa el cielo y honra a los abuelos y ancestros más antiguos'
  },
  {
    level: 2,
    name: 'Tierra - Padres y Tíos',
    description: 'El nivel medio representa la tierra y honra a los padres y tíos'
  },
  {
    level: 3,
    name: 'Inframundo - Generación Actual',
    description: 'El nivel inferior representa el inframundo y honra a la generación actual y los niños'
  }
];

export const AltarInterface: React.FC<AltarInterfaceProps> = ({
  familyMembers,
  decorations,
  onMemberMove,
  onDecorationMove,
  onMemberEdit,
  onMemberViewMemories,
  onMemberSelect,
  onDecorationSelect,
  className = '',
}) => {
  const handleMemberDrop = (member: FamilyMember, targetLevel: number, targetOrder: number) => {
    // Only move if the position actually changed
    if (member.altarPosition.level !== targetLevel || member.altarPosition.order !== targetOrder) {
      onMemberMove(member, targetLevel, targetOrder);
    }
  };

  const handleDecorationDrop = (decoration: DecorationElement, newPosition: { x: number; y: number; level: number }) => {
    // Only move if the position actually changed
    const currentPos = decoration.position;
    if (currentPos.x !== newPosition.x || currentPos.y !== newPosition.y || currentPos.level !== newPosition.level) {
      onDecorationMove(decoration, newPosition);
    }
  };

  const altarClasses = [
    styles.altarInterface,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={altarClasses}>
      {/* Altar header */}
      <div className={styles.altarHeader}>
        <h2 className={styles.altarTitle}>Altar de la Memoria Familiar</h2>
        <p className={styles.altarDescription}>
          Arrastra a los miembros de tu familia a los diferentes niveles del altar tradicional
        </p>
      </div>

      {/* Altar levels */}
      <div className={styles.altarLevels}>
        {ALTAR_LEVELS.map((levelConfig) => (
          <AltarLevel
            key={levelConfig.level}
            level={levelConfig.level}
            levelName={levelConfig.name}
            members={familyMembers}
            decorations={decorations}
            onMemberDrop={handleMemberDrop}
            onDecorationDrop={handleDecorationDrop}
            {...(onMemberEdit && { onMemberEdit })}
            {...(onMemberViewMemories && { onMemberViewMemories })}
            {...(onMemberSelect && { onMemberSelect })}
            {...(onDecorationSelect && { onDecorationSelect })}
          />
        ))}
      </div>

      {/* Altar base decoration */}
      <div className={styles.altarBase}>
        <div className={styles.baseDecoration}>
          <div className={styles.saltLine}></div>
          <div className={styles.marigoldBorder}></div>
        </div>
      </div>

      {/* Cultural background elements */}
      <div className={styles.culturalBackground}>
        <div className={styles.papelPicado}></div>
        <div className={styles.candleGlow}></div>
      </div>
    </div>
  );
};