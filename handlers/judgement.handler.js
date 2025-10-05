import { getResponseObject } from "../core/response.js";
import { upsertUser } from "../services/user.service.js";
import { logger } from '../core/logger.js';

export default async (resp, type) => {
	try {
		const obj = getResponseObject(resp, type);
		
		// 确保 obj 不为 null 或 undefined
		if (!obj || typeof obj !== 'object') {
			logger.error('陶片放逐数据解析失败：返回的对象为空或无效');
			return { logs: [] };
		}
		
		// 确保 logs 属性存在且为数组
		if (!obj.logs) {
			logger.warn('陶片放逐数据中缺少 logs 属性，设置为空数组');
			obj.logs = [];
		} else if (!Array.isArray(obj.logs)) {
			logger.error(`陶片放逐数据中 logs 不是数组类型，而是: ${typeof obj.logs}`);
			obj.logs = [];
		}
		
		logger.debug(`处理陶片放逐数据，logs 数量: ${obj.logs.length}`);
		
		// Process all user data in the logs
		for (const log of obj.logs) {
			if (log && log.user && log.user.uid) {
				try {
					const userData = {
						uid: parseInt(log.user.uid),
						name: log.user.name || '',
						color: log.user.color || ''
					};
					await upsertUser(userData);
				} catch (userError) {
					logger.error(`处理用户数据失败 (uid: ${log.user.uid}): ${userError.message}`);
				}
			} else {
				logger.warn('跳过无效的陶片放逐记录：缺少用户信息');
			}
		}
		
		return obj;
	} catch (error) {
		logger.error(`陶片放逐处理器执行失败: ${error.message}`);
		logger.error(error.stack);
		// 返回一个安全的默认对象
		return { logs: [] };
	}
};
