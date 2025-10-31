---
inclusion: fileMatch
fileMatchPattern: "**/*drag*/**/*.{ts,tsx}"
---

# Drag and Drop Implementation Guidelines

## React DnD Configuration

### Backend Setup
- Use HTML5Backend for desktop interactions
- Use TouchBackend for mobile devices
- Implement backend switching based on device detection
- Configure multi-backend for cross-platform support

### Provider Setup
```typescript
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

const backend = isMobile ? TouchBackend : HTML5Backend;

<DndProvider backend={backend}>
  <App />
</DndProvider>
```

## Draggable Components

### Drag Source Implementation
- Define clear drag types for different draggable items
- Implement proper drag preview with cultural styling
- Handle drag start/end events for visual feedback
- Collect drag state for UI updates

### Drop Target Implementation
- Define valid drop zones with clear visual indicators
- Implement drop validation logic
- Handle hover states for better UX
- Provide immediate feedback on successful drops

## Mobile Optimization

### Touch Interactions
- Configure touch backend with appropriate options
- Implement long-press to initiate drag on mobile
- Provide haptic feedback where supported
- Ensure touch targets meet accessibility guidelines (44px minimum)

### Visual Feedback
- Show clear drag previews on mobile devices
- Implement drop zone highlighting for touch interactions
- Provide visual confirmation of successful drops
- Handle edge cases like accidental touches

## Performance Considerations

### Optimization Strategies
- Debounce drag events to prevent excessive re-renders
- Use React.memo for drag/drop components
- Implement virtual scrolling for large lists of draggable items
- Minimize DOM manipulations during drag operations

### Memory Management
- Clean up event listeners on component unmount
- Avoid memory leaks in drag/drop event handlers
- Optimize drag preview rendering
- Use efficient data structures for position tracking

## Accessibility

### Keyboard Support
- Implement keyboard navigation for drag/drop operations
- Provide alternative interaction methods for screen readers
- Use ARIA labels and descriptions for drag/drop elements
- Ensure focus management during drag operations

### Screen Reader Support
- Announce drag/drop actions to screen readers
- Provide meaningful descriptions of drop zones
- Implement live regions for drag/drop feedback
- Test with actual screen reader software

## Cultural Considerations for Altar Layout

### Altar Level Constraints
- Respect traditional altar level hierarchy
- Implement validation for culturally appropriate placements
- Provide guidance for proper altar arrangement
- Maintain cultural authenticity in drag/drop interactions

### Visual Design
- Use traditional Mexican design elements in drag previews
- Implement culturally appropriate drop zone styling
- Ensure decorative elements respect cultural significance
- Maintain visual harmony with Day of the Dead aesthetics