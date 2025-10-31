# Design Document

## Overview

The Día de los Muertos Memory Tree application is a React-based web application that creates an interactive digital altar for preserving family memories. The application combines traditional Mexican Day of the Dead aesthetics with modern web technologies to provide an engaging, culturally-respectful interface for family heritage preservation.

The core architecture follows a component-based design with local storage persistence, drag-and-drop interactions, and responsive layouts optimized for both desktop and mobile experiences.

## Architecture

### Technology Stack
- **Frontend Framework**: React 18 with TypeScript
- **Styling**: CSS Modules with CSS Grid and Flexbox for responsive layouts
- **State Management**: React Context API with useReducer for complex state
- **Drag & Drop**: React DnD library for cross-platform drag-and-drop support
- **Image Handling**: HTML5 File API with local storage via IndexedDB
- **Data Persistence**: IndexedDB for structured data and blob storage
- **Build Tool**: Vite for fast development and optimized builds
- **Testing**: Vitest and React Testing Library

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
├─────────────────────────────────────────────────────────────┤
│  AltarInterface │ FamilyMemberCard │ DecorationElements     │
│  MemoryPanel    │ RelationshipView │ PhotoFrameDecorator    │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
├─────────────────────────────────────────────────────────────┤
│  FamilyTreeManager │ MemoryManager │ AltarLayoutManager     │
│  RelationshipEngine │ DecorationManager │ ValidationService │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Data Access Layer                         │
├─────────────────────────────────────────────────────────────┤
│  FamilyMemberRepository │ MemoryRepository │ ImageRepository │
│  AltarStateRepository   │ DecorationRepository              │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                             │
├─────────────────────────────────────────────────────────────┤
│              IndexedDB (Structured Data + Blobs)            │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Core Components

#### AltarInterface
The main container component that renders the multi-level altar layout.

```typescript
interface AltarInterfaceProps {
  familyMembers: FamilyMember[];
  decorations: DecorationElement[];
  onMemberMove: (memberId: string, newLevel: number, newPosition: number) => void;
  onDecorationMove: (decorationId: string, newPosition: Position) => void;
}
```

**Features:**
- CSS Grid layout with 3-4 altar levels
- Drop zones for family member cards and decorations
- Responsive breakpoints for mobile/tablet/desktop
- Traditional Day of the Dead color scheme and textures

#### FamilyMemberCard
Individual family member representation with photo and basic info.

```typescript
interface FamilyMemberCardProps {
  member: FamilyMember;
  isDragging: boolean;
  onEdit: (member: FamilyMember) => void;
  onViewMemories: (memberId: string) => void;
}
```

**Features:**
- Decorated photo frame with Day of the Dead motifs
- Hover effects revealing member details
- Drag handle for repositioning
- Cultural-appropriate styling for deceased vs living members

#### DecorationElement
Interactive decorative elements that can be placed around the altar.

```typescript
interface DecorationElementProps {
  decoration: Decoration;
  position: Position;
  onMove: (newPosition: Position) => void;
  type: 'cempasuchil' | 'papel-picado' | 'salt-cross' | 'candle' | 'offering';
}
```

#### MemoryPanel
Sidebar component for viewing and editing memories associated with family members.

```typescript
interface MemoryPanelProps {
  memories: Memory[];
  selectedMemberIds: string[];
  onCreateMemory: (memory: Omit<Memory, 'id'>) => void;
  onEditMemory: (memory: Memory) => void;
  onDeleteMemory: (memoryId: string) => void;
}
```

### Data Models

#### FamilyMember
```typescript
interface FamilyMember {
  id: string;
  name: string;
  preferredName?: string;
  dateOfBirth: Date;
  dateOfDeath?: Date;
  photos: string[]; // IndexedDB blob references
  generation?: number;
  altarPosition: {
    level: number;
    order: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### Relationship
```typescript
interface Relationship {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  type: 'parent' | 'child' | 'sibling' | 'spouse' | 'grandparent' | 'grandchild';
  createdAt: Date;
}
```

#### Memory
```typescript
interface Memory {
  id: string;
  title: string;
  content: string;
  photos: string[]; // IndexedDB blob references
  associatedMemberIds: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### DecorationElement
```typescript
interface DecorationElement {
  id: string;
  type: 'cempasuchil' | 'papel-picado' | 'salt-cross' | 'candle' | 'offering';
  position: {
    x: number;
    y: number;
    level: number;
  };
  size: 'small' | 'medium' | 'large';
  rotation: number;
}
```

#### AltarState
```typescript
interface AltarState {
  id: string;
  name: string;
  memberPositions: Record<string, { level: number; order: number }>;
  decorations: DecorationElement[];
  backgroundTheme: 'traditional' | 'modern' | 'minimal';
  lastModified: Date;
}
```

## User Interface Design

### Layout Structure

The altar interface uses CSS Grid to create distinct levels:

1. **Top Level (Cielo)**: Grandparents and great-grandparents
2. **Middle Level (Tierra)**: Parents and aunts/uncles  
3. **Lower Level (Inframundo)**: Current generation and children
4. **Offering Level**: Decorative elements, candles, flowers

### Visual Design Elements

#### Color Palette
- **Primary**: Deep orange (#FF6B35) - marigold flowers
- **Secondary**: Purple (#8E44AD) - traditional altar cloth
- **Accent**: Gold (#F1C40F) - candle light and decorations
- **Background**: Dark navy (#2C3E50) with subtle texture
- **Text**: Warm white (#FDF2E9) for readability

#### Typography
- **Headers**: Serif font reminiscent of traditional Mexican typography
- **Body**: Clean sans-serif for readability on all devices
- **Decorative**: Script font for names and special elements

#### Photo Frame Decorations
- SVG-based decorative borders with traditional motifs
- Marigold corner decorations
- Subtle drop shadows and glowing effects
- Different frame styles for living vs deceased family members

### Responsive Design Strategy

#### Mobile (< 768px)
- Single-column altar layout
- Simplified drag interactions with touch gestures
- Collapsible decoration palette
- Bottom sheet for memory panel

#### Tablet (768px - 1024px)
- Two-column altar layout
- Side panel for memories and controls
- Medium-sized decoration elements

#### Desktop (> 1024px)
- Full multi-level altar display
- Sidebar panels for memories and family tree
- Large decoration elements with detailed animations

## Error Handling

### Data Validation
- **Family Member Validation**: Required fields, date validation, photo format checking
- **Relationship Validation**: Prevent circular relationships, validate relationship types
- **Memory Validation**: Content length limits, photo size restrictions

### Storage Error Handling
- **IndexedDB Failures**: Graceful degradation to localStorage with user notification
- **Image Upload Errors**: File size and format validation with user feedback
- **Data Corruption**: Backup and recovery mechanisms with data integrity checks

### User Experience Errors
- **Drag & Drop Failures**: Visual feedback for invalid drop zones
- **Network Issues**: Offline-first design with sync indicators
- **Browser Compatibility**: Feature detection with fallbacks for older browsers

## Testing Strategy

### Unit Testing
- **Component Testing**: React Testing Library for all UI components
- **Business Logic Testing**: Vitest for data managers and validation services
- **Storage Testing**: Mock IndexedDB for repository layer testing

### Integration Testing
- **Drag & Drop Workflows**: End-to-end drag and drop scenarios
- **Data Persistence**: Full CRUD operations with storage verification
- **Responsive Behavior**: Cross-device layout and interaction testing

### Accessibility Testing
- **Screen Reader Compatibility**: ARIA labels and semantic HTML
- **Keyboard Navigation**: Full keyboard accessibility for drag & drop
- **Color Contrast**: WCAG 2.1 AA compliance for all text and interactive elements

### Cultural Sensitivity Testing
- **Visual Review**: Ensure respectful representation of Day of the Dead traditions
- **Content Guidelines**: Appropriate language and imagery standards
- **Community Feedback**: Beta testing with Mexican-American families

## Performance Considerations

### Image Optimization
- **Lazy Loading**: Progressive image loading for large family trees
- **Compression**: Client-side image compression before storage
- **Caching**: Efficient blob caching strategies in IndexedDB

### Rendering Performance
- **Virtual Scrolling**: For large family trees with many members
- **Memoization**: React.memo and useMemo for expensive calculations
- **Debounced Updates**: Smooth drag interactions without performance impact

### Storage Efficiency
- **Data Normalization**: Efficient relationship storage to minimize duplication
- **Cleanup Routines**: Automatic cleanup of orphaned images and data
- **Compression**: JSON compression for large memory content