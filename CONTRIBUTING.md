# Contributing to auto-graph

Thank you for your interest in contributing to auto-graph! This guide will walk you through the development workflow, from creating a PR to publishing releases.

## Table of Contents

- [Development Setup](#development-setup)
- [Creating a Pull Request](#creating-a-pull-request)
- [Adding a Changeset](#adding-a-changeset)
- [Publishing Flow](#publishing-flow)
- [Local Development](#local-development)

## Development Setup

### Prerequisites

- **Node.js**: Version 22 or higher (see `.nvmrc`)
- **npm**: Comes with Node.js

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/gingur/auto-graph.git
cd auto-graph

# Install dependencies
npm install

# Run tests to verify setup
npm test
```

## Creating a Pull Request

### 1. Create a Feature Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 2. Make Your Changes

Follow these guidelines:

- Write clean, idiomatic TypeScript code
- Add tests for new features or bug fixes
- Update documentation if needed (README.md, JSDoc comments)
- Follow existing code style (enforced by Prettier and ESLint)

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run unit:watch

# Check types
npm run types

# Run linter (auto-fixes issues)
npm run lint

# Build the package
npm run build
```

### 4. Add a Changeset

**Before creating a PR**, you must add a changeset to describe your changes:

```bash
npm run changeset
```

This will prompt you with:

1. **What type of change?**
   - `patch`: Bug fixes, documentation updates (1.0.0 → 1.0.1)
   - `minor`: New features, backwards-compatible changes (1.0.0 → 1.1.0)
   - `major`: Breaking changes (1.0.0 → 2.0.0)

2. **Write a summary**: Describe your changes (will appear in CHANGELOG.md)

Example changeset summary:

```
Add caching support to AutoGraph.run() method

Users can now pass a cache object to skip execution of expensive tasks.
```

The changeset will be saved in `.changeset/` directory. **Commit this file with your PR.**

### 5. Commit Your Changes

```bash
# Stage your changes
git add .

# Commit (pre-commit hooks will run linter automatically)
git commit -m "feat: add caching support"

# Push to your fork
git push origin feature/your-feature-name
```

### 6. Create the Pull Request

1. Go to GitHub and create a PR from your branch to `main`
2. Fill out the PR description:
   - Describe what changed
   - Explain why the change is needed
   - Link any related issues
3. Wait for CI tests to pass (automated via `.github/workflows/pr-test.yml`)
4. Address any review feedback

### PR Checklist

Before submitting, ensure:

- [ ] Tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Types check (`npm run types`)
- [ ] Changeset added (`npm run changeset`)
- [ ] Documentation updated if needed
- [ ] Examples added to README for new features
- [ ] Integration tests added for README examples

## Adding a Changeset

### When to Add a Changeset

**Always** add a changeset when:

- Adding a new feature
- Fixing a bug
- Making any user-facing changes
- Updating dependencies that affect users

**Don't** add a changeset for:

- Documentation-only changes (typos, clarifications)
- Internal refactoring with no user impact
- Updating dev dependencies
- CI/test configuration changes

### Changeset Types

#### Patch (1.0.0 → 1.0.1)

Bug fixes and minor improvements:

```bash
npm run changeset
# Select: patch
# Summary: Fix race condition in task execution
```

#### Minor (1.0.0 → 1.1.0)

New features, backwards-compatible:

```bash
npm run changeset
# Select: minor
# Summary: Add task cancellation support
```

#### Major (1.0.0 → 2.0.0)

Breaking changes:

```bash
npm run changeset
# Select: major
# Summary: Change AutoGraph constructor API to accept options object
```

### Multiple Changesets

If your PR includes multiple types of changes, you can add multiple changesets:

```bash
# Add first changeset
npm run changeset
# Select: minor
# Summary: Add new run() options

# Add second changeset
npm run changeset
# Select: patch
# Summary: Fix memory leak in runner
```

### Editing a Changeset

Changesets are Markdown files in `.changeset/`. You can edit them directly:

```bash
# Find your changeset file
ls .changeset/

# Edit it
vim .changeset/some-random-name.md
```

Example changeset file:

```markdown
---
'@gingur/auto-graph': minor
---

Add support for task cancellation

Users can now call `runner.cancel()` to stop execution and clean up resources.
```

## Publishing Flow

**Only maintainers** can publish to NPM. Here's how the automated publishing works:

### How It Works

1. **PR with Changeset**: Developer creates PR with changeset file
2. **PR Merged to Main**: After review and tests pass, PR is merged
3. **Changesets Bot**: GitHub Action detects changesets on `main` branch
4. **Version PR Created**: Bot creates/updates a "Version Packages" PR with:
   - Updated `package.json` version
   - Updated `CHANGELOG.md`
   - Consumed changesets (deleted)
5. **Publish**: Maintainer merges the Version PR → packages auto-publish to NPM

### Manual Publishing (Maintainers Only)

If needed, you can publish manually:

```bash
# 1. Update versions based on changesets
npm run changeset:version

# 2. Commit the version changes
git add .
git commit -m "chore: version packages"
git push

# 3. Publish to NPM (requires NPM_TOKEN)
npm run changeset:publish

# 4. Push tags
git push --follow-tags
```

### Setting Up NPM Trusted Publishing (Maintainers)

This repository uses NPM's Trusted Publishing with provenance, which is more secure than using tokens.

1. **Configure NPM Trusted Publishing:**
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/packages/@gingur/auto-graph/access
   - Enable "Require two-factor authentication"
   - Under "Publishing access", add GitHub Actions as a trusted publisher
   - Repository: `gingur/auto-graph`
   - Workflow: `publish.yml`
   - Environment: (leave empty for default)

2. **Add NPM Token to GitHub Secrets (still required for changesets):**
   - Generate an automation token: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Go to repository Settings → Secrets and variables → Actions
   - Add new secret: `NPM_TOKEN`
   - Paste the token value

The workflow uses:

- **Provenance**: Automatically generates attestations linking the package to the source code
- **OIDC**: GitHub Actions authenticates directly with NPM (no long-lived tokens)
- **`id-token: write`**: Permission for GitHub to generate OIDC tokens

## Local Development

### Project Structure

```
auto-graph/
├── .changeset/          # Changesets for version management
├── .github/workflows/   # CI/CD workflows
├── src/                 # Source code
│   ├── error.ts
│   ├── graph.ts
│   ├── runner.ts
│   ├── types.ts
│   └── index.ts
├── test/
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
├── dist/               # Built output (gitignored)
└── package.json
```

### Available Scripts

#### Testing

```bash
npm test                    # Full test suite (types + unit + integration)
npm run types               # TypeScript type checking
npm run unit                # Unit tests
npm run unit:watch          # Unit tests in watch mode
npm run integration         # Integration tests
npm run coverage            # Full coverage report
npm run cicd-test          # CI/CD test (types + coverage)
```

#### Building

```bash
npm run build              # Build package
npm run build:watch        # Build in watch mode
```

#### Linting

```bash
npm run lint               # Auto-fix all linting and formatting
npm run lint:prettier      # Auto-fix formatting only
npm run lint:eslint        # Auto-fix ESLint issues only
```

#### Changesets

```bash
npm run changeset          # Add a new changeset
npm run changeset:version  # Update versions (maintainers only)
npm run changeset:publish  # Publish to NPM (maintainers only)
```

### Development Workflow

```bash
# 1. Start development
git checkout -b feature/my-feature

# 2. Make changes and test in watch mode
npm run unit:watch

# 3. Run full test suite
npm test

# 4. Lint code (pre-commit hook also does this)
npm run lint

# 5. Add changeset
npm run changeset

# 6. Commit and push
git add .
git commit -m "feat: my feature"
git push origin feature/my-feature

# 7. Create PR on GitHub
```

### Pre-commit Hooks

The repository uses Husky and lint-staged to ensure code quality:

- **Prettier**: Auto-formats code
- **ESLint**: Fixes linting issues
- Runs on staged files only
- Blocks commit if there are unfixable errors

### Code Style

- **TypeScript**: Strict mode enabled
- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Line width**: 100 characters
- **Import sorting**: Alphabetical, grouped by type

All enforced automatically by Prettier and ESLint.

## Testing Guidelines

### Unit Tests

- Location: `test/unit/`
- Organized by class/method
- Use Node.js built-in test runner

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert';

import { AutoGraph } from '../../../src';

describe('AutoGraph.add()', () => {
  it('should add a task', () => {
    const graph = new AutoGraph().add('task', () => 42);
    assert.ok(graph);
  });
});
```

### Integration Tests

- Location: `test/integration/`
- Test real-world scenarios
- **Important**: `readme.test.ts` must verify all README examples work

### Test Coverage

Aim for high coverage, but focus on meaningful tests:

- Core functionality: 100%
- Error cases: All major error paths
- Edge cases: Document in tests

## Documentation

### JSDoc Comments

All public APIs must have JSDoc:

````typescript
/**
 * Adds a task to the graph.
 *
 * @param name - Unique task name
 * @param fn - Task function
 * @returns New AutoGraph instance
 *
 * @example
 * ```typescript
 * const graph = new AutoGraph().add('task', () => 42);
 * ```
 */
add(name: string, fn: Function): AutoGraph;
````

### README Updates

When adding features:

1. Add to API documentation section
2. Add usage examples
3. Add to `test/integration/readme.test.ts` to verify examples work

## Getting Help

- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Code Review**: Request review in your PR

## Code of Conduct

Be respectful, inclusive, and constructive. We're all here to make auto-graph better!

---

**Thank you for contributing!** 🎉
