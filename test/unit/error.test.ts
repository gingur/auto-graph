import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AutoGraphError } from '../../src';

describe('AutoGraphError', () => {
  it('should create error with custom message', () => {
    const error = new AutoGraphError('Custom error');
    assert.ok(error instanceof Error);
    assert.strictEqual(error.message, '[auto-graph]: Custom error');
  });

  it('should create error with default message', () => {
    const error = new AutoGraphError();
    assert.ok(error instanceof Error);
    assert.strictEqual(error.message, '[auto-graph]: Unknown error');
  });

  it('should support error options', () => {
    const cause = new Error('Root cause');
    const error = new AutoGraphError('Wrapper error', { cause });
    assert.ok(error instanceof Error);
    assert.strictEqual(error.message, '[auto-graph]: Wrapper error');
    assert.strictEqual(error.cause, cause);
  });

  it('should be instance of Error', () => {
    const error = new AutoGraphError('Test');
    assert.ok(error instanceof Error);
    assert.ok(error instanceof AutoGraphError);
  });

  it('should have correct name property', () => {
    const error = new AutoGraphError('Test');
    assert.strictEqual(error.name, 'Error');
  });

  it('should format empty string message', () => {
    const error = new AutoGraphError('');
    assert.strictEqual(error.message, '[auto-graph]: Unknown error');
  });
});
