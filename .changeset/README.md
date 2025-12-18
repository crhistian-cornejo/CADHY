# Changesets

This directory manages versioning and changelog generation for CADHY using [Changesets](https://github.com/changesets/changesets).

## Quick Start

### 1. Create a Changeset (after making changes)

```bash
bun changeset
# or
bun changeset:add
```

This will prompt you to:
1. Select which packages changed
2. Choose the version bump type (major/minor/patch)
3. Write a summary of your changes

### 2. Check Pending Changesets

```bash
bun changeset:status
```

### 3. Apply Version Bumps (automated via CI)

```bash
bun version
```

This updates package versions and generates CHANGELOG entries.

## Version Bump Types

| Type | When to Use | Example |
|------|------------|---------|
| `patch` | Bug fixes, small improvements | "Fix calculation error in flow analysis" |
| `minor` | New features (backward compatible) | "Add trapezoidal channel support" |
| `major` | Breaking changes | "Redesign project file format" |

## Workflow

1. **Development**: Make your changes on a feature branch
2. **Changeset**: Run `bun changeset` and describe your changes
3. **PR**: Include the `.changeset/*.md` file in your PR
4. **Merge**: When merged to main, CI creates a Release PR
5. **Release**: Merge the Release PR to publish versions

## Tips

- Write changesets from a user's perspective
- One changeset per logical change (can include multiple packages)
- Use imperative mood: "Add feature" not "Added feature"
- Reference issues when relevant: "Fix memory leak (#123)"

## Linked Packages

The following app packages are versioned together:
- `@cadhy/desktop`
- `@cadhy/web`

A change to any of these will bump all of them.

## Ignored Packages

The following packages are not tracked by changesets:
- `@cadhy/config` - Internal configuration, not versioned
