/**
 * 陶片放逐服务模块
 * 
 * 该模块提供陶片放逐管理服务，包括：
 * - 保存陶片放逐记录
 * - 获取最新陶片放逐列表（支持分页）
 * - 缓存支持以提升性能
 * 
 * @author Copilot
 */

import Judgement from "../models/judgement.js";
import { withCache, invalidateCache, invalidateCacheByPattern } from "../core/cache.js";

/**
 * 保存陶片放逐记录
 * 
 * 批量保存从洛谷获取的陶片放逐记录，跳过已存在的记录。
 * 保存完成后会自动使相关缓存失效。
 * 
 * @param {Object} task - 包含任务元数据的任务对象
 * @param {Object} obj - 陶片放逐数据对象
 * @param {Array} obj.logs - 陶片放逐记录数组
 */
export async function saveJudgements(task, obj) {
	const logs = obj.logs || [];
	
	logger.debug(`保存陶片放逐记录，获取到 ${logs.length} 条记录`);
	
	for (const log of logs) {
		// 检查是否已存在
		const existing = await Judgement.findOne({
			where: {
				user_uid: log.user.uid,
				time: new Date(log.time * 1000)
			}
		});
		
		if (existing) {
			logger.debug(`跳过已存在的记录: 用户 ${log.user.uid}, 时间 ${new Date(log.time * 1000)}`);
			continue;
		}
		
		const judgement = Judgement.create({
			user_uid: log.user.uid,
			reason: log.reason,
			permission_granted: log.addedPermission || 0,
			permission_revoked: log.revokedPermission || 0,
			time: new Date(log.time * 1000)
		});
		await judgement.save();
		logger.debug(`保存陶片放逐记录: 用户 ${log.user.uid}, 时间 ${new Date(log.time * 1000)}`);
	}
	
	logger.info(`成功保存 ${logs.length} 条陶片放逐记录`);
	
	await Promise.all([
		invalidateCacheByPattern('recent_judgements:*'),
		invalidateCache(['statistics:full', 'statistics:counts'])
	]);
}

/**
 * 获取最新的陶片放逐记录（支持分页和缓存）
 * 
 * 检索最近的陶片放逐记录，按时间倒序排序。
 * 结果缓存 10 分钟以提高性能。
 * 
 * @param {number} page - 页码（从 1 开始）
 * @param {number} perPage - 每页记录数
 * @returns {Promise<Object>} 包含 judgements 数组和 hasMore 标志的对象
 */
export async function getRecentJudgements(page = 1, perPage = 10) {
	return await withCache({
		cacheKey: `recent_judgements:${page}:${perPage}`,
		ttl: 600,
		fetchFn: async () => {
			const skip = (page - 1) * perPage;
			let judgements = await Judgement.find({
				order: { time: 'DESC' },
				skip: skip,
				take: perPage + 1
			});
			
			const hasMore = judgements.length > perPage;
			if (hasMore) {
				judgements = judgements.slice(0, perPage);
			}
			
			judgements = await Promise.all(judgements.map(async (judgement) => {
				await judgement.loadRelationships();
				judgement.formatDate();
				return judgement;
			}));
			
			return { judgements, hasMore };
		}
	});
}

/**
 * 获取陶片放逐总数
 * 
 * @returns {Promise<number>} 陶片放逐记录总数
 */
export async function getJudgementsCount() {
	return await withCache({
		cacheKey: 'judgements_count',
		ttl: 600,
		fetchFn: async () => {
			return await Judgement.count();
		}
	});
}
