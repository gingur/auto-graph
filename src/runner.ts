import { AutoGraphError } from './error';

import type { AutoGraphTask, RecordLike } from './types';

/**
 * Executes AutoGraph tasks with automatic parallelization and dependency resolution.
 *
 * This class manages the execution lifecycle of tasks, running them as soon as their
 * dependencies are fulfilled. Independent tasks are executed in parallel automatically.
 *
 * @template Tasks - Record of all task names and their types
 * @template Result - The final result type (mirrors Tasks structure)
 * @template Name - Union type of all task names
 *
 * @example Extending the runner
 * ```typescript
 * class LoggingRunner extends AutoGraphRunner {
 *   protected async exec(name) {
 *     console.log(`[START] ${String(name)}`);
 *     await super.exec(name);
 *     console.log(`[DONE] ${String(name)}`);
 *   }
 * }
 *
 * AutoGraph.runner = LoggingRunner;
 * ```
 */
export class AutoGraphRunner<
  Tasks extends RecordLike = {},
  Result extends { [N in keyof Tasks]: Tasks[N] } = { [N in keyof Tasks]: Tasks[N] },
  Name extends keyof Tasks = keyof Tasks,
> {
  /** Array of all task names in the graph */
  protected readonly names: Name[];

  /** Partial result object accumulating completed task results */
  protected readonly data: Partial<Result>;

  /** Map of task names to their task definitions */
  protected readonly tasks: Record<Name, AutoGraphTask>;

  /** Set of task names that have been completed */
  protected readonly fulfilled: Set<Name>;

  /** Map of currently running tasks to their execution promises */
  protected readonly pending: Map<Name, Promise<void>>;

  /**
   * Creates a new runner instance.
   *
   * @param tasks - The graph's task definitions
   * @param cache - Optional pre-computed results to skip execution
   */
  constructor(tasks: Tasks, cache: RecordLike = {}) {
    this.data = {};
    this.tasks = tasks;
    this.names = Object.keys(tasks) as Name[];
    this.fulfilled = new Set();
    this.pending = new Map();
    this.names.forEach((name) => {
      if (name in cache) {
        this.fulfilled.add(name);
        this.data[name] = cache[name as string];
      }
    });
  }

  /**
   * Executes a single task by gathering its dependency results and calling its function.
   *
   * @param name - The name of the task to execute
   * @internal
   */
  protected async exec(name: Name) {
    const task = this.tasks[name];
    const args = Object.fromEntries(task.deps.map((dep) => [dep, this.data[dep as Name]]));
    this.data[name] = await task.fn(args);
    this.fulfilled.add(name);
    this.pending.delete(name);
  }

  /**
   * Queues tasks that are ready to execute (all dependencies fulfilled).
   *
   * Iterates through all tasks and starts execution for those whose dependencies
   * have been completed and are not already running or completed.
   *
   * @internal
   */
  protected queue(): void {
    this.names.forEach((name) => {
      if (
        !this.fulfilled.has(name) &&
        !this.pending.has(name) &&
        this.tasks[name].deps.every((dep) => this.fulfilled.has(dep as Name))
      ) {
        this.pending.set(name, this.exec(name));
      }
    });
  }

  /**
   * Runs all tasks in the graph with automatic parallelization.
   *
   * Uses a promise-based coordination strategy:
   * 1. Queue all tasks whose dependencies are ready
   * 2. Wait for any task to complete using Promise.race()
   * 3. Repeat until all tasks are fulfilled
   *
   * @returns Promise resolving to the complete result object
   * @throws {AutoGraphError} If a circular dependency or missing dependency is detected
   */
  async run(): Promise<Result> {
    while (this.fulfilled.size < this.names.length) {
      this.queue();
      if (!this.pending.size) {
        throw new AutoGraphError('Cycle or missing dependency detected');
      }
      await Promise.race(this.pending.values());
    }
    return this.data as Result;
  }
}
