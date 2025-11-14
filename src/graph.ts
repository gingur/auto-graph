import { AutoGraphError } from './error';
import { AutoGraphRunner } from './runner';

import type { AutoGraphDeps, AutoGraphFn, AutoGraphTask, RecordLike } from './types';

/**
 * Promise-first dependency graph runner with fluent generics for type-safe task chaining.
 *
 * AutoGraph enables automatic parallelization and intelligent dependency resolution for complex workflows.
 * Each `.add()` returns a new immutable graph instance with accumulated type information.
 *
 * @template Tasks - Record type accumulating all task names and their return types
 *
 * @example
 * ```typescript
 * const graph = new AutoGraph()
 *   .add('a', () => 1)
 *   .add('b', () => 2)
 *   .add('c', ['a', 'b'], ({ a, b }) => a + b);
 *
 * const results = await graph.run();
 * console.log(results.c); // 3
 * ```
 *
 * @example With async tasks
 * ```typescript
 * const graph = new AutoGraph()
 *   .add('fetchData', async () => {
 *     const response = await fetch('/api/data');
 *     return response.json();
 *   })
 *   .add('processData', ['fetchData'], ({ fetchData }) => {
 *     return fetchData.map(item => item.value);
 *   });
 *
 * const results = await graph.run();
 * ```
 *
 * @example With caching for incremental computation
 * ```typescript
 * const firstRun = await graph.run();
 * // Later, reuse expensive results
 * const secondRun = await graph.run({
 *   expensiveTask: firstRun.expensiveTask
 * });
 * ```
 */
export class AutoGraph<Tasks extends RecordLike = {}> {
  /**
   * The runner class used to execute the graph. Can be overridden to use a custom runner.
   *
   * @example
   * ```typescript
   * class CustomRunner extends AutoGraphRunner {
   *   protected async exec(name) {
   *     console.log(`Running: ${String(name)}`);
   *     await super.exec(name);
   *   }
   * }
   *
   * AutoGraph.runner = CustomRunner;
   * ```
   */
  static runner = AutoGraphRunner;

  /**
   * Internal record of all tasks in the graph.
   * Each task contains its dependencies and function.
   */
  readonly tasks: Record<string, AutoGraphTask>;

  /**
   * Creates a new AutoGraph instance.
   *
   * @param tasks - Optional initial tasks object (used internally for immutability)
   */
  constructor(tasks: AutoGraph<Tasks>['tasks'] = {}) {
    this.tasks = tasks;
  }

  /**
   * Checks if a task exists in the graph.
   *
   * @param name - The task name to check
   * @returns True if the task exists, false otherwise
   * @internal
   */
  protected has(name: string) {
    return name in this.tasks;
  }

  /**
   * Adds a task to the graph with no dependencies.
   *
   * @template TaskName - The unique name for this task
   * @template TaskFn - The function type for this task
   * @param name - Unique task name (must not already exist)
   * @param fn - Function that returns the task result
   * @returns A new AutoGraph instance with the added task and updated types
   * @throws {AutoGraphError} If a task with this name already exists
   *
   * @example
   * ```typescript
   * const graph = new AutoGraph()
   *   .add('task1', () => 42);
   * ```
   */
  add<TaskName extends Exclude<string, keyof Tasks>, TaskFn extends (args: {}) => any>(
    name: TaskName,
    fn: TaskFn
  ): AutoGraph<Tasks & Record<TaskName, Awaited<ReturnType<TaskFn>>>>;
  /**
   * Adds a task to the graph with dependencies.
   *
   * @template TaskName - The unique name for this task
   * @template TaskDeps - Array of dependency task names
   * @template TaskFn - The function type for this task
   * @param name - Unique task name (must not already exist)
   * @param deps - Array of task names this task depends on
   * @param fn - Function that receives dependency results and returns the task result
   * @returns A new AutoGraph instance with the added task and updated types
   * @throws {AutoGraphError} If a task with this name already exists
   * @throws {AutoGraphError} If any dependency doesn't exist
   *
   * @example
   * ```typescript
   * const graph = new AutoGraph()
   *   .add('a', () => 1)
   *   .add('b', () => 2)
   *   .add('sum', ['a', 'b'], ({ a, b }) => a + b);
   * ```
   */
  add<
    TaskName extends Exclude<string, keyof Tasks>,
    TaskDeps extends readonly (keyof Tasks)[],
    TaskFn extends (args: { [Key in TaskDeps[number]]: Tasks[Key] }) => any,
  >(
    name: TaskName,
    deps: TaskDeps,
    fn: TaskFn
  ): AutoGraph<Tasks & Record<TaskName, Awaited<ReturnType<TaskFn>>>>;
  add<
    TaskName extends Exclude<string, keyof Tasks>,
    TaskDeps extends readonly (keyof Tasks)[],
    TaskFn extends (args: { [Key in TaskDeps[number]]: Tasks[Key] }) => any,
  >(
    name: TaskName,
    depsOrFn: TaskDeps | TaskFn,
    fn?: TaskFn
  ): AutoGraph<Tasks & Record<TaskName, Awaited<ReturnType<TaskFn>>>> {
    const deps: TaskDeps = (fn === undefined ? [] : depsOrFn) as TaskDeps;
    const actualFn = (fn === undefined ? depsOrFn : fn) as TaskFn;

    if (this.has(name)) {
      throw new AutoGraphError(`Task '${name}' already exists`);
    }
    for (const dep of deps as AutoGraphDeps) {
      if (!this.has(dep)) {
        throw new AutoGraphError(`Task '${name}' depends on missing task '${dep}'`);
      }
    }
    return new AutoGraph<Tasks & Record<string, Awaited<ReturnType<TaskFn>>>>({
      ...this.tasks,
      [name]: {
        deps: deps as AutoGraphDeps,
        fn: actualFn as AutoGraphFn,
      },
    });
  }

  /**
   * Creates a runner instance for executing the graph.
   *
   * @param cache - Optional pre-computed task results to skip execution
   * @returns A new AutoGraphRunner instance
   *
   * @example
   * ```typescript
   * const runner = graph.runner({ expensiveTask: cachedValue });
   * const results = await runner.run();
   * ```
   */
  runner(cache: RecordLike = {}) {
    return new (this.constructor as typeof AutoGraph).runner(this.tasks as Tasks, cache);
  }

  /**
   * Executes all tasks in the graph with automatic parallelization.
   *
   * Tasks run as soon as their dependencies are fulfilled. Independent tasks run in parallel.
   *
   * @param cache - Optional pre-computed task results to skip execution
   * @returns Promise resolving to an object with all task results
   * @throws {AutoGraphError} If a circular dependency is detected
   *
   * @example
   * ```typescript
   * const results = await graph.run();
   * console.log(results.taskName);
   * ```
   *
   * @example With cache
   * ```typescript
   * const results = await graph.run({
   *   expensiveTask: previousResults.expensiveTask
   * });
   * ```
   */
  async run(cache: RecordLike = {}) {
    return this.runner(cache).run();
  }
}
