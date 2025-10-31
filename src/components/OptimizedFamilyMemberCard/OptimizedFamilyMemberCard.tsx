import React, { memo, useCallback, useMemo } from 'react';
import { FamilyMemberCard, FamilyMemberCardProps } from '../FamilyMemberCard/FamilyMemberCard';
import { useLazyImage, usePerformanceMonitor, useDebounce } from '../../utils/performance';
import { FamilyMember } from '../../types';

/**
 * Optimized version of FamilyMemberCard with performance enhancements
 */
export interface OptimizedFamilyMemberCardProps extends FamilyMemberCardProps {
  lazyLoad?: boolean;
  placeholder?: string;
  enablePerformanceMonitoring?: boolean;
}

const OptimizedFamilyMemberCardComponent: React.FC<OptimizedFamilyMemberCardProps> = ({
  member,
  lazyLoad = true,
  placeholder,
  enablePerformanceMonitoring = false,
  onEdit,
  onViewMemories,
  onSelect,
  ...props
}) => {
  // Performance monitoring in development
  if (enablePerformanceMonitoring && process.env.NODE_ENV === 'development') {
    usePerformanceMonitor(`OptimizedFamilyMemberCard-${member.id}`);
  }

  // Lazy load the primary photo
  const primaryPhoto = member.photos?.[0];
  const { targetRef, imageSrc, isLoaded, isError } = useLazyImage(
    lazyLoad ? primaryPhoto : '',
    placeholder
  );

  // Debounce expensive operations
  const debouncedOnEdit = useDebounce(onEdit, 100);
  const debouncedOnViewMemories = useDebounce(onViewMemories, 100);
  const debouncedOnSelect = useDebounce(onSelect, 50);

  // Memoize expensive calculations
  const memberData = useMemo(() => {
    const isDeceased = !!member.dateOfDeath;
    const displayName = member.preferredName || member.name;
    const birthYear = member.dateOfBirth.getFullYear();
    const deathYear = member.dateOfDeath?.getFullYear();
    const lifeSpan = deathYear ? `${birthYear} - ${deathYear}` : `${birthYear} - presente`;

    return {
      isDeceased,
      displayName,
      lifeSpan,
      birthYear,
      deathYear,
    };
  }, [member.dateOfBirth, member.dateOfDeath, member.name, member.preferredName]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleEdit = useCallback((editedMember: FamilyMember) => {
    if (debouncedOnEdit) {
      debouncedOnEdit(editedMember);
    }
  }, [debouncedOnEdit]);

  const handleViewMemories = useCallback((memberId: string) => {
    if (debouncedOnViewMemories) {
      debouncedOnViewMemories(memberId);
    }
  }, [debouncedOnViewMemories]);

  const handleSelect = useCallback((memberId: string) => {
    if (debouncedOnSelect) {
      debouncedOnSelect(memberId);
    }
  }, [debouncedOnSelect]);

  // Create optimized member object for the card
  const optimizedMember = useMemo(() => ({
    ...member,
    photos: lazyLoad && isLoaded ? [imageSrc] : (lazyLoad ? [] : member.photos),
  }), [member, lazyLoad, isLoaded, imageSrc]);

  return (
    <div ref={lazyLoad ? targetRef : undefined}>
      <FamilyMemberCard
        member={optimizedMember}
        onEdit={onEdit ? handleEdit : undefined}
        onViewMemories={onViewMemories ? handleViewMemories : undefined}
        onSelect={onSelect ? handleSelect : undefined}
        {...props}
      />
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const OptimizedFamilyMemberCard = memo(OptimizedFamilyMemberCardComponent, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  const prevMember = prevProps.member;
  const nextMember = nextProps.member;

  // Check if member data has actually changed
  if (
    prevMember.id !== nextMember.id ||
    prevMember.name !== nextMember.name ||
    prevMember.preferredName !== nextMember.preferredName ||
    prevMember.dateOfBirth.getTime() !== nextMember.dateOfBirth.getTime() ||
    prevMember.dateOfDeath?.getTime() !== nextMember.dateOfDeath?.getTime() ||
    prevMember.altarPosition.level !== nextMember.altarPosition.level ||
    prevMember.altarPosition.order !== nextMember.altarPosition.order ||
    prevMember.photos.length !== nextMember.photos.length
  ) {
    return false; // Re-render
  }

  // Check if photos have changed
  if (prevMember.photos.length > 0 && nextMember.photos.length > 0) {
    if (prevMember.photos[0] !== nextMember.photos[0]) {
      return false; // Re-render
    }
  }

  // Check other props
  if (
    prevProps.isDragging !== nextProps.isDragging ||
    prevProps.isSelected !== nextProps.isSelected ||
    prevProps.showDetails !== nextProps.showDetails ||
    prevProps.lazyLoad !== nextProps.lazyLoad ||
    prevProps.placeholder !== nextProps.placeholder
  ) {
    return false; // Re-render
  }

  return true; // Don't re-render
});