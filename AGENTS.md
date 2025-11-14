# Agent Instructions for auto-graph

This document provides guidance for AI coding assistants working on the `auto-graph` project.

## Project Overview

`auto-graph` is a promise-first dependency graph runner with fluent generics for type-safe task chaining. It enables automatic parallelization and intelligent dependency resolution for complex workflows.

**Key Features:**

- Automatic parallelization of independent tasks
- Smart dependency resolution
- Fluent generics for type safety
- Incremental computation with caching
- Immutable API (each `.add()` returns a new graph)

## Quick Reference

### File Structure

```
src/
├── index.ts        # Main exports (AutoGraph, AutoGraphRunner, AutoGraphError)
├── graph.ts        # AutoGraph class - main user-facing API
├── runner.ts       # AutoGraphRunner class - execution engine
├── error.ts        # AutoGraphError class
└── types.ts        # Type definitions

test/
├── unit/
│   ├── error.test.ts
│   ├── runner.test.ts
│   └── graph/      # One test file per AutoGraph method
└── integration/
    ├── index.test.ts
    └── readme.test.ts
```

### Key Type Signatures

```typescript
// Core types
type RecordLike = Record<string, any>;
type AutoGraphDeps = readonly string[];
type AutoGraphFn<Input extends RecordLike = RecordLike, Output = any> = (args: Input) => Output;

interface AutoGraphTask {
  deps: AutoGraphDeps;
  fn: AutoGraphFn;
}

// Main class
class AutoGraph<Tasks extends RecordLike = {}> {
  static runner = AutoGraphRunner;
  readonly tasks: Record<string, AutoGraphTask>;

  constructor(tasks?: Record<string, AutoGraphTask>);
  protected has(name: string): boolean;
  add<TaskName, TaskFn>(name: TaskName, fn: TaskFn): AutoGraph<...>;
  add<TaskName, TaskDeps, TaskFn>(name: TaskName, deps: TaskDeps, fn: TaskFn): AutoGraph<...>;
  run(cache?: RecordLike): Promise<Tasks>;
  runner(cache?: RecordLike): AutoGraphRunner<Tasks>;
}
```

### Common Patterns

**Basic Task Addition:**

```typescript
// No dependencies
graph.add('taskName', () => value);

// With dependencies
graph.add('taskName', ['dep1', 'dep2'], ({ dep1, dep2 }) => value);
```

**Type-Safe Chaining:**

```typescript
const graph = new AutoGraph()
  .add('a', () => 1) // a: number
  .add('b', ['a'], ({ a }) => a + 1); // b: number, a is typed
```

**Execution:**

```typescript
await graph.run(); // Run all tasks
await graph.run({ task1: cached }); // Run with cache
```

## Architecture

### Core Classes

1. **`AutoGraph<Tasks>`** (`src/graph.ts`)
   - Main user-facing class
   - Immutable - each operation returns a new instance
   - Generic type `Tasks` accumulates task definitions for type safety
   - Public methods:
     - `add(name, fn)` or `add(name, deps, fn)` - Add tasks to the graph
     - `run(cache?)` - Execute all tasks
     - `runner(cache?)` - Get a runner instance
   - Protected methods:
     - `has(name)` - Check if a task exists (used internally)

2. **`AutoGraphRunner<Tasks>`** (`src/runner.ts`)
   - Handles actual task execution
   - Manages parallel execution and dependency resolution
   - Uses promise-based coordination (no polling)
   - Can be extended via `AutoGraph.runner` static property

3. **`AutoGraphError`** (`src/error.ts`)
   - Custom error class for graph-related errors

### Type System

- **`RecordLike`** - `Record<string, any>` - Generic object type
- **`AutoGraphDeps`** - `readonly string[]` - Array of dependency names
- **`AutoGraphFn`** - Function that takes dependencies and returns a value
- **`AutoGraphTask`** - Object with `deps` and `fn` properties

## Code Style & Conventions

### Code Formatting & Linting

**All code is automatically formatted and linted:**

- **Prettier** handles code formatting (runs first)
- **ESLint** handles code quality and catches issues (runs after Prettier)
- Pre-commit hooks ensure all committed code is formatted and linted
- Run `npm run lint` to automatically fix all formatting and linting issues
- All lint commands fix issues by default (no separate format command needed)

**Style enforced by Prettier:**

- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in ES5-compatible locations
- 100 character line width
- Arrow function parens: avoid when possible

### TypeScript

- Use strict TypeScript with full type safety
- Leverage fluent generics to maintain type information through chains
- Use `readonly` for arrays that shouldn't be modified
- Prefer `const` over `let`
- Use explicit return types for public methods
- `any` is allowed when necessary (ESLint rule disabled)
- Use `{}` for generic type defaults (ESLint configured to allow this)

### Testing

**Test Structure:**

```
test/
├── unit/
│   ├── error.test.ts
│   ├── runner.test.ts
│   └── graph/              # All AutoGraph tests organized by method
│       ├── add.test.ts
│       ├── constructor.test.ts
│       ├── has.test.ts
│       ├── run.test.ts
│       ├── runner.test.ts
│       └── static-runner.test.ts
└── integration/
    ├── index.test.ts
    └── readme.test.ts      # Tests that verify README examples work
```

**Testing Conventions:**

- Use Node.js built-in test runner (`node:test`)
- Use `node:assert` for assertions
- Test file naming: `<method-name>.test.ts`
- Describe blocks: `'ClassName.methodName()'` format
- Integration tests must verify README examples stay in sync
- Use `@ts-ignore` or `@ts-expect-error` for intentional type violations in tests
- When breaking the chain pattern (storing graph in variable), add comments explaining type safety loss

**Test Helpers:**

```typescript
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
```

### Documentation

- Keep README.md in sync with code
- Every public API must have:
  - Description in README
  - Usage example in README
  - Integration test in `readme.test.ts`
- Use code examples that can actually run
- Document gotchas and anti-patterns

### Error Handling

- Use `AutoGraphError` for all graph-related errors
- Provide clear, actionable error messages
- Validate at build time when possible (e.g., duplicate task names, missing dependencies)
- Runtime errors from tasks should propagate naturally

## Development Workflow

### Code Quality & Linting

This project uses **Prettier** for code formatting and **ESLint** for linting, with **Husky** and **lint-staged** to enforce quality on every commit.

**Linting Commands:**

```bash
npm run lint              # Fix all formatting and linting issues (runs both commands below)
npm run lint:prettier     # Auto-fix code formatting with Prettier
npm run lint:eslint       # Auto-fix linting issues with ESLint
```

**Pre-commit Hook:**

- Automatically runs on every `git commit`
- Uses `lint-staged` to process only staged files
- Runs Prettier first, then ESLint
- Blocks commit if there are unfixable issues

**Configuration Files:**

- `.prettierrc` - Prettier configuration (2 spaces, single quotes, trailing commas)
- `.prettierignore` - Files to ignore (dist, node_modules, coverage, markdown)
- `eslint.config.mjs` - ESLint flat config with TypeScript support
- `.husky/pre-commit` - Pre-commit hook that runs `lint-staged`
- `package.json` - Contains `lint-staged` configuration

**lint-staged Configuration:**

```json
{
  "lint-staged": {
    "*.{ts,js,mjs,mts}": ["prettier --write", "eslint --fix"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

**ESLint Rules:**

- Uses `@eslint/js` recommended rules
- Uses `typescript-eslint` recommended rules
- Integrates with Prettier via `eslint-config-prettier`
- Custom rules:
  - `@typescript-eslint/no-explicit-any`: OFF (we use `any` intentionally)
  - `@typescript-eslint/no-empty-object-type`: Allows `{}` for generic defaults
  - `@typescript-eslint/no-unused-vars`: Ignores variables/args prefixed with `_`

**When Making Code Changes:**

1. Write your code
2. Run `npm run lint` to auto-fix all formatting and linting issues (optional, pre-commit will do this)
3. Commit - pre-commit hook will automatically fix and lint staged files
4. If commit is blocked due to unfixable issues, manually fix them and commit again

**Disabling Linting (Use Sparingly):**

```typescript
// eslint-disable-next-line @typescript-eslint/rule-name
const code = something;

// For entire file (avoid if possible)
/* eslint-disable @typescript-eslint/rule-name */
```

### Running Tests

```bash
npm test              # Run all tests (types + unit + integration)
npm run types         # TypeScript compilation check (includes test files)
npm run unit          # Run unit tests only
npm run integration   # Run integration tests only
npm run build         # Build the package
```

### Adding New Features

1. **Add the implementation** to the appropriate file in `src/`
2. **Add unit tests** in `test/unit/graph/<feature>.test.ts` (or appropriate location)
3. **Update README.md** with:
   - API documentation
   - Usage examples
   - Any gotchas or best practices
4. **Add integration tests** in `test/integration/readme.test.ts` to verify examples work
5. **Run full test suite** to ensure nothing breaks
6. **Update type definitions** if needed (auto-generated from TypeScript)

### Adding New Methods to AutoGraph

When adding a new method to `AutoGraph`:

1. Implement in `src/graph.ts`
2. Create new test file: `test/unit/graph/<method-name>.test.ts`
3. Use this template:

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AutoGraph } from '../../../src';

describe('AutoGraph.methodName()', () => {
  it('should do the thing', async () => {
    const graph = new AutoGraph().add('task', () => 42);

    const result = await graph.methodName();

    assert.strictEqual(result, expectedValue);
  });
});
```

4. Add to README API section
5. Add integration test example

## Important Patterns

### Fluent Generics

The library uses fluent generics to maintain type information through method chains:

```typescript
// ✅ GOOD - Types flow through the chain
const graph = new AutoGraph().add('a', () => 1).add('b', ['a'], ({ a }) => a + 1); // 'a' is correctly typed as number

// ❌ BAD - Breaking the chain loses type safety
let graph = new AutoGraph();
graph = graph.add('a', () => 1);
graph = graph.add('b', ['a'], ({ a }) => a + 1); // Type information lost!
```

### Immutability

Every `.add()` returns a **new** graph instance:

```typescript
const graph1 = new AutoGraph();
const graph2 = graph1.add('task', () => 42);

graph1.has('task'); // false
graph2.has('task'); // true
```

### Dependency Resolution

- Tasks run as soon as their dependencies are ready
- Independent tasks run in parallel automatically

## Common Tasks

### Adding a New Task Execution Mode

If you need to add a new way to execute tasks:

1. Add private helper methods if needed
2. Add public method to `AutoGraph` class
3. Consider if it needs a specialized runner or can reuse `AutoGraphRunner`
4. Add comprehensive tests covering:
   - Simple cases
   - Complex dependency graphs
   - Diamond patterns
   - Async tasks
   - Cache support
   - Error cases
5. Document in README with examples

### Extending the Runner

To create a custom runner:

```typescript
class CustomRunner extends AutoGraphRunner {
  // Override methods as needed
}

// Use it
AutoGraph.runner = CustomRunner;
```

## TypeScript Configuration

- Target: Node.js 22+
- Strict mode enabled
- Module: ESM
- Build tool: tsdown (generates CJS + ESM + types)

## Package Structure

```
dist/
├── index.js        # CommonJS bundle
├── index.mjs       # ESM bundle
├── index.d.ts      # CommonJS types
└── index.d.mts     # ESM types
```

## Gotchas & Known Issues

1. **Breaking the Chain**: Storing intermediate graphs in variables loses type information
2. **Test Imports**: Graph tests use `../../../src` due to folder structure
3. **@ts-ignore Comments**: Used intentionally in tests that demonstrate type safety loss

## Implementation Details

### How `.add()` Works

The `.add()` method has two overloads:

1. `add(name, fn)` - No dependencies
2. `add(name, deps, fn)` - With dependencies

**Key implementation points:**

- Uses `Exclude<string, keyof Tasks>` to prevent duplicate task names at type level
- Validates duplicate names and missing dependencies at runtime
- Returns a **new** `AutoGraph` instance (immutability)
- Uses spread operator to copy tasks: `{ ...this.tasks, [name]: { deps, fn } }`
- Generic type accumulates: `AutoGraph<Tasks & Record<TaskName, Awaited<ReturnType<TaskFn>>>>`

```typescript
// Simplified implementation
add(name, depsOrFn, fn?) {
  const deps = fn === undefined ? [] : depsOrFn;
  const actualFn = fn === undefined ? depsOrFn : fn;

  // Validation
  if (this.has(name)) throw new AutoGraphError(`Task '${name}' already exists`);
  for (const dep of deps) {
    if (!this.has(dep)) throw new AutoGraphError(`Task '${name}' depends on missing task '${dep}'`);
  }

  // Return new instance with added task
  return new AutoGraph({ ...this.tasks, [name]: { deps, fn: actualFn } });
}
```

### How `.run()` Works

1. Creates a new `AutoGraphRunner` instance
2. Runner initializes:
   - `fulfilled` set - tracks completed tasks
   - `pending` map - tracks running tasks
   - `data` object - stores results
   - Pre-populates from cache
3. Execution loop:
   - Queue tasks whose dependencies are fulfilled
   - Use `Promise.race()` to wait for any task to complete
   - Repeat until all tasks are fulfilled
4. Returns completed `data` object

**Key points:**

- No polling - uses promise-based coordination
- Parallel execution via `Promise.race()`
- Tasks start immediately when dependencies are ready

### How `AutoGraphRunner` Works

**Core algorithm:**

```typescript
async run() {
  while (this.fulfilled.size < this.names.length) {
    this.queue();  // Queue ready tasks
    if (!this.pending.size) {
      throw new AutoGraphError('Cycle or missing dependency detected');
    }
    await Promise.race(this.pending.values());  // Wait for any task
  }
  return this.data;
}
```

**The `queue()` method:**

- Iterates all task names
- Checks if task is ready: not fulfilled, not pending, all deps fulfilled
- Starts execution via `this.exec(name)`
- Stores promise in `pending` map

**The `exec()` method:**

- Gathers dependency results from `this.data`
- Calls task function with dependencies
- Stores result in `this.data`
- Marks as fulfilled
- Removes from pending

## Debugging Tips

### Tracing Task Execution

Add logging to runner:

```typescript
class DebugRunner extends AutoGraphRunner {
  protected async exec(name) {
    console.log(`Starting: ${String(name)}`);
    await super.exec(name);
    console.log(`Completed: ${String(name)}`);
  }
}

AutoGraph.runner = DebugRunner;
```

### Visualizing Dependencies

```typescript
function printDeps(graph: AutoGraph, name: string) {
  const deps = graph['deps'](name); // Protected method
  console.log(`${name} requires:`, Array.from(deps));
}
```

### Type Debugging

Use `satisfies` to check types without losing inference:

```typescript
const graph = new AutoGraph()
  .add('a', () => 1)
  .add('b', ['a'], ({ a }) => a + 1) satisfies AutoGraph<{ a: number; b: number }>;
```

## Common Pitfalls & Solutions

### Pitfall 1: Breaking the Chain

```typescript
// ❌ WRONG - Type information lost
let graph = new AutoGraph();
graph = graph.add('a', () => 1);
graph = graph.add('b', ['a'], ({ a }) => a + 1); // 'a' not typed correctly

// ✅ CORRECT - Chain directly
const graph = new AutoGraph().add('a', () => 1).add('b', ['a'], ({ a }) => a + 1); // 'a' is number
```

### Pitfall 2: Reusing Base Graphs

```typescript
// ❌ WRONG - baseGraph doesn't know about 'b'
const baseGraph = new AutoGraph().add('a', () => 1);
const extendedGraph = baseGraph.add('b', ['a'], ({ a }) => a + 1);
const broken = baseGraph.add('c', ['b'], ({ b }) => b + 1); // Error!

// ✅ CORRECT - Chain from extended graph
const working = extendedGraph.add('c', ['b'], ({ b }) => b + 1);
```

### Pitfall 3: Forgetting Async/Await

```typescript
// ❌ WRONG - Missing await
const results = graph.run(); // Promise<Tasks>, not Tasks
console.log(results.taskName); // undefined

// ✅ CORRECT
const results = await graph.run();
console.log(results.taskName); // Actual value
```

### Pitfall 4: Modifying Dependency Array

```typescript
// ❌ WRONG - Don't mutate arrays
const deps = ['a', 'b'];
graph.add('c', deps, ({ a, b }) => a + b);
deps.push('d'); // Doesn't affect task 'c'

// ✅ CORRECT - Use inline arrays or readonly
graph.add('c', ['a', 'b'], ({ a, b }) => a + b);
```

### Pitfall 5: Circular Dependencies

```typescript
// ❌ WRONG - Will throw "Cycle or missing dependency detected"
new AutoGraph().add('a', ['b'], ({ b }) => b + 1).add('b', ['a'], ({ a }) => a + 1); // Circular!

// ✅ CORRECT - Remove circular dependency
new AutoGraph().add('a', () => 1).add('b', ['a'], ({ a }) => a + 1);
```

## Testing Patterns

### Testing Type Safety

Use `@ts-expect-error` to verify type errors are caught:

```typescript
it('should prevent invalid dependencies', () => {
  const graph = new AutoGraph().add('a', () => 1);

  // @ts-expect-error - 'b' doesn't exist
  graph.add('c', ['b'], ({ b }) => b + 1);
});
```

### Testing Async Behavior

Use helper for timing:

```typescript
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

it('should run tasks in parallel', async () => {
  const start = Date.now();
  const graph = new AutoGraph()
    .add('a', async () => {
      await wait(100);
      return 1;
    })
    .add('b', async () => {
      await wait(100);
      return 2;
    });

  await graph.run();
  const duration = Date.now() - start;

  assert.ok(duration < 150, 'Tasks should run in parallel');
});
```

### Testing Error Cases

```typescript
it('should throw on duplicate task', () => {
  assert.throws(() => new AutoGraph().add('a', () => 1).add('a', () => 2), /already exists/);
});
```

## Performance Considerations

### Task Granularity

**Too fine-grained:**

```typescript
// ❌ Overhead from many tiny tasks
.add('add1', () => 1 + 1)
.add('add2', () => 2 + 2)
.add('add3', () => 3 + 3)
```

**Better:**

```typescript
// ✅ Combine related operations
.add('calculations', () => ({
  sum1: 1 + 1,
  sum2: 2 + 2,
  sum3: 3 + 3
}))
```

### Caching Strategy

**Cache expensive operations:**

```typescript
const expensiveResult = await graph.run();

// Later, reuse expensive results
const newResults = await graph.run({
  expensiveTask: expensiveResult.expensiveTask,
});
```

### Memory Management

**Large results:**

```typescript
// All results are kept in memory
const results = await graph.run();
```

## Decision Trees

### "Should I add a new method to AutoGraph?"

```
Is it a new way to execute tasks?
├─ Yes → Add to AutoGraph class
│         - Add private helpers if needed
│         - Create test file in test/unit/graph/
│         - Update README with examples
│         - Add integration test
│
└─ No → Is it about task execution logic?
        ├─ Yes → Consider extending AutoGraphRunner
        │         - Override protected methods
        │         - Test via AutoGraph.runner = CustomRunner
        │
        └─ No → Is it a utility function?
                └─ Consider if it belongs in the library
                   or should be user-land code

```

### "How should I structure my tests?"

```
What are you testing?
├─ AutoGraph method → test/unit/graph/<method>.test.ts
│                     Use template from AGENTS.md
│
├─ AutoGraphRunner → test/unit/runner.test.ts
│                    Test execution logic
│
├─ AutoGraphError → test/unit/error.test.ts
│                   Test error messages
│
├─ Integration → test/integration/
│                - index.test.ts for general integration
│                - readme.test.ts for README examples
│
└─ README example → MUST add to readme.test.ts
                    Ensures docs stay in sync
```

### "I'm getting type errors. What should I check?"

```
Type error in user code?
├─ Are you breaking the chain?
│  └─ Solution: Chain .add() calls directly
│
├─ Are you storing intermediate graphs?
│  └─ Solution: Chain from the most recent graph
│
├─ Are you using @ts-expect-error in tests?
│  └─ OK if intentionally testing type safety
│
└─ Is the error in dependency parameters?
   └─ Ensure dependencies exist before referencing
```

## Real-World Examples

### Example 1: Data Pipeline

```typescript
const pipeline = new AutoGraph()
  // Extract
  .add('fetchRawData', async () => {
    const response = await fetch('/api/raw-data');
    return response.json();
  })
  // Transform
  .add('cleanData', ['fetchRawData'], ({ fetchRawData }) => {
    return fetchRawData.filter((item) => item.valid);
  })
  .add('enrichData', ['cleanData'], async ({ cleanData }) => {
    const enriched = await Promise.all(
      cleanData.map(async (item) => ({
        ...item,
        metadata: await fetchMetadata(item.id),
      }))
    );
    return enriched;
  })
  // Load
  .add('saveToDatabase', ['enrichData'], async ({ enrichData }) => {
    await db.bulkInsert(enrichData);
    return { count: enrichData.length };
  });

const results = await pipeline.run();
console.log(`Saved ${results.saveToDatabase.count} records`);
```

### Example 2: Build System

```typescript
const build = new AutoGraph()
  // Parallel checks
  .add('lint', async () => {
    await exec('eslint .');
    return { errors: 0 };
  })
  .add('typeCheck', async () => {
    await exec('tsc --noEmit');
    return { errors: 0 };
  })
  .add('test', async () => {
    await exec('npm test');
    return { passed: true };
  })
  // Wait for all checks
  .add('compile', ['lint', 'typeCheck', 'test'], async () => {
    await exec('tsc');
    return { output: 'dist/' };
  })
  // Parallel post-compile tasks
  .add('bundle', ['compile'], async () => {
    await exec('webpack');
    return { file: 'dist/bundle.js' };
  })
  .add('generateDocs', ['compile'], async () => {
    await exec('typedoc');
    return { output: 'docs/' };
  });

// Run everything
await build.run();
```

### Example 3: Incremental Computation

```typescript
const analysis = new AutoGraph()
  .add('loadLargeDataset', async () => {
    // Expensive: 10 seconds
    return await loadGigabytesOfData();
  })
  .add('computeStatistics', ['loadLargeDataset'], ({ loadLargeDataset }) => {
    // Expensive: 5 seconds
    return calculateStats(loadLargeDataset);
  })
  .add('generateReport', ['computeStatistics'], ({ computeStatistics }) => {
    // Fast: 100ms
    return formatReport(computeStatistics);
  });

// First run: Takes ~15 seconds
const firstRun = await analysis.run();

// User changes report format, re-run with cache
// Only generateReport executes: Takes ~100ms
const secondRun = await analysis.run({
  loadLargeDataset: firstRun.loadLargeDataset,
  computeStatistics: firstRun.computeStatistics,
});
```

### Example 4: Custom Runner for Logging

```typescript
class LoggingRunner extends AutoGraphRunner {
  protected async exec(name) {
    const start = Date.now();
    console.log(`[START] ${String(name)}`);

    try {
      await super.exec(name);
      const duration = Date.now() - start;
      console.log(`[DONE] ${String(name)} (${duration}ms)`);
    } catch (error) {
      console.error(`[ERROR] ${String(name)}:`, error);
      throw error;
    }
  }
}

// Use custom runner globally
AutoGraph.runner = LoggingRunner;

const graph = new AutoGraph()
  .add('a', async () => {
    await wait(100);
    return 1;
  })
  .add('b', async () => {
    await wait(50);
    return 2;
  });

await graph.run();
// Output:
// [START] a
// [START] b
// [DONE] b (52ms)
// [DONE] a (103ms)
```

## Cheat Sheet

### Quick Commands

```bash
# Development
npm run build:watch              # Watch mode for building
npm run build            # Build dist/

# Code Quality
npm run lint             # Auto-fix all formatting and linting issues
npm run lint:prettier    # Auto-fix formatting with Prettier
npm run lint:eslint      # Auto-fix linting issues with ESLint

# Testing
npm test                 # Full test suite (types + unit + integration)
npm run types            # TypeScript check
npm run unit             # Unit tests only
npm run unit:watch       # Unit tests in watch mode
npm run integration      # Integration tests only
npm run coverage         # Full coverage report

# Publishing
npm run prepublishOnly   # Runs automatically before publish
```

### Common Code Snippets

**Basic graph:**

```typescript
const graph = new AutoGraph().add('task', () => value);
```

**With dependencies:**

```typescript
const graph = new AutoGraph().add('a', () => 1).add('b', ['a'], ({ a }) => a + 1);
```

**Async tasks:**

```typescript
const graph = new AutoGraph().add('fetch', async () => await fetchData());
```

**Multiple dependencies:**

```typescript
const graph = new AutoGraph()
  .add('a', () => 1)
  .add('b', () => 2)
  .add('c', ['a', 'b'], ({ a, b }) => a + b);
```

**With cache:**

```typescript
const results = await graph.run({ expensiveTask: cachedValue });
```

**Custom runner:**

```typescript
class CustomRunner extends AutoGraphRunner {
  protected async exec(name) {
    // Custom logic
    await super.exec(name);
  }
}
AutoGraph.runner = CustomRunner;
```

## Resources

- Main repo: https://github.com/gingur/auto-graph
- npm: https://www.npmjs.com/package/@gingur/auto-graph
- Inspired by: [async.auto](https://caolan.github.io/async/v3/docs.html#auto)

## Questions?

When in doubt:

1. Check existing tests for patterns
2. Ensure README examples work (integration tests verify this)
3. Maintain type safety through fluent generics
4. Keep the API immutable
5. Write clear, actionable error messages

---

**For AI Assistants:** This document is comprehensive. When working on this project:

- Start with the Quick Reference section for syntax
- Check Common Pitfalls before suggesting solutions
- Use the Decision Trees to determine where code belongs
- Reference Real-World Examples for complex scenarios
- Follow the Testing Patterns section for test structure
- Always maintain the fluent generic pattern for type safety
