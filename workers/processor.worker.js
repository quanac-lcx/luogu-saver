import { updateTask } from "../services/task.service.js";
import { saveArticle } from "../services/article.service.js";
import { savePaste } from "../services/paste.service.js";
import { saveJudgements } from "../services/judgement.service.js";
import { fetchContent } from "../core/request.js";
import { handleFetch } from "../handlers/index.handler.js";
import { logError, getError, SystemError, ValidationError, NetworkError, DatabaseError } from "../core/errors.js";
import { subscribeTask } from "../services/benben.service.js";
import config from "../config.js";
import { benbenCallbacks } from "../core/storage.js";

const c3vkMode = {
	0: 'new',
	1: 'legacy',
	2: 'none'
}

export async function executeTask(task) {
	try {
		logger.debug(`开始处理任务 #${task.id}, 类型: ${task.type}`);
		await updateTask(task.id, 1, "处理中...");
		
		if (task.type === 2) {
			const callbackPromise = new Promise((resolve, reject) => {
				subscribeTask(parseInt(task.aid), async (type, message) => {
					if (type === 'progress') {
						await updateTask(task.id, 1, message);
					}
					else if (type === 'success') {
						resolve(message);
					}
					else if (type === 'error') {
						reject(new SystemError(message));
					}
				});
			});
			
			const timeoutPromise = new Promise((resolve) => {
				setTimeout(() => {
					resolve("任务已发送，但可能无法收到回调通知");
					benbenCallbacks.delete(parseInt(task.aid));
				}, config.service.callback_timeout);
			});
			
			Promise.race([callbackPromise, timeoutPromise]).then(async (result) => {
				await updateTask(task.id, 2, result);
			}).catch(async (err) => {
				err.message = `任务 #${task.id} 执行失败: ${err.message}`;
				await logError(err, null);
				await updateTask(task.id, 3, err.message);
			});
			
			// 对于 type 2 任务，已设置回调和超时机制处理异步结果，任务状态将根据回调或超时结果更新，故此处直接返回
			return;
		}
		
		const resp = await handleFetch(
			await fetchContent(
				task.url,
				task.headers,
				{ c3vk: c3vkMode[task.type] }
			),
			task.type
		);
		
		if (!resp.success) throw getError(resp);
		const obj = resp.data;
		
		if (!obj) throw new ValidationError(`任务 #${task.id} 请求返回数据为空`);
		
		if (task.type === 0) {
			await saveArticle(task, obj, async (progress, message) => {
				await updateTask(task.id, progress, message);
			});
		} else if (task.type === 1) {
			await savePaste(task, obj);
			await updateTask(task.id, 2, "任务完成");
		} else if (task.type === 3) {
			await saveJudgements(task, obj);
			await updateTask(task.id, 2, "任务完成");
		} else {
			throw new SystemError(`未知任务类型: ${task.type}`);
		}
	} catch (err) {
		// 处理网络错误
		if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' ||
			err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' ||
			err.message?.includes('timeout') || err.message?.includes('network')) {
			err = new NetworkError(`爬取内容失败: ${err.message}`);
		}
		
		// 处理数据库错误
		if (err.name === 'QueryFailedError' || err.code?.startsWith('ER_') ||
			err.message?.includes('database') || err.message?.includes('query')) {
			err = new DatabaseError(`保存数据失败: ${err.message}`);
		}
		
		const originalMessage = err.message;
		err.message = `任务 #${task.id} 执行失败: ${err.message}`;
		await logError(err, null);
		await updateTask(task.id, 3, originalMessage);
	}
}