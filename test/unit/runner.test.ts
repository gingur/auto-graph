import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AutoGraphRunner } from '../../src';

import type { AutoGraphTask } from '../../src';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('AutoGraphRunner', () => {
  describe('constructor', () => {
    it('should initialize with tasks', () => {
      const tasks: Record<string, AutoGraphTask> = {
        a: { deps: [], fn: () => 1 },
      };
      const runner = new AutoGraphRunner(tasks);
      assert.ok(runner);
    });

    it('should initialize with cache', () => {
      const tasks: Record<string, AutoGraphTask> = {
        a: { deps: [], fn: () => 1 },
        b: { deps: ['a'], fn: ({ a }) => a + 1 },
      };
      const runner = new AutoGraphRunner(tasks, { a: 10 });
      assert.ok(runner);
    });

    it('should handle empty tasks', () => {
      const runner = new AutoGraphRunner({});
      assert.ok(runner);
    });
  });

  describe('run()', () => {
    it('should run a single task', async () => {
      const tasks: Record<string, AutoGraphTask> = {
        a: { deps: [], fn: () => 42 },
      };
      const runner = new AutoGraphRunner(tasks);
      const result = await runner.run();
      assert.strictEqual(result.a, 42);
    });

    it('should run multiple independent tasks in parallel', async () => {
      const order: string[] = [];
      const tasks: Record<string, AutoGraphTask> = {
        a: {
          deps: [],
          fn: async () => {
            order.push('a-start');
            await wait(50);
            order.push('a-end');
            return 1;
          },
        },
        b: {
          deps: [],
          fn: async () => {
            order.push('b-start');
            await wait(50);
            order.push('b-end');
            return 2;
          },
        },
        c: {
          deps: [],
          fn: async () => {
            order.push('c-start');
            await wait(50);
            order.push('c-end');
            return 3;
          },
        },
      };

      const runner = new AutoGraphRunner(tasks);
      const result = await runner.run();

      // Verify parallel execution
      const firstEnd = Math.min(
        order.indexOf('a-end'),
        order.indexOf('b-end'),
        order.indexOf('c-end')
      );
      assert.ok(order.indexOf('a-start') < firstEnd);
      assert.ok(order.indexOf('b-start') < firstEnd);
      assert.ok(order.indexOf('c-start') < firstEnd);

      assert.deepStrictEqual(result, { a: 1, b: 2, c: 3 });
    });

    it('should respect task dependencies', async () => {
      const order: string[] = [];
      const tasks: Record<string, AutoGraphTask> = {
        a: {
          deps: [],
          fn: () => {
            order.push('a');
            return 1;
          },
        },
        b: {
          deps: ['a'],
          fn: ({ a }) => {
            order.push('b');
            return a + 1;
          },
        },
        c: {
          deps: ['b'],
          fn: ({ b }) => {
            order.push('c');
            return b + 1;
          },
        },
      };

      const runner = new AutoGraphRunner(tasks);
      const result = await runner.run();

      assert.deepStrictEqual(order, ['a', 'b', 'c']);
      assert.deepStrictEqual(result, { a: 1, b: 2, c: 3 });
    });

    it('should handle async tasks', async () => {
      const tasks: Record<string, AutoGraphTask> = {
        a: {
          deps: [],
          fn: async () => {
            await wait(10);
            return 1;
          },
        },
        b: {
          deps: [],
          fn: async () => {
            await wait(20);
            return 2;
          },
        },
        c: {
          deps: ['a', 'b'],
          fn: async ({ a, b }) => {
            await wait(10);
            return a + b;
          },
        },
      };

      const runner = new AutoGraphRunner(tasks);
      const result = await runner.run();
      assert.deepStrictEqual(result, { a: 1, b: 2, c: 3 });
    });

    it('should start tasks as soon as dependencies are ready', async () => {
      const order: string[] = [];
      const tasks: Record<string, AutoGraphTask> = {
        a: {
          deps: [],
          fn: () => {
            order.push('a');
            return 1;
          },
        },
        b: {
          deps: [],
          fn: async () => {
            order.push('b-start');
            await wait(100);
            order.push('b-end');
            return 2;
          },
        },
        c: {
          deps: [],
          fn: async () => {
            order.push('c-start');
            await wait(200);
            order.push('c-end');
            return 3;
          },
        },
        first: {
          deps: ['a', 'b'],
          fn: ({ a, b }) => {
            order.push('first');
            return a + b;
          },
        },
        last: {
          deps: ['a', 'b', 'c'],
          fn: ({ a, b, c }) => {
            order.push('last');
            return (a + b) * c;
          },
        },
      };

      const runner = new AutoGraphRunner(tasks);
      const result = await runner.run();

      // 'first' should run after 'b' completes, not wait for 'c'
      const firstIndex = order.indexOf('first');
      const bEndIndex = order.indexOf('b-end');
      const cEndIndex = order.indexOf('c-end');

      assert.ok(firstIndex > bEndIndex, 'first should run after b completes');
      assert.ok(firstIndex < cEndIndex, 'first should run before c completes');

      // 'last' should only run after all dependencies complete
      const lastIndex = order.indexOf('last');
      assert.ok(lastIndex > cEndIndex, 'last should run after c completes');

      assert.strictEqual(result.first, 3);
      assert.strictEqual(result.last, 9);
    });

    it('should handle diamond dependency pattern', async () => {
      const order: string[] = [];
      const tasks: Record<string, AutoGraphTask> = {
        root: {
          deps: [],
          fn: () => {
            order.push('root');
            return 1;
          },
        },
        left: {
          deps: ['root'],
          fn: ({ root }) => {
            order.push('left');
            return root * 2;
          },
        },
        right: {
          deps: ['root'],
          fn: ({ root }) => {
            order.push('right');
            return root * 3;
          },
        },
        bottom: {
          deps: ['left', 'right'],
          fn: ({ left, right }) => {
            order.push('bottom');
            return left + right;
          },
        },
      };

      const runner = new AutoGraphRunner(tasks);
      const result = await runner.run();

      assert.strictEqual(order[0], 'root');
      assert.ok(order.indexOf('left') < order.indexOf('bottom'));
      assert.ok(order.indexOf('right') < order.indexOf('bottom'));

      assert.deepStrictEqual(result, { root: 1, left: 2, right: 3, bottom: 5 });
    });

    it('should detect circular dependencies', async () => {
      const tasks: Record<string, AutoGraphTask> = {
        a: { deps: ['b'], fn: () => 1 },
        b: { deps: ['a'], fn: () => 2 },
      };

      const runner = new AutoGraphRunner(tasks);

      await assert.rejects(async () => await runner.run(), {
        message: /Cycle or missing dependency detected/,
      });
    });

    it('should detect missing dependencies', async () => {
      const tasks: Record<string, AutoGraphTask> = {
        a: { deps: ['nonexistent'], fn: () => 1 },
      };

      const runner = new AutoGraphRunner(tasks);

      await assert.rejects(async () => await runner.run(), {
        message: /Cycle or missing dependency detected/,
      });
    });

    it('should handle tasks that return undefined', async () => {
      const tasks: Record<string, AutoGraphTask> = {
        a: { deps: [], fn: () => undefined },
        b: { deps: ['a'], fn: ({ a }) => (a === undefined ? 'ok' : 'not ok') },
      };

      const runner = new AutoGraphRunner(tasks);
      const result = await runner.run();
      assert.strictEqual(result.b, 'ok');
    });

    it('should handle tasks that return promises', async () => {
      const tasks: Record<string, AutoGraphTask> = {
        a: { deps: [], fn: () => Promise.resolve(42) },
        b: { deps: ['a'], fn: ({ a }) => a * 2 },
      };

      const runner = new AutoGraphRunner(tasks);
      const result = await runner.run();
      assert.strictEqual(result.a, 42);
      assert.strictEqual(result.b, 84);
    });

    it('should handle tasks that throw errors', async () => {
      const tasks: Record<string, AutoGraphTask> = {
        a: { deps: [], fn: () => 1 },
        b: {
          deps: [],
          fn: () => {
            throw new Error('Task failed');
          },
        },
        c: { deps: ['a'], fn: ({ a }) => a + 1 },
      };

      const runner = new AutoGraphRunner(tasks);

      await assert.rejects(async () => await runner.run(), { message: 'Task failed' });
    });

    it('should handle async tasks that throw errors', async () => {
      const tasks: Record<string, AutoGraphTask> = {
        a: {
          deps: [],
          fn: async () => {
            await wait(10);
            throw new Error('Async task failed');
          },
        },
        b: { deps: [], fn: () => 1 },
      };

      const runner = new AutoGraphRunner(tasks);

      await assert.rejects(async () => await runner.run(), { message: 'Async task failed' });
    });

    it('should handle empty tasks', async () => {
      const runner = new AutoGraphRunner({});
      const result = await runner.run();
      assert.deepStrictEqual(result, {});
    });

    it('should use cache to skip tasks', async () => {
      const callCount: Record<string, number> = { a: 0, b: 0, c: 0 };
      const tasks: Record<string, AutoGraphTask> = {
        a: {
          deps: [],
          fn: () => {
            callCount.a++;
            return 1;
          },
        },
        b: {
          deps: ['a'],
          fn: ({ a }) => {
            callCount.b++;
            return a + 1;
          },
        },
        c: {
          deps: ['b'],
          fn: ({ b }) => {
            callCount.c++;
            return b + 1;
          },
        },
      };

      const cache = { a: 10, b: 20 };
      const runner = new AutoGraphRunner(tasks, cache);
      const result = await runner.run();

      // a and b should not be called (cached)
      assert.strictEqual(callCount.a, 0);
      assert.strictEqual(callCount.b, 0);
      // c should be called
      assert.strictEqual(callCount.c, 1);

      // Results should use cached values
      assert.strictEqual(result.a, 10);
      assert.strictEqual(result.b, 20);
      assert.strictEqual(result.c, 21);
    });

    it('should handle partial cache', async () => {
      const tasks: Record<string, AutoGraphTask> = {
        a: { deps: [], fn: () => 1 },
        b: { deps: [], fn: () => 2 },
        c: { deps: ['a', 'b'], fn: ({ a, b }) => a + b },
      };

      const cache = { a: 10 };
      const runner = new AutoGraphRunner(tasks, cache);
      const result = await runner.run();

      assert.strictEqual(result.a, 10); // from cache
      assert.strictEqual(result.b, 2); // computed
      assert.strictEqual(result.c, 12); // 10 + 2
    });

    it('should maximize parallelism', async () => {
      const startTimes: Record<string, number> = {};
      const startTime = Date.now();

      const tasks: Record<string, AutoGraphTask> = {};
      for (let i = 0; i < 10; i++) {
        tasks[`task${i}`] = {
          deps: [],
          fn: async () => {
            startTimes[`task${i}`] = Date.now() - startTime;
            await wait(50);
            return i;
          },
        };
      }

      const runner = new AutoGraphRunner(tasks);
      await runner.run();

      // All tasks should start roughly at the same time
      const times = Object.values(startTimes);
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      assert.ok(
        maxTime - minTime < 20,
        `Tasks should start in parallel, but spread was ${maxTime - minTime}ms`
      );
    });
  });
});
