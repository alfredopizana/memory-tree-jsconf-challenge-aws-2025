# Día de los Muertos Memory Tree

A family memory tree application inspired by the Mexican "Día de los Muertos" (Day of the Dead) tradition. The application displays family members as interactive cards arranged in altar-like levels, allowing users to manage family relationships, memories, and photos with traditional decorative elements.

## Features

- Interactive altar interface with drag-and-drop family member cards
- Traditional Day of the Dead decorative elements
- Family relationship management
- Memory and photo storage
- Responsive design for mobile, tablet, and desktop
- Local storage with IndexedDB

## Technology Stack

- React 18 + TypeScript
- Vite for build tooling
- React DnD for drag-and-drop interactions
- Dexie for IndexedDB management
- CSS Modules for styling
- Vitest for testing

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint

## Cultural Guidelines

This application respectfully incorporates Mexican Day of the Dead traditions. Please refer to the cultural guidelines in the project documentation to ensure authentic and respectful representation of these important cultural elements.

## Project Structure

```
src/
├── components/     # React components
├── services/       # Business logic services
├── repositories/   # Data access layer
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── test/           # Test setup and utilities
```