import { invalidateCache } from "../core/cache.js";

export default async (data) => {
	logger.debug(`犇站广播: ${data.uid} 发布了 ${data.count} 条新犇犇`);
	await invalidateCache(`benben:${data.uid}`);
}