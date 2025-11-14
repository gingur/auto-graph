import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AutoGraph } from '../../../src';

describe('AutoGraph.has()', () => {
  it('should return true for existing tasks', () => {
    const graph = new AutoGraph().add('task1', [], () => 42);
    assert.strictEqual(graph['has']('task1'), true);
  });

  it('should return false for non-existing tasks', () => {
    const graph = new AutoGraph().add('task1', [], () => 42);
    assert.strictEqual(graph['has']('task2'), false);
  });

  it('should return false for empty graph', () => {
    const graph = new AutoGraph();
    assert.strictEqual(graph['has']('anything'), false);
  });

  it('should check multiple tasks', () => {
    const graph = new AutoGraph().add('a', [], () => 1).add('b', [], () => 2);

    assert.strictEqual(graph['has']('a'), true);
    assert.strictEqual(graph['has']('b'), true);
    assert.strictEqual(graph['has']('c'), false);
  });
});
