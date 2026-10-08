import { AsyncLocalStorage } from 'node:async_hooks';
import type { ChildProcess } from 'node:child_process';

export interface TaskContext {
  kind: 'localization' | 'generation' | 'deletion';
  id: string;
  projectId: string;
  leaseToken: string;
  assetIds?: string[];
  controller: AbortController;
}
const contexts = new AsyncLocalStorage<TaskContext>();
const active = new Set<AbortController>();
const shutdownController = new AbortController();
let closing = false;
export const currentTask = () => contexts.getStore();
export const isShuttingDown = () => closing;
export function beginShutdown() { closing = true; }
export function taskSignal(): AbortSignal {
  const task = currentTask();
  return task ? AbortSignal.any([task.controller.signal, shutdownController.signal]) : shutdownController.signal;
}
export function throwIfTaskCancelled() { taskSignal().throwIfAborted(); }
export async function withTask<T>(task: TaskContext, work: () => Promise<T>): Promise<T> {
  active.add(task.controller);
  try { return await contexts.run(task, work); }
  finally { active.delete(task.controller); }
}
export function abortAllTasks(reason = new Error('Server shutdown deadline exceeded')) {
  shutdownController.abort(reason);
  for (const controller of active) controller.abort(reason);
}
export function taskFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const signals = [taskSignal()];
  if (init?.signal) signals.push(init.signal);
  if (input instanceof Request) signals.push(input.signal);
  const signal = AbortSignal.any(signals);
  signal.throwIfAborted();
  return fetch(input, { ...init, signal });
}
export function cancelChildOnAbort(child: ChildProcess): () => void {
  const signal = taskSignal();
  const stop = () => { child.kill('SIGKILL'); };
  if (signal.aborted) stop();
  else signal.addEventListener('abort', stop, { once: true });
  const remove = () => signal.removeEventListener('abort', stop);
  child.once('exit', remove);
  return remove;
}

export function withoutTask<T>(work: () => Promise<T>): Promise<T> { return contexts.exit(work); }
