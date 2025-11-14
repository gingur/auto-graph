/**
 * Custom error class for AutoGraph-related errors.
 *
 * @example
 * ```typescript
 * throw new AutoGraphError('Task "foo" already exists');
 * // Error: [auto-graph]: Task "foo" already exists
 * ```
 */
export class AutoGraphError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(`[auto-graph]: ${message || 'Unknown error'}`, options);
  }
}
