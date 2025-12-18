# CADHY Agent Instructions

> Configuration files for AI coding assistants (GitHub Copilot, Claude, Cursor, Gemini, etc.)

## Directory Structure

```text
.agents/
├── README.md                           # This file - overview and navigation
├── QUICKSTART.md                       # 5-minute quick start
├── rules/                              # Critical rules
│   └── CORE-RULES.md                   # Prime directive
├── context/                            # Project understanding
│   ├── ARCHITECTURE.md                 # System architecture
│   ├── VERSION.md                      # Version info & scheme
│   ├── RELEASES.md                     # Release history & roadmap
│   └── RELEASE-PROCESS.md              # How to release
├── standards/                          # Coding standards
│   ├── CONVENTIONS.md                  # Code conventions (TS, Rust, Git)
│   ├── BEST-PRACTICES.md               # Detailed practices
│   └── SHADCN-V2.md                    # shadcn/ui v2 + Tailwind v4
├── memories/                           # Session memories
│   └── MEMORIES.md                     # Known issues and solutions
└── plans/                              # Roadmaps and plans
```

**Other AI config files:**

- `.github/copilot-instructions.md` - GitHub Copilot (auto-loaded)
- `CLAUDE.md` - Claude Code instructions (auto-loaded)

---

## Quick Access by Use Case

| Use Case | Start Here |
|----------|------------|
| First time | `QUICKSTART.md` → `rules/CORE-RULES.md` |
| Coding standards | `standards/CONVENTIONS.md` |
| Architecture | `context/ARCHITECTURE.md` |
| Version info | `context/VERSION.md` → `context/RELEASES.md` |
| UI components | `standards/SHADCN-V2.md` |
| Known issues | `memories/MEMORIES.md` |

---

## Reading Order for AI Assistants

### Minimum (5 minutes)

1. `rules/CORE-RULES.md` (2 min)
2. `context/ARCHITECTURE.md` (2 min)
3. `context/VERSION.md` (30 sec)
4. Root `README.md` (30 sec)

### Recommended (15 minutes)

1. `rules/CORE-RULES.md` (2 min)
2. `context/ARCHITECTURE.md` (3 min)
3. `context/VERSION.md` (1 min)
4. `standards/CONVENTIONS.md` (5 min)
5. `standards/BEST-PRACTICES.md` (3 min)

---

## Critical Files

| File | Contains |
|------|----------|
| `rules/CORE-RULES.md` | Prime directive, what never/always to do |
| `context/ARCHITECTURE.md` | Monorepo structure, data flow, dependencies |
| `context/VERSION.md` | Current version, stage, version scheme |
| `standards/CONVENTIONS.md` | Code style, Git conventions, naming |

## Important Files

| File | Contains |
|------|----------|
| `context/RELEASES.md` | Release history, roadmap, migration guides |
| `context/RELEASE-PROCESS.md` | How to create releases |
| `standards/BEST-PRACTICES.md` | Pre-commit checklist, patterns |
| `standards/SHADCN-V2.md` | shadcn/ui v2 configuration |
| `memories/MEMORIES.md` | Known bugs, workarounds, learnings |

---

## Supported AI Assistants

| Assistant | Config File | Auto-loaded |
|-----------|-------------|-------------|
| Claude Code | `CLAUDE.md` | Yes |
| GitHub Copilot | `.github/copilot-instructions.md` | Yes |
| Cursor AI | `.cursorrules` | Yes (if created) |
| Others | Point to `.agents/rules/CORE-RULES.md` | Manual |

---

## File Reference

| File | Size | Time | Priority |
|------|------|------|----------|
| `QUICKSTART.md` | 6 KB | 2 min | Quick track |
| `CORE-RULES.md` | 7 KB | 2 min | Critical |
| `ARCHITECTURE.md` | 10 KB | 3 min | Critical |
| `VERSION.md` | 3 KB | 30 sec | Critical |
| `CONVENTIONS.md` | 20 KB | 5 min | Important |
| `BEST-PRACTICES.md` | 4 KB | 2 min | Important |
| `RELEASES.md` | 4 KB | 2 min | Reference |
| `SHADCN-V2.md` | 12 KB | 3 min | Task-specific |

---

## Updates

**Last Updated**: December 2025
**Version**: 0.1.0

Update these files when:

- Architectural decisions change
- Coding conventions evolve
- New tools or dependencies are added
- Bugs/workarounds are discovered

---

> **Note**: Always read core documentation before starting work. When uncertain, ask the developer rather than making assumptions.
