import { upsertUser } from "../services/user.service.js";

export default async (resp, type) => {
	const obj = resp;
	
	logger.debug(`处理陶片放逐数据，logs 数量: ${obj.logs?.length || 0}`);
	
	// Process all user data in the logs
	if (obj.logs && Array.isArray(obj.logs)) {
		for (const log of obj.logs) {
			if (log.user) {
				const userData = {
					uid: parseInt(log.user.uid),
					name: log.user.name,
					color: log.user.color
				};
				await upsertUser(userData);
			}
		}
	}
	
	return obj;
};
