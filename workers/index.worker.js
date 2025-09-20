import * as queue from "./queue.worker.js";
import { executeTask } from "./processor.worker.js";
import { createTask, getWaitingTasks, updateTask } from "../services/task.service.js";
import { defaultHeaders } from "../core/request.js";
import config from "../config.js";

const CONCURRENCY_LIMIT = config.request.concurrency;
let requestToken = config.request.maxRequestToken;

export function scheduleRequestTokens() {
	setInterval(() => {
		if (requestToken < config.request.maxRequestToken) {
			requestToken++;
			logger.debug(`Refilled 1 request point, now: ${requestToken}`);
		}
	}, 1000);
}

export function startQueueProcessor() {
	setInterval(async () => {
		if (queue.hasTask() && requestToken > 0 && queue.getRunning() < CONCURRENCY_LIMIT) {
			requestToken--;
			const task = queue.nextTask();
			queue.incRunning();
			executeTask(task).finally(() => { queue.decRunning(); queue.popTask(); });
		}
	}, config.queue.processInterval);
}

export async function pushTaskToQueue(task) {
	if (queue.getQueueLength() >= config.queue.maxLength)
		throw new Error('The queue is full. Please try again later.');
	task.id = await createTask(task);
	logger.debug(`Task #${task.id} queued.`);
	queue.pushTask(task);
	return task.id;
}

export async function restoreQueue() {
	const tasks = await getWaitingTasks();
	for (const task of tasks) {
		if (task.status === 0) {
			queue.pushTask({
				id: task.id,
				url: `https://www.luogu.com/${task.type === 0 ? 'article' : 'paste'}/${task.oid}`,
				headers: defaultHeaders,
				aid: task.oid,
				type: task.type
			});
			logger.debug(`Task #${task.id} restored to queue.`);
		} else if (task.status === 1) {
			await updateTask(task.id, 3, "The server was restarted while processing this task. Please try again.");
			logger.debug(`Task #${task.id} was being processed during shutdown. Marked as failed.`);
		}
	}
}

export function getQueuePosition(taskId) {
	return queue.getQueuePosition(taskId);
}

export function startWorker() {
	scheduleRequestTokens();
	startQueueProcessor();
}