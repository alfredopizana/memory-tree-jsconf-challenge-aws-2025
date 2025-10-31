---
inclusion: fileMatch
fileMatchPattern: "**/*.{ts,tsx,js,jsx}"
---

# React TypeScript Development Standards

## Code Organization and Structure

### Component Structure
- Use functional components with hooks
- Implement TypeScript interfaces for all props
- Export components as default exports
- Place interfaces in the same file as the component unless shared

### File Naming Conventions
- Components: PascalCase (e.g., `FamilyMemberCard.tsx`)
- Hooks: camelCase starting with "use" (e.g., `useFamilyTree.ts`)
- Utilities: camelCase (e.g., `dateHelpers.ts`)
- Types: PascalCase with "Types" suffix (e.g., `FamilyMemberTypes.ts`)

### Directory Structure
```
src/
├── components/          # Reusable UI components
├── pages/              # Page-level components
├── hooks/              # Custom React hooks
├── services/           # Business logic and API calls
├── repositories/       # Data access layer
├── types/              # TypeScript type definitions
├── utils/              # Pure utility functions
├── assets/             # Static assets (images, fonts)
└── styles/             # Global styles and CSS modules
```

## TypeScript Best Practices

### Type Definitions
- Define strict interfaces for all data models
- Use union types for controlled values (e.g., `'parent' | 'child' | 'sibling'`)
- Avoid `any` type - use `unknown` if type is truly unknown
- Use generic types for reusable components and functions

### Component Props
```typescript
interface ComponentProps {
  required: string;
  optional?: number;
  children?: React.ReactNode;
  onAction: (data: DataType) => void;
}

const Component: React.FC<ComponentProps> = ({ required, optional = 0, children, onAction }) => {
  // Implementation
};
```

### State Management
- Use `useState` with proper typing
- Implement `useReducer` for complex state logic
- Create custom hooks for shared state logic
- Use React Context for global state with proper typing

## Performance Guidelines

### Optimization Techniques
- Use `React.memo` for components that receive stable props
- Implement `useMemo` for expensive calculations
- Use `useCallback` for event handlers passed to child components
- Lazy load components and images when appropriate

### Bundle Optimization
- Import only needed functions from libraries
- Use dynamic imports for code splitting
- Optimize images and assets
- Minimize CSS and remove unused styles

## Testing Standards

### Component Testing
- Test component behavior, not implementation details
- Use React Testing Library for component tests
- Mock external dependencies and services
- Test accessibility features and keyboard navigation

### Test Structure
```typescript
describe('ComponentName', () => {
  it('should render without errors', () => {
    // Test implementation
  });

  it('should handle user interactions correctly', () => {
    // Test implementation
  });
});
```

## Error Handling

### Error Boundaries
- Implement error boundaries for component trees
- Provide meaningful error messages to users
- Log errors for debugging purposes
- Graceful degradation for non-critical features

### Async Operations
- Handle loading states consistently
- Implement proper error handling for async operations
- Use try-catch blocks with proper error typing
- Provide user feedback for long-running operations