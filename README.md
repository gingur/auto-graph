# auto-graph

A promise-first dependency graph runner with fluent generics for type-safe task chaining. Build complex workflows with automatic parallelization and intelligent dependency resolution.

## Features

- 🚀 **Automatic Parallelization** - Independent tasks run concurrently
- 🔗 **Smart Dependency Resolution** - Tasks execute as soon as their dependencies are ready
- 🎯 **Fluent Generics** - Type information flows through the chain for full type safety
- 💾 **Incremental Computation** - Cache results to skip expensive recomputation
- 🔄 **Immutable API** - Each `.add()` returns a new graph instance
- ⚡ **Promise-First** - Native async/await support throughout

## Installation

```bash
npm install @gingur/auto-graph
```

## Quick Start

```typescript
import { AutoGraph } from '@gingur/auto-graph';

const graph = new AutoGraph()
  .add('fetchUser', async () => {
    const response = await fetch('/api/user');
    return response.json();
  })
  .add('fetchPosts', async () => {
    const response = await fetch('/api/posts');
    return response.json();
  })
  .add('enrichPosts', ['fetchUser', 'fetchPosts'], ({ fetchUser, fetchPosts }) => {
    return fetchPosts.map((post) => ({
      ...post,
      author: fetchUser.name,
    }));
  });

const results = await graph.run();
console.log(results.enrichPosts);
```

## API

### `new AutoGraph()`

Creates a new empty graph.

### `.add(name, fn)` or `.add(name, deps, fn)`

Add a task to the graph. Returns a new graph instance with the task added.

```typescript
// No dependencies
.add('task1', () => 42)

// With dependencies
.add('task2', ['task1'], ({ task1 }) => task1 * 2)
```

### `.run(cache?)`

Execute the graph and return all task results.

```typescript
const results = await graph.run();

// With cache to skip expensive tasks
const results = await graph.run({ expensiveTask: cachedValue });
```

## Fluent Generics & Type Safety

The library uses **fluent generics** to maintain type information as you chain `.add()` calls. Each task's return type is automatically inferred and available to dependent tasks:

```typescript
const graph = new AutoGraph()
  .add('num', () => 42) // Returns number
  .add('str', () => 'hello') // Returns string
  .add('combined', ['num', 'str'], ({ num, str }) => {
    // num is typed as number, str is typed as string
    return `${str}: ${num}`;
  });
```

### ⚠️ Gotcha: Breaking the Chain

**You must chain `.add()` calls directly** to maintain type information. Breaking the chain loses type safety:

```typescript
// ❌ BAD - Type information is lost
let graph = new AutoGraph();
graph = graph.add('a', () => 1);
graph = graph.add('b', ['a'], ({ a }) => a + 1); // 'a' is not typed correctly!

// ✅ GOOD - Types flow through the chain
const graph = new AutoGraph().add('a', () => 1).add('b', ['a'], ({ a }) => a + 1); // 'a' is correctly typed as number
```

### ⚠️ Gotcha: Storing Intermediate Graphs

Storing intermediate graphs in variables can cause type issues:

```typescript
// ❌ BAD - baseGraph doesn't know about tasks added later
const baseGraph = new AutoGraph().add('a', () => 1);

const extendedGraph = baseGraph.add('b', ['a'], ({ a }) => a + 1);

// This won't work as expected:
const broken = baseGraph.add('c', ['b'], ({ b }) => b + 1); // Error: 'b' doesn't exist on baseGraph!

// ✅ GOOD - Chain from the extended graph
const working = extendedGraph.add('c', ['b'], ({ b }) => b + 1); // Works correctly
```

## Examples

### Parallel Execution

Independent tasks run in parallel automatically:

```typescript
const graph = new AutoGraph()
  .add('fetchUsers', async () => await db.users.findMany())
  .add('fetchProducts', async () => await db.products.findMany())
  .add('combine', ['fetchUsers', 'fetchProducts'], ({ fetchUsers, fetchProducts }) => ({
    users: fetchUsers,
    products: fetchProducts,
  }));

await graph.run(); // fetchUsers and fetchProducts run in parallel
```

### Build Pipeline

```typescript
const pipeline = new AutoGraph()
  .add('lint', async () => {
    await exec('eslint .');
    return { errors: 0 };
  })
  .add('typeCheck', async () => {
    await exec('tsc --noEmit');
    return { errors: 0 };
  })
  .add('compile', ['lint', 'typeCheck'], async () => {
    await exec('tsc');
    return { output: 'dist/' };
  })
  .add('test', ['compile'], async () => {
    await exec('npm test');
    return { passed: true };
  })
  .add('bundle', ['compile'], async () => {
    await exec('webpack');
    return { file: 'dist/bundle.js' };
  });

await pipeline.run(); // test and bundle run in parallel after compile
```

### Incremental Computation

Skip expensive recomputation by providing cached results:

```typescript
const graph = new AutoGraph()
  .add('expensiveTask', async () => {
    await heavyProcessing();
    return { result: 'data' };
  })
  .add('processResult', ['expensiveTask'], ({ expensiveTask }) => {
    return expensiveTask.result.toUpperCase();
  });

// First run
const firstRun = await graph.run();

// Second run - reuse expensive computation
const cache = { expensiveTask: firstRun.expensiveTask };
const secondRun = await graph.run(cache); // expensiveTask is not re-executed
```

### Complex Dependencies

```typescript
const graph = new AutoGraph()
  .add('a', () => 1)
  .add('b', () => 2)
  .add('c', () => 3)
  .add('d', ['a'], ({ a }) => a * 2)
  .add('e', ['b'], ({ b }) => b * 2)
  .add('f', ['c'], ({ c }) => c * 2)
  .add('g', ['d', 'e'], ({ d, e }) => d + e)
  .add('h', ['e', 'f'], ({ e, f }) => e + f)
  .add('result', ['g', 'h'], ({ g, h }) => g * h);

const results = await graph.run();
console.log(results.result); // 60
```

## Error Handling

Build-time validation catches common mistakes:

```typescript
// Duplicate task names
new AutoGraph().add('task1', () => 1).add('task1', () => 2); // Throws: Task 'task1' already exists

// Missing dependencies
new AutoGraph().add('task1', () => 1).add('task2', ['missing'], () => 2); // Throws: depends on missing task 'missing'
```

Runtime errors propagate normally:

```typescript
const graph = new AutoGraph().add('task1', () => {
  throw new Error('Failed');
});

try {
  await graph.run();
} catch (err) {
  console.error('Task failed:', err);
}
```

## Performance

- **Parallel Execution**: Independent tasks run concurrently
- **Eager Execution**: Tasks start immediately when dependencies are ready
- **No Polling**: Promise-based coordination, no busy-waiting

## Requirements

- Node.js >= 22

## Inspiration

This project was inspired by [async.auto](https://caolan.github.io/async/v3/docs.html#auto) from the [Async.js](https://github.com/caolan/async) library. Thanks to all contributors for pioneering these concepts and helping improve developer experience.

## License

MIT

## Author

Troy Rhinehart

## Links

- [GitHub](https://github.com/gingur/auto-graph)
- [Issues](https://github.com/gingur/auto-graph/issues)
- [npm](https://www.npmjs.com/package/@gingur/auto-graph)
