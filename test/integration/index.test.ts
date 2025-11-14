import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AutoGraph, AutoGraphError, AutoGraphRunner } from '../../dist/index.mjs';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Integration Tests', () => {
  describe('Full API Integration', () => {
    it('should export all public APIs', () => {
      assert.ok(AutoGraph);
      assert.ok(AutoGraphError);
      assert.ok(AutoGraphRunner);
    });

    it('should handle complete workflow', async () => {
      const graph = new AutoGraph()
        .add('a', () => 1)
        .add('b', async () => {
          await wait(10);
          return 2;
        })
        .add('c', ['a', 'b'], ({ a, b }) => a + b)
        .add('d', ['c'], ({ c }) => c * 2);

      const result = await graph.run();

      assert.strictEqual(result.a, 1);
      assert.strictEqual(result.b, 2);
      assert.strictEqual(result.c, 3);
      assert.strictEqual(result.d, 6);
    });

    it('should handle real-world scenario: build pipeline', async () => {
      const buildLog: string[] = [];

      const pipeline = new AutoGraph()
        .add('fetchDeps', async () => {
          buildLog.push('Fetching dependencies...');
          await wait(20);
          buildLog.push('Dependencies fetched');
          return { deps: ['react', 'typescript'] };
        })
        .add('lint', async () => {
          buildLog.push('Linting code...');
          await wait(15);
          buildLog.push('Lint complete');
          return { errors: 0 };
        })
        .add('typeCheck', ['fetchDeps'], async ({ fetchDeps }) => {
          buildLog.push('Type checking...');
          await wait(25);
          buildLog.push('Type check complete');
          return { errors: 0, deps: fetchDeps.deps };
        })
        .add('compile', ['fetchDeps', 'lint', 'typeCheck'], async () => {
          buildLog.push('Compiling...');
          await wait(30);
          buildLog.push('Compilation complete');
          return { output: 'dist/' };
        })
        .add('test', ['compile'], async ({ compile }) => {
          buildLog.push('Running tests...');
          await wait(20);
          buildLog.push('Tests passed');
          return { passed: true, output: compile.output };
        })
        .add('bundle', ['compile'], async ({ compile }) => {
          buildLog.push('Bundling...');
          await wait(15);
          buildLog.push('Bundle complete');
          return { file: `${compile.output}bundle.js` };
        });

      const result = await pipeline.run();

      // Verify all steps completed
      assert.ok(result.fetchDeps);
      assert.ok(result.lint);
      assert.ok(result.typeCheck);
      assert.ok(result.compile);
      assert.ok(result.test);
      assert.ok(result.bundle);

      // Verify order: fetchDeps must be first
      assert.strictEqual(buildLog[0], 'Fetching dependencies...');

      // Verify parallel execution: lint should start before fetchDeps completes
      const lintStartIndex = buildLog.indexOf('Linting code...');
      const fetchDepsEndIndex = buildLog.indexOf('Dependencies fetched');
      assert.ok(lintStartIndex < fetchDepsEndIndex, 'lint should run in parallel with fetchDeps');

      // Verify test and bundle can run in parallel after compile
      const testStartIndex = buildLog.indexOf('Running tests...');
      const bundleStartIndex = buildLog.indexOf('Bundling...');
      const compileEndIndex = buildLog.indexOf('Compilation complete');
      assert.ok(testStartIndex > compileEndIndex, 'test should wait for compile');
      assert.ok(bundleStartIndex > compileEndIndex, 'bundle should wait for compile');
    });

    it('should handle real-world scenario: data processing pipeline', async () => {
      const graph = new AutoGraph()
        .add('fetchUserData', async () => {
          await wait(20);
          return {
            users: [
              { id: 1, name: 'Alice' },
              { id: 2, name: 'Bob' },
            ],
          };
        })
        .add('fetchProductData', async () => {
          await wait(15);
          return { products: [{ id: 1, name: 'Widget' }] };
        })
        .add('fetchOrderData', async () => {
          await wait(25);
          return { orders: [{ userId: 1, productId: 1, qty: 2 }] };
        })
        .add('processUsers', ['fetchUserData'], ({ fetchUserData }) => {
          return fetchUserData.users.map((u) => ({ ...u, processed: true }));
        })
        .add('processProducts', ['fetchProductData'], ({ fetchProductData }) => {
          return fetchProductData.products.map((p) => ({ ...p, processed: true }));
        })
        .add(
          'joinData',
          ['processUsers', 'processProducts', 'fetchOrderData'],
          ({ processUsers, processProducts, fetchOrderData }) => {
            return {
              users: processUsers,
              products: processProducts,
              orders: fetchOrderData.orders,
            };
          }
        )
        .add('generateReport', ['joinData'], ({ joinData }) => {
          return {
            totalUsers: joinData.users.length,
            totalProducts: joinData.products.length,
            totalOrders: joinData.orders.length,
            summary: 'Report generated',
          };
        });

      const result = await graph.run();

      assert.strictEqual(result.generateReport.totalUsers, 2);
      assert.strictEqual(result.generateReport.totalProducts, 1);
      assert.strictEqual(result.generateReport.totalOrders, 1);
      assert.strictEqual(result.generateReport.summary, 'Report generated');
    });

    it('should handle errors gracefully in pipelines', async () => {
      const graph = new AutoGraph()
        .add('step1', () => 1)
        .add('step2', () => {
          throw new AutoGraphError('Step 2 failed');
        })
        .add('step3', ['step1'], ({ step1 }) => step1 + 1);

      await assert.rejects(
        async () => await graph.run(),
        (err: Error) => {
          assert.ok(err instanceof AutoGraphError);
          assert.match(err.message, /Step 2 failed/);
          return true;
        }
      );
    });

    it('should support incremental computation with cache', async () => {
      const expensiveComputation = { callCount: 0 };

      const graph = new AutoGraph()
        .add('expensive', async () => {
          expensiveComputation.callCount++;
          await wait(50);
          return { result: 'expensive-result' };
        })
        .add('dependent1', ['expensive'], ({ expensive }) => ({
          data: expensive.result + '-processed',
        }))
        .add('dependent2', ['expensive'], ({ expensive }) => ({
          data: expensive.result + '-transformed',
        }));

      // First run - no cache
      const result1 = await graph.run();
      assert.strictEqual(expensiveComputation.callCount, 1);
      assert.strictEqual(result1.dependent1.data, 'expensive-result-processed');

      // Second run - with cache
      const cache = { expensive: result1.expensive };
      const result2 = await graph.run(cache);

      // Expensive should not be called again
      assert.strictEqual(expensiveComputation.callCount, 1);
      assert.strictEqual(result2.dependent1.data, 'expensive-result-processed');
      assert.strictEqual(result2.dependent2.data, 'expensive-result-transformed');
    });

    it('should handle complex dependency graph with multiple levels', async () => {
      const graph = new AutoGraph()
        // Level 0 - no dependencies
        .add('a', () => 1)
        .add('b', () => 2)
        .add('c', () => 3)
        // Level 1 - depend on level 0
        .add('d', ['a'], ({ a }) => a * 2)
        .add('e', ['b'], ({ b }) => b * 2)
        .add('f', ['c'], ({ c }) => c * 2)
        // Level 2 - depend on level 1
        .add('g', ['d', 'e'], ({ d, e }) => d + e)
        .add('h', ['e', 'f'], ({ e, f }) => e + f)
        // Level 3 - depend on level 2
        .add('i', ['g', 'h'], ({ g, h }) => g * h);

      const result = await graph.run();

      assert.strictEqual(result.a, 1);
      assert.strictEqual(result.b, 2);
      assert.strictEqual(result.c, 3);
      assert.strictEqual(result.d, 2);
      assert.strictEqual(result.e, 4);
      assert.strictEqual(result.f, 6);
      assert.strictEqual(result.g, 6); // 2 + 4
      assert.strictEqual(result.h, 10); // 4 + 6
      assert.strictEqual(result.i, 60); // 6 * 10
    });

    it('should handle runner reuse correctly', async () => {
      const graph = new AutoGraph()
        .add('base', () => 10)
        .add('double', ['base'], ({ base }) => base * 2);

      // Create runner once, use multiple times
      const runner1 = graph.runner();
      const result1 = await runner1.run();

      // Each runner instance should be independent
      const runner2 = graph.runner({ base: 20 });
      const result2 = await runner2.run();

      assert.strictEqual(result1.base, 10);
      assert.strictEqual(result1.double, 20);

      assert.strictEqual(result2.base, 20);
      assert.strictEqual(result2.double, 40);
    });

    it('should demonstrate immutability of graph building', () => {
      const graph1 = new AutoGraph().add('a', () => 1);

      const graph2 = graph1.add('b', () => 2);
      const graph3 = graph1.add('c', () => 3);

      // Original graph should not be modified
      assert.ok(graph1['has']('a'));
      assert.ok(!graph1['has']('b'));
      assert.ok(!graph1['has']('c'));

      // New graphs should have their additions
      assert.ok(graph2['has']('a'));
      assert.ok(graph2['has']('b'));
      assert.ok(!graph2['has']('c'));

      assert.ok(graph3['has']('a'));
      assert.ok(!graph3['has']('b'));
      assert.ok(graph3['has']('c'));
    });
  });

  describe('Error Handling Integration', () => {
    it('should propagate AutoGraphError through the system', async () => {
      const graph = new AutoGraph().add('task1', () => {
        throw new AutoGraphError('Task failed', { cause: new Error('Root cause') });
      });

      await assert.rejects(
        async () => await graph.run(),
        (err: Error) => {
          assert.ok(err instanceof AutoGraphError);
          assert.match(err.message, /Task failed/);
          assert.ok(err.cause instanceof Error);
          return true;
        }
      );
    });

    it('should handle validation errors at graph build time', () => {
      assert.throws(
        () => {
          new AutoGraph().add('task1', () => 1).add('task1', () => 2);
        },
        (err: Error) => {
          assert.ok(err instanceof AutoGraphError);
          assert.match(err.message, /already exists/);
          return true;
        }
      );
    });

    it('should handle validation errors for missing dependencies', () => {
      assert.throws(
        () => {
          new AutoGraph()
            .add('task1', () => 1)
            // @ts-expect-error - testing runtime validation
            .add('task2', ['missing'], () => 2);
        },
        (err: Error) => {
          assert.ok(err instanceof AutoGraphError);
          assert.match(err.message, /depends on missing task/);
          return true;
        }
      );
    });
  });

  describe('Example Scenarios', () => {
    it('should handle the original example scenario', async () => {
      // This was the original example.ts - demonstrates complex dependency graph
      // with tasks that complete at different times
      const executionLog: string[] = [];

      const graph = new AutoGraph()
        .add('a', () => {
          executionLog.push('in a');
          return 1;
        })
        .add('b', async () => {
          executionLog.push('in b');
          await wait(100); // Reduced from 1000ms for faster tests
          return 2;
        })
        .add('c', async () => {
          executionLog.push('in c');
          await wait(200); // Reduced from 2000ms for faster tests
          return 2;
        })
        .add('last', ['a', 'b', 'c'], ({ a, b, c }) => {
          executionLog.push('in last');
          return (a + b) * c;
        })
        .add('first', ['a', 'b'], ({ a, b }) => {
          executionLog.push('in first');
          return a + b;
        })
        .add('middle', ['first'], () => {
          executionLog.push('in middle');
          return 1; // Fixed value for deterministic testing
        });

      const results = await graph.run();

      // Verify results
      assert.strictEqual(results.a, 1);
      assert.strictEqual(results.b, 2);
      assert.strictEqual(results.c, 2);
      assert.strictEqual(results.first, 3); // a + b = 1 + 2
      assert.strictEqual(results.middle, 1);
      assert.strictEqual(results.last, 6); // (a + b) * c = (1 + 2) * 2

      // Verify execution order
      assert.strictEqual(executionLog[0], 'in a');
      assert.ok(executionLog.includes('in b'));
      assert.ok(executionLog.includes('in c'));

      // 'first' should run after 'b' completes, not wait for 'c'
      const firstIndex = executionLog.indexOf('in first');
      const lastIndex = executionLog.indexOf('in last');
      assert.ok(firstIndex < lastIndex, 'first should complete before last');

      // 'middle' should run after 'first'
      const middleIndex = executionLog.indexOf('in middle');
      assert.ok(middleIndex > firstIndex, 'middle should run after first');

      // 'last' should be the last to execute (needs all: a, b, c)
      assert.strictEqual(executionLog[executionLog.length - 1], 'in last');
    });
  });

  describe('Performance Characteristics', () => {
    it('should execute independent tasks in parallel', async () => {
      const startTime = Date.now();
      const taskDuration = 100;

      const graph = new AutoGraph()
        .add('task1', async () => {
          await wait(taskDuration);
          return 1;
        })
        .add('task2', async () => {
          await wait(taskDuration);
          return 2;
        })
        .add('task3', async () => {
          await wait(taskDuration);
          return 3;
        });

      await graph.run();
      const totalTime = Date.now() - startTime;

      // If truly parallel, should take ~100ms, not 300ms
      // Allow some margin for execution overhead
      assert.ok(
        totalTime < taskDuration * 2,
        `Expected parallel execution (~${taskDuration}ms), but took ${totalTime}ms`
      );
    });

    it('should start dependent tasks immediately when ready', async () => {
      const executionOrder: Array<{ task: string; time: number }> = [];
      const startTime = Date.now();

      const graph = new AutoGraph()
        .add('fast', async () => {
          executionOrder.push({ task: 'fast-start', time: Date.now() - startTime });
          await wait(10);
          executionOrder.push({ task: 'fast-end', time: Date.now() - startTime });
          return 1;
        })
        .add('slow', async () => {
          executionOrder.push({ task: 'slow-start', time: Date.now() - startTime });
          await wait(100);
          executionOrder.push({ task: 'slow-end', time: Date.now() - startTime });
          return 2;
        })
        .add('afterFast', ['fast'], async ({ fast }) => {
          executionOrder.push({ task: 'afterFast', time: Date.now() - startTime });
          await wait(1); // Small delay to ensure timing is captured
          return fast + 1;
        })
        .add('afterBoth', ['fast', 'slow'], async ({ fast, slow }) => {
          executionOrder.push({ task: 'afterBoth', time: Date.now() - startTime });
          await wait(1); // Small delay to ensure timing is captured
          return fast + slow;
        });

      await graph.run();

      // afterFast should execute soon after fast completes (~10ms)
      // not wait for slow to complete (~100ms)
      const fastEnd = executionOrder.find((e) => e.task === 'fast-end')!;
      const afterFast = executionOrder.find((e) => e.task === 'afterFast')!;
      const slowEnd = executionOrder.find((e) => e.task === 'slow-end')!;
      const afterBoth = executionOrder.find((e) => e.task === 'afterBoth')!;

      assert.ok(afterFast.time < slowEnd.time, 'afterFast should complete before slow finishes');
      assert.ok(
        afterFast.time >= fastEnd.time,
        'afterFast should complete at or after fast finishes'
      );
      assert.ok(afterBoth.time >= slowEnd.time, 'afterBoth should wait for slow to finish');
    });
  });
});
