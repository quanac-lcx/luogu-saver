import { benbenCallbacks } from "../core/storage.js";

export default async (data) => {
	const uid = data.id, message = data.message;
	logger.debug(`犇站任务成功: UID: ${uid} 消息: ${message}`);
	const callback = benbenCallbacks.get(uid);
	if (callback) {
		callback('success', message);
		benbenCallbacks.delete(uid);
	}
	else logger.warn('回调函数不存在，请检查订阅状态');
}