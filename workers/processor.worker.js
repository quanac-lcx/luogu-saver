/**
 * 任务处理器模块
 * 
 * 该模块负责执行具体的任务处理逻辑，包括：
 * - 内容获取和解析处理
 * - 专栏文章和剪贴板内容的保存
 * - 任务状态更新和错误处理
 * - 进度回调和完成通知
 * 
 * @author Copilot
 */

import { updateTask } from "../services/task.service.js";
import { saveArticle } from "../services/article.service.js";
import { savePaste } from "../services/paste.service.js";
import { fetchContent } from "../core/request.js";
import { handleFetch } from "../handlers/index.handler.js";
import { SystemError } from "../core/errors.js";

/**
 * 执行单个任务的处理逻辑
 * 
 * @param {Object} task - 要处理的任务对象
 * @param {string} task.id - 任务ID
 * @param {number} task.type - 任务类型（0=专栏文章, 1=剪贴板）
 * @param {string} task.url - 要获取的URL
 * @param {Object} task.headers - HTTP请求头
 */
export async function executeTask(task) {
	try {
		logger.debug(`Start processing task #${task.id}, type=${task.type}`);
		await updateTask(task.id, 1, "Processing...");
		const resp = await handleFetch(
			await fetchContent(
				task.url,
				task.headers,
				{ c3vk: task.type === 1 ? "legacy": "new" }
			),
			task.type
		);
		if (!resp.success) {
			throw new SystemError(resp.message);
		}
		const obj = resp.data;
		if (task.type === 0) {
			await saveArticle(task, obj, async (progress, message) => { await updateTask(task.id, progress, message); });
		}
		else {
			await savePaste(task, obj);
			await updateTask(task.id, 2, "Task completed successfully.");
		}
	} catch (err) {
		logger.error(`Task #${task.id} failed: ${err.message}`);
		await updateTask(task.id, 3, err.message);
	}
}
