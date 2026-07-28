import test from 'node:test';
import assert from 'node:assert/strict';
import { splitTextIntoChunks, TaskQueue } from '../utils/productionOptimizations.js';

test('splitTextIntoChunks creates chunked segments for large inputs', () => {
  const text = 'alpha '.repeat(3000);
  const chunks = splitTextIntoChunks(text, 200);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 200));
});

test('TaskQueue processes tasks in order with retries', async () => {
  const queue = new TaskQueue({ retries: 1, retryDelay: 0 });
  let count = 0;
  const task = async () => {
    count += 1;
    if (count < 2) {
      throw new Error('retry');
    }
    return 'ok';
  };

  const result = await queue.enqueue(task);
  assert.equal(result, 'ok');
  assert.equal(count, 2);
});
