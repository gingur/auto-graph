import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AutoGraph } from '../../../src';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('AutoGraph.run()', () => {
  it('should run a single task with no dependencies', async () => {
    const graph = new AutoGraph().add('task1', [], () => 42);
    const result = await graph.run();
    assert.strictEqual(result.task1, 42);
  });

  it('should run task with shorthand syntax', async () => {
    const graph = new AutoGraph().add('task1', () => 42);
    const result = await graph.run();
    assert.strictEqual(result.task1, 42);
  });

  it('should handle async task with shorthand syntax', async () => {
    const graph = new AutoGraph().add('task1', async () => {
      await wait(10);
      return 42;
    });
    const result = await graph.run();
    assert.strictEqual(result.task1, 42);
  });

  it('should run multiple tasks', async () => {
    const graph = new AutoGraph()
      .add('a', [], () => 1)
      .add('b', ['a'], ({ a }) => a + 1)
      .add('c', ['b'], ({ b }) => b + 1);

    const result = await graph.run();

    assert.strictEqual(result.a, 1);
    assert.strictEqual(result.b, 2);
    assert.strictEqual(result.c, 3);
  });

  it('should handle empty graph', async () => {
    const graph = new AutoGraph();
    const result = await graph.run();
    assert.deepStrictEqual(result, {});
  });

  it('should use cache to skip running cached tasks', async () => {
    const callCount: Record<string, number> = { a: 0, b: 0, c: 0 };

    const graph = new AutoGraph()
      .add('a', [], () => {
        callCount.a++;
        return 1;
      })
      .add('b', ['a'], ({ a }) => {
        callCount.b++;
        return a + 1;
      })
      .add('c', ['b'], ({ b }) => {
        callCount.c++;
        return b + 1;
      });

    const cache = { a: 10, b: 20 };
    const result = await graph.run(cache);

    // a and b should not be called (cached)
    assert.strictEqual(callCount.a, 0);
    assert.strictEqual(callCount.b, 0);
    // c should be called
    assert.strictEqual(callCount.c, 1);

    // Results should use cached values
    assert.strictEqual(result.a, 10);
    assert.strictEqual(result.b, 20);
    assert.strictEqual(result.c, 21); // b (20) + 1
  });

  it('should handle partial cache', async () => {
    const graph = new AutoGraph()
      .add('a', [], () => 1)
      .add('b', [], () => 2)
      .add('c', ['a', 'b'], ({ a, b }) => a + b);

    const cache = { a: 10 };
    const result = await graph.run(cache);

    assert.strictEqual(result.a, 10); // from cache
    assert.strictEqual(result.b, 2); // computed
    assert.strictEqual(result.c, 12); // 10 + 2
  });

  it('should handle empty cache', async () => {
    const graph = new AutoGraph().add('a', [], () => 1).add('b', ['a'], ({ a }) => a + 1);

    const result = await graph.run({});

    assert.strictEqual(result.a, 1);
    assert.strictEqual(result.b, 2);
  });

  it('should handle complex dependency graph', async () => {
    const graph = new AutoGraph()
      .add('a', [], () => 1)
      .add('b', [], () => 2)
      .add('c', ['a'], ({ a }) => a + 1)
      .add('d', ['b'], ({ b }) => b + 1)
      .add('e', ['c', 'd'], ({ c, d }) => c + d)
      .add('f', ['a', 'e'], ({ a, e }) => a * e)
      .add('g', ['b', 'e'], ({ b, e }) => b * e)
      .add('h', ['f', 'g'], ({ f, g }) => f + g);

    const result = await graph.run();

    assert.strictEqual(result.a, 1);
    assert.strictEqual(result.b, 2);
    assert.strictEqual(result.c, 2);
    assert.strictEqual(result.d, 3);
    assert.strictEqual(result.e, 5);
    assert.strictEqual(result.f, 5);
    assert.strictEqual(result.g, 10);
    assert.strictEqual(result.h, 15);
  });
});
