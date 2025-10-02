/**
 * 队列管理模块
 * 
 * 该模块提供内存中的任务队列管理功能，包括：
 * - 任务队列的添加和移除操作
 * - 运行中任务数量的跟踪和管理
 * - 队列状态查询和位置定位
 * - 管理员监控所需的队列信息获取
 * 
 * @author Copilot
 */

// 内存中的任务队列
let queue = [];
// 当前运行中的任务数量
let running = 0;

/**
 * 向队列中添加任务
 * 
 * @param {Object} task - 要添加的任务对象
 */
export function pushTask(task) { queue.push(task); }

/**
 * 从队列中取出第一个任务
 * 
 * @returns {Object|undefined} 队列中的第一个任务，如果队列为空则返回 undefined
 */
export function popTask() { return queue.shift(); }

/**
 * 检查队列中是否有待处理任务
 * 
 * @returns {boolean} 队列是否非空
 */
export function hasTask() { return queue.length > 0; }

/**
 * 增加运行中任务计数
 */
export function incRunning() { running++; }

/**
 * 减少运行中任务计数
 */
export function decRunning() { running--; }

/**
 * 获取当前运行中的任务数量
 * 
 * @returns {number} 运行中的任务数量
 */
export function getRunning() { return running; }

/**
 * 获取队列中等待处理的任务数量
 * 
 * @returns {number} 队列长度
 */
export function getQueueLength() { return queue.length; }

/**
 * 获取指定任务在队列中的位置
 * 
 * @param {string} taskId - 任务 ID
 * @returns {number} 任务在队列中的位置（从 1 开始），如果未找到则返回 0
 */
export function getQueuePosition(taskId) {
	for (let i = 0; i < queue.length; i++) {
		if (queue[i].id === taskId) {
			return i + 1;
		}
	}
	return 0;
}

/**
 * 获取队列中的所有任务（供管理员监控使用）
 * 
 * @returns {Array} 包含位置信息的任务数组
 */
export function getAllTasks() {
	return queue.map((task, index) => ({
		...task,
		position: index + 1
	}));
}