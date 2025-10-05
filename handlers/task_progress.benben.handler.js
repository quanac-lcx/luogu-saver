import { benbenCallbacks } from "../core/storage.js";

export default async (data) => {
	const uid = data.id, message = data.message;
	logger.debug(`犇站任务上报: UID: ${uid} 消息: ${message}`);
	const callback = benbenCallbacks.get(uid);
	if (callback) {
		callback('progress', message);
	}
	else logger.warn('回调函数不存在，请检查订阅状态');
}