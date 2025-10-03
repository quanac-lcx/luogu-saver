import { upsertUser } from "../services/user.service.js";

export default async (resp, type) => {
	const obj = resp;
	
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
