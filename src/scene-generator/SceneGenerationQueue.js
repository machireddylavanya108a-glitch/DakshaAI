import { TaskQueue } from '../utils/productionOptimizations.js';

const sharedQueue = new TaskQueue({ concurrency: 2, retries: 0, retryDelay: 80 });

export function enqueueSceneGenerationTask(task) {
  return sharedQueue.enqueue(task);
}

export function getSceneGenerationQueue() {
  return sharedQueue;
}
