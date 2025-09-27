import Article from "../models/article.js";
import Paste from "../models/paste.js";

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

export async function getStatistics() {
	const cacheKey = 'statistics:full';
	
	// Try to get from cache first
	const cachedResult = await global.redis.get(cacheKey);
	if (cachedResult) {
		return JSON.parse(cachedResult);
	}
	
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
	
	const result = {
		articles_total: articlesCount,
		pastes_total: pastesCount,
		today_articles: todayArticles,
		today_pastes: todayPastes,
		time_series: {
			articles: articlesData,
			pastes: pastesData,
		},
	};
	
	// Cache for 5 minutes (300 seconds) since this is expensive to compute
	await global.redis.set(cacheKey, JSON.stringify(result), 300);
	
	return result;
}

export async function getCounts() {
	const cacheKey = 'statistics:counts';
	
	// Try to get from cache first
	const cachedResult = await global.redis.get(cacheKey);
	if (cachedResult) {
		return JSON.parse(cachedResult);
	}
	
	const articlesCount = await Article.count();
	const pastesCount = await Paste.count();
	
	const result = { articlesCount, pastesCount };
	
	// Cache for 2 minutes (120 seconds)
	await global.redis.set(cacheKey, JSON.stringify(result), 120);
	
	return result;
}
