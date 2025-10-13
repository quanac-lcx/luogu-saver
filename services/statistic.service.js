/**
 * 统计服务模块
 * 
 * 该模块为应用程序提供统计数据服务，包括：
 * - 文章和粘贴板计数统计
 * - 用于图表和分析的时间序列数据生成
 * - 包含每日明细的综合统计
 * - 为性能优化而缓存的结果
 * 
 * @author Copilot
 */


import Article from "../models/article.js";
import Paste from "../models/paste.js";
import Judgement from "../models/judgement.js";
import { withCache } from "../core/cache.js";
import { formatDate } from "../core/utils.js";

/**
 * 为给定实体类型生成时间序列数据
 * 
 * 创建从最早记录到今天的每日统计数据，
 * 包括累计总数和每日增量。
 * 
 * @param {Object} entityClass - 数据库实体类（Article或Paste）
 * @returns {Promise<Array>} 每日统计对象数组
 * @private
 */

async function getTimeSeriesData(entityClass) {
	const earliest = await entityClass
		.createQueryBuilder("t")
		.select("t.created_at", "created_at")
		.orderBy("t.created_at", "ASC")
		.limit(1)
		.getRawOne();
	
	if (!earliest) return [];
	
	const startDate = new Date(earliest.created_at);
	startDate.setHours(0, 0, 0, 0);
	
	const dailyData = await entityClass
		.createQueryBuilder("t")
		.select("DATE(t.created_at)", "date")
		.addSelect("COUNT(*)", "count")
		.groupBy("DATE(t.created_at)")
		.orderBy("DATE(t.created_at)", "ASC")
		.getRawMany();
	
	const dailyMap = {};
	dailyData.forEach((row) => {
		const dateStr = formatDate(row.date);
		dailyMap[dateStr] = Number(row.count);
	});
	
	let cumulativeCount = 0;
	const result = [];
	let currentDate = new Date(startDate);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	
	while (currentDate <= today) {
		const dateStr = formatDate(currentDate);
		const dayCount = dailyMap[dateStr] || 0;
		cumulativeCount += dayCount;
		result.push({
			date: dateStr,
			total: cumulativeCount,
			delta: dayCount,
		});
		currentDate.setDate(currentDate.getDate() + 1);
	}
	
	return result;
}

/**
 * 获取包含缓存支持的综合统计信息
 * 
 * 检索完整的统计概览，包括总数、今日计数
 * 以及文章和粘贴板的时间序列数据。由于昂贵的时间序列计算，
 * 结果缓存5分钟。
 * 
 * @returns {Promise<Object>} 包含时间序列数据的完整统计对象
 */
export async function getStatistics() {
	return await withCache({
		cacheKey: 'statistics:full',
		ttl: 300,
		fetchFn: async () => {
			   const articlesCount = await Article.count();
			   const pastesCount = await Paste.count();
			   const judgementsCount = await Judgement.count();

			   const today = new Date();
			   today.setHours(0, 0, 0, 0);

			   const [todayArticles, todayPastes, todayJudgements] = await Promise.all([
				   Article.createQueryBuilder("a")
					   .where("a.created_at >= :today", { today })
					   .getCount(),
				   Paste.createQueryBuilder("p")
					   .where("p.created_at >= :today", { today })
					   .getCount(),
				   Judgement.createQueryBuilder("j")
					   .where("j.created_at >= :today", { today })
					   .getCount()
			   ]);

			   const [articlesData, pastesData] = await Promise.all([
				   getTimeSeriesData(Article),
				   getTimeSeriesData(Paste)
			   ]);

			   return {
				   articles_total: articlesCount,
				   pastes_total: pastesCount,
				   judgements_total: judgementsCount,
				   today_articles: todayArticles,
				   today_pastes: todayPastes,
				   today_judgements: todayJudgements,
				   time_series: {
					   articles: articlesData,
					   pastes: pastesData,
				   },
			   };
		}
	});
}

/**
 * 获取包含缓存支持的简单计数统计
 * 
 * 检索基本的文章和粘贴板计数。由于这些是频繁访问
 * 但查询简单的数据，结果缓存2分钟。
 * 
 * @returns {Promise<Object>} 包含articlesCount和pastesCount的对象
 */
export async function getCounts() {
	return await withCache({
		cacheKey: 'statistics:counts',
		ttl: 120,
		   fetchFn: async () => {
			   const [articlesCount, pastesCount, judgementsCount] = await Promise.all([
				   Article.count(),
				   Paste.count(),
				   Judgement.count()
			   ]);
			   return { articlesCount, pastesCount, judgementsCount };
		   }
	});
}
