import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AutoGraph } from '../../src';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('README Examples', () => {
  describe('Quick Start Example', () => {
    it('should work as documented', async () => {
      // Mock fetch for testing
      const mockFetch = async (url: string) => {
        if (url === '/api/user') {
          return { json: async () => ({ id: 1, name: 'Alice' }) };
        }
        if (url === '/api/posts') {
          const posts = [
            { id: 1, title: 'Post 1' },
            { id: 2, title: 'Post 2' },
          ];
          return { json: async () => posts };
        }
        throw new Error('Unknown URL');
      };

      const graph = new AutoGraph()
        .add('fetchUser', async () => {
          const response = await mockFetch('/api/user');
          return (await response.json()) as { id: number; name: string };
        })
        .add('fetchPosts', async () => {
          const response = await mockFetch('/api/posts');
          return (await response.json()) as { id: number; title: string }[];
        })
        .add('enrichPosts', ['fetchUser', 'fetchPosts'], ({ fetchUser, fetchPosts }) => {
          return fetchPosts.map((post: any) => ({
            ...post,
            author: fetchUser.name,
          }));
        });

      const results = await graph.run();

      assert.strictEqual(results.enrichPosts.length, 2);
      assert.strictEqual(results.enrichPosts[0].author, 'Alice');
      assert.strictEqual(results.enrichPosts[1].author, 'Alice');
    });
  });

  describe('Fluent Generics - Good Example', () => {
    it('should maintain type information through the chain', async () => {
      const graph = new AutoGraph()
        .add('num', () => 42)
        .add('str', () => 'hello')
        .add('combined', ['num', 'str'], ({ num, str }) => {
          return `${str}: ${num}`;
        });

      const results = await graph.run();

      assert.strictEqual(results.num, 42);
      assert.strictEqual(results.str, 'hello');
      assert.strictEqual(results.combined, 'hello: 42');
    });
  });

  describe('Fluent Generics - Gotcha: Breaking the Chain', () => {
    it('should demonstrate the bad pattern (still works at runtime)', async () => {
      // This pattern loses type safety but still works at runtime
      let graph = new AutoGraph();
      // @ts-expect-error - type information is lost when breaking the chain
      graph = graph.add('a', () => 1);
      // @ts-expect-error - type information is lost when breaking the chain
      graph = graph.add('b', ['a'], ({ a }) => a + 1);

      const results = await graph.run();

      // @ts-expect-error - type information is lost when breaking the chain
      assert.strictEqual(results.a, 1);
      // @ts-expect-error - type information is lost when breaking the chain
      assert.strictEqual(results.b, 2);
    });

    it('should demonstrate the good pattern', async () => {
      const graph = new AutoGraph().add('a', () => 1).add('b', ['a'], ({ a }) => a + 1);

      const results = await graph.run();

      assert.strictEqual(results.a, 1);
      assert.strictEqual(results.b, 2);
    });
  });

  describe('Fluent Generics - Gotcha: Storing Intermediate Graphs', () => {
    it('should demonstrate the bad pattern', () => {
      const baseGraph = new AutoGraph().add('a', () => 1);

      baseGraph.add('b', ['a'], ({ a }) => a + 1);

      // This will throw because baseGraph doesn't know about 'b'
      assert.throws(() => {
        // @ts-expect-error - testing runtime error
        baseGraph.add('c', ['b'], ({ b }) => b + 1);
      }, /depends on missing task/);
    });

    it('should demonstrate the good pattern', async () => {
      const baseGraph = new AutoGraph().add('a', () => 1);

      const extendedGraph = baseGraph.add('b', ['a'], ({ a }) => a + 1);

      const working = extendedGraph.add('c', ['b'], ({ b }) => b + 1);

      const results = await working.run();

      assert.strictEqual(results.a, 1);
      assert.strictEqual(results.b, 2);
      assert.strictEqual(results.c, 3);
    });
  });

  describe('Parallel Execution Example', () => {
    it('should run independent tasks in parallel', async () => {
      const executionLog: string[] = [];

      const graph = new AutoGraph()
        .add('fetchUsers', async () => {
          executionLog.push('fetchUsers-start');
          await wait(20);
          executionLog.push('fetchUsers-end');
          return [{ id: 1, name: 'Alice' }];
        })
        .add('fetchProducts', async () => {
          executionLog.push('fetchProducts-start');
          await wait(20);
          executionLog.push('fetchProducts-end');
          return [{ id: 1, name: 'Widget' }];
        })
        .add('combine', ['fetchUsers', 'fetchProducts'], ({ fetchUsers, fetchProducts }) => ({
          users: fetchUsers,
          products: fetchProducts,
        }));

      const results = await graph.run();

      // Verify results
      assert.strictEqual(results.fetchUsers.length, 1);
      assert.strictEqual(results.fetchProducts.length, 1);
      assert.strictEqual(results.combine.users.length, 1);
      assert.strictEqual(results.combine.products.length, 1);

      // Verify parallel execution - both should start before either ends
      const fetchUsersStartIdx = executionLog.indexOf('fetchUsers-start');
      const fetchProductsStartIdx = executionLog.indexOf('fetchProducts-start');
      const fetchUsersEndIdx = executionLog.indexOf('fetchUsers-end');
      const fetchProductsEndIdx = executionLog.indexOf('fetchProducts-end');

      assert.ok(fetchUsersStartIdx < fetchUsersEndIdx);
      assert.ok(fetchProductsStartIdx < fetchProductsEndIdx);
      assert.ok(
        fetchUsersStartIdx < fetchProductsEndIdx && fetchProductsStartIdx < fetchUsersEndIdx,
        'Tasks should overlap in execution'
      );
    });
  });

  describe('Build Pipeline Example', () => {
    it('should execute build pipeline with proper dependencies', async () => {
      const executionLog: string[] = [];

      const mockExec = async (cmd: string) => {
        executionLog.push(cmd);
        await wait(10);
      };

      const pipeline = new AutoGraph()
        .add('lint', async () => {
          await mockExec('eslint .');
          return { errors: 0 };
        })
        .add('typeCheck', async () => {
          await mockExec('tsc --noEmit');
          return { errors: 0 };
        })
        .add('compile', ['lint', 'typeCheck'], async () => {
          await mockExec('tsc');
          return { output: 'dist/' };
        })
        .add('test', ['compile'], async () => {
          await mockExec('npm test');
          return { passed: true };
        })
        .add('bundle', ['compile'], async () => {
          await mockExec('webpack');
          return { file: 'dist/bundle.js' };
        });

      const results = await pipeline.run();

      // Verify all tasks completed
      assert.strictEqual(results.lint.errors, 0);
      assert.strictEqual(results.typeCheck.errors, 0);
      assert.strictEqual(results.compile.output, 'dist/');
      assert.strictEqual(results.test.passed, true);
      assert.strictEqual(results.bundle.file, 'dist/bundle.js');

      // Verify execution order
      assert.ok(executionLog.includes('eslint .'));
      assert.ok(executionLog.includes('tsc --noEmit'));
      assert.ok(executionLog.includes('tsc'));
      assert.ok(executionLog.includes('npm test'));
      assert.ok(executionLog.includes('webpack'));

      // Verify compile happens after lint and typeCheck
      const compileIdx = executionLog.indexOf('tsc');
      const lintIdx = executionLog.indexOf('eslint .');
      const typeCheckIdx = executionLog.indexOf('tsc --noEmit');
      assert.ok(compileIdx > lintIdx);
      assert.ok(compileIdx > typeCheckIdx);

      // Verify test and bundle happen after compile
      const testIdx = executionLog.indexOf('npm test');
      const bundleIdx = executionLog.indexOf('webpack');
      assert.ok(testIdx > compileIdx);
      assert.ok(bundleIdx > compileIdx);
    });
  });

  describe('Incremental Computation Example', () => {
    it('should skip cached tasks', async () => {
      let executionCount = 0;

      const graph = new AutoGraph()
        .add('expensiveTask', async () => {
          executionCount++;
          await wait(10);
          return { result: 'data' };
        })
        .add('processResult', ['expensiveTask'], ({ expensiveTask }) => {
          return expensiveTask.result.toUpperCase();
        });

      // First run
      const firstRun = await graph.run();
      assert.strictEqual(executionCount, 1);
      assert.strictEqual(firstRun.expensiveTask.result, 'data');
      assert.strictEqual(firstRun.processResult, 'DATA');

      // Second run with cache
      const cache = { expensiveTask: firstRun.expensiveTask };
      const secondRun = await graph.run(cache);

      // expensiveTask should not be re-executed
      assert.strictEqual(executionCount, 1);
      assert.strictEqual(secondRun.expensiveTask.result, 'data');
      assert.strictEqual(secondRun.processResult, 'DATA');
    });
  });

  describe('Complex Dependencies Example', () => {
    it('should handle complex dependency graph', async () => {
      const graph = new AutoGraph()
        .add('a', () => 1)
        .add('b', () => 2)
        .add('c', () => 3)
        .add('d', ['a'], ({ a }) => a * 2)
        .add('e', ['b'], ({ b }) => b * 2)
        .add('f', ['c'], ({ c }) => c * 2)
        .add('g', ['d', 'e'], ({ d, e }) => d + e)
        .add('h', ['e', 'f'], ({ e, f }) => e + f)
        .add('result', ['g', 'h'], ({ g, h }) => g * h);

      const results = await graph.run();

      assert.strictEqual(results.a, 1);
      assert.strictEqual(results.b, 2);
      assert.strictEqual(results.c, 3);
      assert.strictEqual(results.d, 2); // a * 2 = 1 * 2
      assert.strictEqual(results.e, 4); // b * 2 = 2 * 2
      assert.strictEqual(results.f, 6); // c * 2 = 3 * 2
      assert.strictEqual(results.g, 6); // d + e = 2 + 4
      assert.strictEqual(results.h, 10); // e + f = 4 + 6
      assert.strictEqual(results.result, 60); // g * h = 6 * 10
    });
  });

  describe('Error Handling - Duplicate Task Names', () => {
    it('should throw on duplicate task names', () => {
      assert.throws(() => {
        new AutoGraph().add('task1', () => 1).add('task1', () => 2);
      }, /Task 'task1' already exists/);
    });
  });

  describe('Error Handling - Missing Dependencies', () => {
    it('should throw on missing dependencies', () => {
      assert.throws(() => {
        new AutoGraph()
          .add('task1', () => 1)
          // @ts-expect-error - testing runtime error
          .add('task2', ['missing'], () => 2);
      }, /depends on missing task 'missing'/);
    });
  });

  describe('Error Handling - Runtime Errors', () => {
    it('should propagate runtime errors', async () => {
      const graph = new AutoGraph().add('task1', () => {
        throw new Error('Failed');
      });

      await assert.rejects(
        async () => await graph.run(),
        (err: Error) => {
          assert.match(err.message, /Failed/);
          return true;
        }
      );
    });
  });

  describe('API - No Dependencies', () => {
    it('should add task without dependencies', async () => {
      const graph = new AutoGraph().add('task1', () => 42);

      const results = await graph.run();
      assert.strictEqual(results.task1, 42);
    });
  });

  describe('API - With Dependencies', () => {
    it('should add task with dependencies', async () => {
      const graph = new AutoGraph()
        .add('task1', () => 42)
        .add('task2', ['task1'], ({ task1 }) => task1 * 2);

      const results = await graph.run();
      assert.strictEqual(results.task1, 42);
      assert.strictEqual(results.task2, 84);
    });
  });

  describe('API - Run with Cache', () => {
    it('should run with cache', async () => {
      let callCount = 0;

      const graph = new AutoGraph()
        .add('expensiveTask', () => {
          callCount++;
          return 100;
        })
        .add('dependent', ['expensiveTask'], ({ expensiveTask }) => expensiveTask * 2);

      const results = await graph.run({ expensiveTask: 50 });

      assert.strictEqual(callCount, 0); // Should not be called
      assert.strictEqual(results.expensiveTask, 50);
      assert.strictEqual(results.dependent, 100);
    });
  });
});
