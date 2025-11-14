import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AutoGraph } from '../../../src';

describe('AutoGraph.constructor', () => {
  it('should create empty graph', () => {
    const graph = new AutoGraph();
    assert.ok(graph);
    assert.deepStrictEqual(graph.tasks, {});
  });

  it('should create graph with initial tasks', () => {
    const tasks = {
      a: { deps: [], fn: () => 1 },
    };
    const graph = new AutoGraph(tasks);
    assert.ok(graph);
    assert.strictEqual(graph.tasks, tasks);
  });
});
