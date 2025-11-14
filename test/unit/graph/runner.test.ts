import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AutoGraph, AutoGraphRunner } from '../../../src';

describe('AutoGraph.runner()', () => {
  it('should return a runner instance', () => {
    const graph = new AutoGraph().add('task1', [], () => 42);
    const runner = graph.runner();

    assert.ok(runner);
    assert.ok(runner instanceof AutoGraphRunner);
  });

  it('should accept cache parameter', async () => {
    const callCount = { a: 0 };

    const graph = new AutoGraph()
      .add('a', [], () => {
        callCount.a++;
        return 1;
      })
      .add('b', ['a'], ({ a }) => a + 1);

    const runner = graph.runner({ a: 10 });
    const result = await runner.run();

    assert.strictEqual(callCount.a, 0); // should not be called
    assert.strictEqual(result.a, 10);
    assert.strictEqual(result.b, 11);
  });

  it('should be reusable for multiple runs with different caches', async () => {
    const graph = new AutoGraph().add('a', [], () => 1).add('b', ['a'], ({ a }) => a + 1);

    const result1 = await graph.runner({ a: 10 }).run();
    const result2 = await graph.runner({ a: 20 }).run();
    const result3 = await graph.runner().run();

    assert.strictEqual(result1.a, 10);
    assert.strictEqual(result1.b, 11);

    assert.strictEqual(result2.a, 20);
    assert.strictEqual(result2.b, 21);

    assert.strictEqual(result3.a, 1);
    assert.strictEqual(result3.b, 2);
  });

  it('should return same runner class type', () => {
    const graph = new AutoGraph().add('task1', [], () => 42);
    const runner = graph.runner();

    assert.strictEqual(runner.constructor, AutoGraph.runner);
  });
});
