/**
 * 索引工作器模块
 * 
 * 该模块是队列处理系统的核心，提供以下功能：
 * - 请求令牌的调度和管理（速率限制）
 * - 队列处理器的启动和并发控制
 * - 任务创建、排队和队列恢复
 * - 系统重启时的任务状态恢复
 * 
 * @author Copilot
 */

import * as queue from "./queue.worker.js";
import { executeTask } from "./processor.worker.js";
import { createTask, getWaitingTasks, updateTask } from "../services/task.service.js";
import { defaultHeaders } from "../core/request.js";
import config from "../config.js";

// 并发限制配置
const CONCURRENCY_LIMIT = config.request.concurrency;
// 当前可用的请求令牌数量
let requestToken = config.request.maxRequestToken;

/**
 * 启动请求令牌补充调度器
 * 
 * 每秒补充一个请求令牌，直到达到最大值
 */
export function scheduleRequestTokens() {
	setInterval(() => {
		if (requestToken < config.request.maxRequestToken) {
			requestToken++;
			logger.debug(`Refilled 1 request point, now: ${requestToken}`);
		}
	}, 1000);
}

/**
 * 启动队列处理器
 * 
 * 定期检查队列并处理任务，遵循以下条件：
 * - 队列中有待处理任务
 * - 有可用的请求令牌
 * - 未超过并发限制
 */
export function startQueueProcessor() {
	setInterval(() => {
		if (queue.hasTask() && requestToken > 0 && queue.getRunning() < CONCURRENCY_LIMIT) {
			requestToken--;
			const task = queue.popTask();
			queue.incRunning();
			executeTask(task).finally(() => { queue.decRunning(); });
		}
	}, config.queue.processInterval);
}

/**
 * 将任务添加到处理队列
 * 
 * @param {Object} task - 任务配置对象
 * @returns {Promise<string>} 生成的任务ID
 * @throws {Error} 当队列已满时抛出错误
 */
export async function pushTaskToQueue(task) {
	if (queue.getQueueLength() >= config.queue.maxLength)
		throw new Error('队列已满，请稍后再试');
	task.id = await createTask(task);
	logger.debug(`Task #${task.id} queued.`);
	queue.pushTask(task);
	return task.id;
}

/**
 * 从数据库恢复队列状态
 * 
 * 系统启动时调用，恢复之前未完成的任务：
 * - 状态为待处理(0)的任务重新加入队列
 * - 状态为处理中(1)的任务标记为失败（因为服务器重启）
 */
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

/**
 * 获取指定任务在队列中的位置
 * 
 * @param {string} taskId - 任务ID
 * @returns {number} 任务位置（从1开始）
 */
export function getQueuePosition(taskId) {
	return queue.getQueuePosition(taskId);
}

/**
 * 启动工作器
 * 
 * 启动请求令牌调度器和队列处理器
 */
export function startWorker() {
	scheduleRequestTokens();
	startQueueProcessor();
}