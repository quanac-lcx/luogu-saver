/**
 * 任务服务模块
 * 
 * 该模块提供后台任务管理服务，包括：
 * - 任务创建和排队
 * - 任务状态更新和跟踪
 * - 任务检索和状态映射
 * - 待处理和处理中任务的队列管理
 * 
 * 注意：由于任务具有高度动态的性质，任务不会被缓存。
 * 任务状态变化非常频繁，缓存会提供过期数据。
 * 
 * 任务类型说明：
 * 0 = articles (专栏文章)
 * 1 = paste (剪贴板)
 * 2 = (Benben)
 * 3 = judgement (陶片放逐)
 * 
 * @author Copilot
 */

import Task from "../models/task.js";

/**
 * 在队列中创建新任务
 * 
 * 生成具有唯一 ID 的新任务并设置为待处理状态。
 * 任务创建时设置 7 天过期时间。
 * 
 * @param {Object} task - 任务配置对象
 * @param {string} task.aid - 关联的文章/粘贴板/陶片放逐 ID
 * @param {number} task.type - 任务类型（0=文章, 1=粘贴板, 3=陶片放逐）
 * @returns {Promise<string>} 生成的任务 ID
 */
export async function createTask(task) {
	const id = utils.generateRandomString();
	const newTask = Task.create({
		id,
		status: 0,
		info: '你的任务在队列中，等待处理',
		expire_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
		oid: task.aid,
		type: task.type
	});
	await newTask.save();
	return id;
}

/**
 * 更新任务状态和信息
 * 
 * 更新任务的状态和可选信息消息。
 * 由于任务状态变化频繁，此方法不使用缓存。
 * 
 * @param {string} id - 要更新的任务 ID
 * @param {number} status - 新的状态码（0=待处理, 1=处理中, 2=已完成, 3=失败）
 * @param {string} [info=""] - 可选的状态信息消息
 */
export async function updateTask(id, status, info = "") {
	const task = await Task.findById(id);
	task.status = status;
	task.info = info;
	await task.save();
}

/**
 * 获取所有等待中的任务（待处理或处理中）
 * 
 * 检索状态为待处理（status 0）或处理中（status 1）的任务。
 * 结果按 ID 排序以保持一致的处理顺序。
 * 由于任务队列变化频繁，此方法不使用缓存。
 * 
 * @returns {Promise<Array>} 等待中任务对象数组
 */
export async function getWaitingTasks() {
	return await Task.createQueryBuilder("t")
		.where("t.status = 0 OR t.status = 1")
		.orderBy("t.id", "ASC")
		.getMany();
}

// 状态码映射，用于人类可读的状态名称
const statusMap = {
	0: 'Pending',
	1: 'Processing', 
	2: 'Completed',
	3: 'Failed',
};

/**
 * 通过 ID 获取任务并进行状态映射
 * 
 * 通过 ID 检索任务并格式化状态以供显示。
 * 由于任务状态变化非常频繁，此方法不使用缓存，
 * 用户需要看到实时状态更新。
 * 
 * @param {string} id - 要检索的任务 ID
 * @returns {Promise<Object|null>} 包含格式化状态的任务对象，如果未找到则返回 null
 */
export async function getTaskById(id) {
	const task = await Task.findById(id);
	if (!task) return null;
	
	// Format date and status for display
	task.formatDate();
	task.status = statusMap[task.status] || 'Unknown';
	
	return task;
}