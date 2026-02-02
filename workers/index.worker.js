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
import { SystemError } from "../core/errors.js";
import config from "../config.js";

const CONCURRENCY_LIMIT = config.request.concurrency;
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
			logger.debug(`请求点恢复 1 点, 目前点数: ${requestToken}`);
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
 * @throws {SystemError} 当队列已满时抛出错误
 */
export async function pushTaskToQueue(task) {
	if (queue.getQueueLength() >= config.queue.maxLength)
		throw new SystemError('队列已满，请稍后再试');
	if (!task.aid && task.type !== 3) { // 类型3（陶片放逐）不需要aid
		throw new SystemError('任务缺少必要的aid参数');
	}
	task.id = await createTask(task);
	logger.debug(`任务 #${task.id} 入队`);
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
			let url;
			if (task.type === 0) {
				url = `https://www.luogu.com/article/${task.oid}`;
			} else if (task.type === 1) {
				url = `https://www.luogu.com/paste/${task.oid}`;
			} else if (task.type === 3) {
				url = `https://www.luogu.com.cn/judgement`;
			} else if (task.type === 4) {
				url = `https://www.luogu.com/user/${task.oid}`;
			}
			else {
				logger.error(`未知的任务类型: ${task.type}, 任务 #${task.id}`);
				continue;
			}
			
			queue.pushTask({
				id: task.id,
				url,
				headers: defaultHeaders,
				aid: task.oid,
				type: task.type
			});
			logger.debug(`任务 #${task.id} 已恢复`);
		} else if (task.status === 1) {
			await updateTask(task.id, 3, "服务器重启导致状态出错");
			logger.debug(`任务 #${task.id} 在服务器重启时正在执行, 标记为失败`);
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
