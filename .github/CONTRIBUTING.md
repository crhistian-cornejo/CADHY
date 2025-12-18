# Contributing to CADHY

First off, thanks for taking the time to contribute! 🎉

CADHY is a CAD + Hydraulics suite built with Tauri, React, and Rust. We welcome contributions from developers of all skill levels.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)

## Code of Conduct

This project adheres to the Contributor Covenant Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

## Getting Started

1. **Read the Documentation First!**
   - Start with `.agents/QUICKSTART.md` for a 5-minute overview
   - Read `.agents/rules/CORE-RULES.md` for fundamental principles
   - Check `.agents/context/ARCHITECTURE.md` to understand the project

2. **Find an Issue**
   - Look for issues labeled `good first issue` or `help wanted`
   - Comment on the issue to let others know you're working on it
   - If you want to work on something new, open an issue first to discuss it

## Development Setup

### Prerequisites

- **Node.js**: v22+ (we use Bun as the package manager)
- **Bun**: v1.3.1+
- **Rust**: Latest stable (via rustup)
- **Platform-specific**: See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

### Installation

```bash
# Clone the repository
git clone https://github.com/nicofrem/CADHY.git
cd CADHY

# Install dependencies
bun install

# Run in development mode
bun dev
```

### Useful Commands

```bash
# Development
bun dev              # Start Tauri app in dev mode
bun dev:web          # Start web app only

# Code Quality
bun lint             # Run linter
bun lint:fix         # Fix linting issues
bun typecheck        # Run TypeScript checks
bun format           # Format code

# Testing
bun test             # Run TypeScript tests
cargo test           # Run Rust tests

# Building
bun build            # Build everything
cargo build          # Build Rust crates
```

## Project Structure

```
CADHY/
├── apps/
│   ├── desktop/          # Main Tauri application
│   └── web/              # Web documentation site
├── packages/             # TypeScript workspace
│   ├── ui/               # Shared UI components
│   ├── viewer/           # 3D viewer (Three.js)
│   ├── types/            # Shared TypeScript types
│   └── ai/               # AI integration
├── crates/               # Rust workspace
│   ├── cadhy-core/       # Core types and math
│   ├── cadhy-cad/        # CAD engine (OpenCASCADE)
│   ├── cadhy-hydraulics/ # Hydraulic calculations
│   └── ...
└── .agents/              # AI assistant documentation
```

## Making Changes

### Before You Start

1. Make sure you're on the `main` branch and it's up to date:
   ```bash
   git checkout main
   git pull origin main
   ```

2. Create a new branch with a descriptive name:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

### While Developing

- Follow the coding standards (see below)
- Write tests for new functionality
- Keep commits small and focused
- Run linting before committing:
  ```bash
  bun lint:fix && bun lint && bun typecheck
  ```

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/). Format:

```
<type>(<scope>): <subject>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Code style (formatting, etc.) |
| `refactor` | Code refactoring |
| `perf` | Performance improvement |
| `test` | Tests |
| `build` | Build system or dependencies |
| `ci` | CI/CD changes |
| `chore` | Other changes |

### Scopes

**Frontend**: `ui`, `viewer`, `types`, `ai`, `modeller`, `stores`, `hooks`
**Backend**: `core`, `cad`, `hydraulics`, `mesh`, `export`, `project`, `tauri`
**General**: `deps`, `config`, `workspace`

### Examples

```bash
# ✅ Good
feat(viewer): add orbit camera controls
fix(hydraulics): correct Manning formula for circular channels
docs(readme): update installation instructions

# ❌ Bad
feat: added stuff
fix: bug fix
WIP
```

## Pull Request Process

1. **Before submitting:**
   - Ensure all tests pass: `bun test && cargo test`
   - Run linting: `bun lint:fix && bun lint && bun typecheck`
   - Update documentation if needed

2. **When submitting:**
   - Fill out the PR template completely
   - Link related issues using "Fixes #123" or "Relates to #123"
   - Request review from maintainers

3. **After submitting:**
   - Address review comments promptly
   - Keep your branch up to date with `main`
   - Squash commits if requested

## Coding Standards

### TypeScript

- **No `any`**: Use `unknown` with type guards instead
- **Strict mode**: All TypeScript is in strict mode
- **Import order**: React → External → Workspace (`@cadhy/*`) → Local (`@/`) → Types
- **Components**: Use `data-slot` attribute on all components
- **Icons**: Hugeicons ONLY (not lucide-react, react-icons, etc.)

See `.agents/standards/CONVENTIONS.md` for complete guidelines.

### Rust

- **No `unwrap()`**: Use `?` operator and proper error handling
- **Use `anyhow`**: For error handling in applications
- **Documentation**: Document public APIs with doc comments
- **Tests**: Write tests in `tests/` directory

See `.agents/standards/CONVENTIONS.md` for complete guidelines.

### CSS

- **Tailwind only**: No CSS modules or inline styles
- **CSS variables**: Use design tokens, not hardcoded colors
- **`cn()` utility**: For merging class names

See `.agents/standards/SHADCN-V2.md` for UI component guidelines.

## Questions?

- Open a [Discussion](https://github.com/nicofrem/CADHY/discussions) for questions
- Check existing issues before opening new ones
- Read the documentation in `.agents/`

Thank you for contributing! 🙏
