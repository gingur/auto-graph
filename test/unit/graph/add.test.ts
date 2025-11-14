import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AutoGraph } from '../../../src';

describe('AutoGraph.add()', () => {
  it('should add a task with no dependencies', () => {
    const graph = new AutoGraph().add('task1', [], () => 42);
    assert.ok(graph);
    assert.ok(graph['has']('task1'));
  });

  it('should add a task with dependencies', () => {
    const graph = new AutoGraph().add('a', [], () => 1).add('b', ['a'], ({ a }) => a + 1);
    assert.ok(graph);
    assert.ok(graph['has']('a'));
    assert.ok(graph['has']('b'));
  });

  it('should throw error if task name already exists', () => {
    assert.throws(() => {
      new AutoGraph().add('task1', [], () => 42).add('task1', [], () => 99);
    }, /already exists/);
  });

  it('should throw error if dependency does not exist', () => {
    assert.throws(() => {
      new AutoGraph()
        .add('task1', [], () => 42)
        // @ts-expect-error - testing runtime error with invalid dependency
        .add('task2', ['nonexistent'], () => 99);
    }, /depends on missing task/);
  });

  it('should add task with shorthand syntax (no deps array)', () => {
    const graph = new AutoGraph().add('task1', () => 42);
    assert.ok(graph['has']('task1'));
  });

  it('should maintain type safety for dependencies', async () => {
    const graph = new AutoGraph()
      .add('num', [], () => 42)
      .add('str', [], () => 'hello')
      .add('combined', ['num', 'str'], ({ num, str }) => `${str}: ${num}`);

    const result = await graph.run();
    assert.strictEqual(result.combined, 'hello: 42');
  });

  it('should chain multiple adds', () => {
    const graph = new AutoGraph()
      .add('a', [], () => 1)
      .add('b', [], () => 2)
      .add('c', [], () => 3);

    assert.ok(graph['has']('a'));
    assert.ok(graph['has']('b'));
    assert.ok(graph['has']('c'));
  });

  it('should handle complex dependency chains', () => {
    const graph = new AutoGraph()
      .add('a', [], () => 1)
      .add('b', ['a'], ({ a }) => a + 1)
      .add('c', ['b'], ({ b }) => b + 1)
      .add('d', ['c'], ({ c }) => c + 1);

    assert.ok(graph['has']('a'));
    assert.ok(graph['has']('b'));
    assert.ok(graph['has']('c'));
    assert.ok(graph['has']('d'));
  });

  it('should handle multiple dependencies', () => {
    const graph = new AutoGraph()
      .add('a', [], () => 1)
      .add('b', [], () => 2)
      .add('c', [], () => 3)
      .add('d', ['a', 'b', 'c'], ({ a, b, c }) => a + b + c);

    assert.ok(graph['has']('d'));
  });

  it('should return new graph instance', () => {
    const graph1 = new AutoGraph();
    const graph2 = graph1.add('task1', [], () => 42);

    assert.notStrictEqual(graph1, graph2);
    assert.ok(!graph1['has']('task1'));
    assert.ok(graph2['has']('task1'));
  });
});
