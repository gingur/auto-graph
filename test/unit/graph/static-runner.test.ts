import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AutoGraph, AutoGraphRunner } from '../../../src';

describe('AutoGraph static runner property', () => {
  it('should reference AutoGraphRunner', () => {
    assert.strictEqual(AutoGraph.runner, AutoGraphRunner);
  });

  it('should be used by runner() method', () => {
    const graph = new AutoGraph().add('task1', [], () => 42);
    const runner = graph.runner();
    assert.ok(runner instanceof AutoGraph.runner);
  });
});
