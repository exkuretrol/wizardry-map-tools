# Wizardry Map Tools

A comprehensive React-based tile map editor for creating RPG-style maps with interactive editing, path drawing, and annotation features.

> **Note**: This project includes tile assets derived from video games for educational purposes. See [License](#license) section for important copyright information.

## Features

- 🎨 **Interactive Tile Editing** - Place and arrange tiles on an 81x81 grid
- 🛤️ **Path Drawing** - Create walkable paths with visual feedback
- 📝 **Comment System** - Add directional arrows for map annotations
- 💾 **Local Storage** - Auto-save with JSON import/export capabilities
- 🎯 **Dual Mode Interface** - Switch between Edit and Comment modes
- 🔄 **Real-time Preview** - See changes instantly as you edit

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- Modern web browser with Canvas support

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/exkuretrol/wizardry-map-tools.git
   cd wizardry-map-tools
   ```

2. **Install dependencies:**

   ```bash
   bun install
   ```

3. **Start development server:**

   ```bash
   bun run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:5173`

## Development Scripts

```bash
# Development
bun run dev          # Start development server with hot reload
bun run build        # Build for production
bun run preview      # Preview production build locally

# Code Quality
bun run lint         # Run ESLint to check for issues
bun run format       # Format code with Prettier
bun run format:check # Check if code is properly formatted

# Release Management
bun run release      # Generate changelog and create release
bun run release:patch # Create patch version (0.1.0 -> 0.1.1)
bun run release:minor # Create minor version (0.1.0 -> 0.2.0)
bun run release:major # Create major version (0.1.0 -> 1.0.0)
```

## Project Structure

```
src/
├── components/
│   ├── editor/
│   │   ├── MapEditor.tsx    # Main editor interface
│   │   ├── TileCanvas.tsx   # Interactive canvas component
│   │   └── TilePalette.tsx  # Tile selection interface
│   └── ui/
│       └── card.tsx         # Reusable UI components
├── utils/
│   └── tileLoader.ts        # Tile asset management
├── types/
│   └── index.ts             # TypeScript type definitions
└── lib/
    └── utils.ts             # Utility functions
```

## Technology Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS v4 with custom design system
- **Package Manager**: Bun for fast package installation
- **Code Quality**: ESLint + Prettier with pre-commit hooks
- **Versioning**: Conventional Commits with automated changelog

## Usage Guide

### Basic Map Editing

1. **Select Tiles**: Choose from the tile palette in the left sidebar
2. **Place Tiles**: Left-click on the canvas to place selected tiles
3. **Remove Tiles**: Right-click on placed tiles to remove them
4. **Draw Paths**: Switch to "Path" mode to create walkable areas

### Comment System

1. **Switch to Comment Mode**: Click the "Comment" tab
2. **Draw Arrows**: Left-click to start, add breakpoints, right-click to finish
3. **Remove Arrows**: Right-click on existing arrows to delete them
4. **Customize Colors**: Use the color picker to change arrow colors

### Save & Load

- **Auto-save**: Maps are automatically saved every 30 seconds
- **Manual Save**: Use the "Save Map" button in the right panel
- **Export**: Save maps as JSON files for backup or sharing
- **Import**: Load JSON map files from your computer

## Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Follow** the development workflow in `CLAUDE.md`
4. **Make** changes with conventional commits
5. **Test** your changes: `bun run lint && bun run build`
6. **Update** documentation if needed
7. **Submit** a pull request

## Development Workflow

Before committing changes:

```bash
# 1. Quality checks
bun run lint
bun run format
bun run build

# 2. Update changelog (for significant changes)
bun run release

# 3. Commit with conventional format
git add .
git commit -m "feat: add new amazing feature"
git push --follow-tags
```

> ⚠️ **Important**: Always update `README.md` if installation methods change or if files break the original installation process.

## Browser Support

- Chrome/Chromium 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### Important Asset Disclaimer

⚠️ **The tile assets included in this project are derived from video games and are NOT covered by the MIT License.**

- **Code**: MIT Licensed (free to use, modify, distribute)
- **Assets**: May be copyrighted by original game developers
- **Usage**: Provided for educational and development purposes only

**For Commercial Use:**

- Replace all game assets with your own original content
- The map editor code can be freely used under MIT License
- Ensure compliance with copyright laws for any assets you use

**If you're a copyright holder** and wish to have assets removed, please open an issue.

## Acknowledgments

- Built with [React](https://reactjs.org/) and [TypeScript](https://typescriptlang.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide React](https://lucide.dev/)
- Development tooling by [Vite](https://vitejs.dev/)
