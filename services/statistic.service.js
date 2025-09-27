import Article from "../models/article.js";
import Paste from "../models/paste.js";
import { withCache } from "../core/cache.js";

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
		const dateStr = utils.formatDate(row.date);
		dailyMap[dateStr] = Number(row.count);
	});
	
	let cumulativeCount = 0;
	const result = [];
	let currentDate = new Date(startDate);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	
	while (currentDate <= today) {
		const dateStr = utils.formatDate(currentDate);
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

export async function getStatistics(req = null) {
	return await withCache({
		cacheKey: 'statistics:full',
		ttl: 300, // 5 minutes
		req,
		fetchFn: async () => {
			const articlesCount = await Article.count();
			const pastesCount = await Paste.count();
			
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			
			const todayArticles = await Article.createQueryBuilder("a")
				.where("a.created_at >= :today", { today })
				.getCount();
			
			const todayPastes = await Paste.createQueryBuilder("p")
				.where("p.created_at >= :today", { today })
				.getCount();
			
			const articlesData = await getTimeSeriesData(Article);
			const pastesData = await getTimeSeriesData(Paste);
			
			return {
				articles_total: articlesCount,
				pastes_total: pastesCount,
				today_articles: todayArticles,
				today_pastes: todayPastes,
				time_series: {
					articles: articlesData,
					pastes: pastesData,
				},
			};
		}
	});
}

export async function getCounts(req = null) {
	return await withCache({
		cacheKey: 'statistics:counts',
		ttl: 120, // 2 minutes
		req,
		fetchFn: async () => {
			const articlesCount = await Article.count();
			const pastesCount = await Paste.count();
			return { articlesCount, pastesCount };
		}
	});
}
