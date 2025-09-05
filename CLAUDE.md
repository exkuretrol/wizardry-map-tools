# Wizardry Map Tools

A React-based map editor for creating tile-based maps, built with TypeScript, Vite, and Tailwind CSS.

## Project Structure

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom components with shadcn/ui patterns
- **Package Manager**: Bun (based on bun.lock presence)

## Key Components

- `MapEditor.tsx` - Main map editing interface
- `TileCanvas.tsx` - Canvas for rendering and editing tiles
- `TilePalette.tsx` - Tile selection palette
- `tileLoader.ts` - Utility for loading tile assets

## Available Scripts

```bash
# Start development server
bun run dev

# Build for production
bun run build

# Run linter
bun run lint

# Format code with Prettier
bun run format

# Check code formatting
bun run format:check

# Generate changelog and bump version
bun run release

# Create specific version releases
bun run release:patch  # 0.1.0 -> 0.1.1
bun run release:minor  # 0.1.0 -> 0.2.0  
bun run release:major  # 0.1.0 -> 1.0.0

# Preview production build
bun run preview
```

## Development Workflow

1. **Start Development**: Use `bun run dev` to start the development server
2. **Code Quality**: Run `bun run lint` to check for linting issues
3. **Format Code**: Run `bun run format` to auto-format your code
4. **Build**: Use `bun run build` to create production build

## Code Style Guidelines

### Linting & Formatting
- **Linter**: TypeScript ESLint with React-specific rules
- **Formatter**: Prettier with project-specific configuration
- **Pre-commit**: Automatic linting and formatting on commit

### TypeScript Best Practices
- Use strict type checking (already configured)
- Prefer `interface` over `type` for object shapes
- Use explicit return types for functions
- Avoid `any` - use proper types or `unknown`
- Use optional chaining (`?.`) and nullish coalescing (`??`)

### React/Component Guidelines
- Use functional components with hooks
- Prefer named exports over default exports
- Use TypeScript interfaces for props
- Follow the existing component structure in `components/`

### File Naming Conventions
- Components: `PascalCase.tsx` (e.g., `MapEditor.tsx`)
- Utilities: `camelCase.ts` (e.g., `tileLoader.ts`)
- Hooks: `use*.ts` (e.g., `useMapState.ts`)
- Types: `index.ts` in `types/` directory

### Import Organization
```typescript
// External libraries
import React from 'react'
import { clsx } from 'clsx'

// Internal utilities
import { cn } from '@/lib/utils'

// Components
import { Button } from '@/components/ui/button'

// Types
import type { TileData } from '@/types'
```

### Styling Guidelines
- Use Tailwind CSS classes for styling
- Utilize `cn()` utility for conditional classes
- Follow shadcn/ui component patterns
- Keep styles co-located with components

## Commit Style Guidelines

This project follows **Conventional Commits** specification for consistent commit messages.

### Commit Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types
- **feat**: New feature for the user
- **fix**: Bug fix for the user
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring without changing functionality
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates
- **perf**: Performance improvements
- **ci**: CI/CD pipeline changes
- **build**: Build system or external dependency changes
- **revert**: Reverting previous changes

### Examples
```bash
# Good examples
git commit -m "feat: add tile selection to map editor"
git commit -m "fix: resolve canvas rendering issue on resize"
git commit -m "docs: update installation instructions"
git commit -m "refactor: extract tile loading logic to utility"
git commit -m "test: add unit tests for tile palette component"

# Bad examples  
git commit -m "Update stuff"
git commit -m "Fixed bug"
git commit -m "WIP"
```

### Enforcement
- **commitlint** automatically validates commit messages
- Pre-commit hooks prevent non-conforming commits
- Keep subject line under 72 characters
- Use lowercase for commit subjects
- Don't end subject with a period

## Changelog & Versioning

This project follows [Keep a Changelog](https://keepachangelog.com/) format and [Semantic Versioning](https://semver.org/).

### Automated Changelog Generation
- **Tool**: standard-version
- **Format**: Keep a Changelog compatible
- **Source**: Generated from conventional commit messages
- **Location**: `CHANGELOG.md`

### Release Workflow
1. **Make changes** with conventional commits
2. **Run release command**:
   ```bash
   # Automatically determines version bump based on commits
   bun run release
   
   # Or specify version type
   bun run release:patch  # Bug fixes
   bun run release:minor  # New features  
   bun run release:major  # Breaking changes
   ```
3. **What happens automatically**:
   - Analyzes conventional commits since last release
   - Determines appropriate version bump (patch/minor/major)
   - Updates `package.json` version
   - Generates/updates `CHANGELOG.md` 
   - Creates git commit and tag
   - Ready for `git push --follow-tags`

### Changelog Sections
- **Features** (`feat:`) - New functionality
- **Bug Fixes** (`fix:`) - Bug fixes
- **Performance Improvements** (`perf:`) - Performance enhancements  
- **Code Refactoring** (`refactor:`) - Code improvements
- **Reverts** (`revert:`) - Reverted changes
- Hidden: `docs`, `style`, `test`, `chore`, `build`, `ci`

## Tile System

The project includes a tile-based map system with:
- Tile assets stored in `public/tiles/`
- Metadata in `tiles_meta.json`
- Support for tile palettes and canvas editing

## TypeScript Configuration

- Uses project references with separate configs for app and node environments
- Strict type checking enabled
- Modern ES module setup

## Dependencies

Key dependencies include:
- React 19 with TypeScript support
- Tailwind CSS for styling
- Lucide React for icons
- Class Variance Authority for component variants