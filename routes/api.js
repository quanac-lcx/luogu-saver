import express from 'express';
import db from "../db.js";
import {formatDate, makeStandardResponse} from "../utils.js";
import logger from "../logger.js";

const router = express.Router();

router.get('/statistic', async (req, res) => {
	try {
		async function getTimeSeriesData(tableName) {
			const [earliestRecord] = await db.query(
				`SELECT created_at FROM ${tableName} ORDER BY created_at ASC LIMIT 1`
			);
			if (earliestRecord.length === 0) return [];
			const startDate = new Date(earliestRecord[0].created_at);
			startDate.setHours(0, 0, 0, 0);
			const [dailyData] = await db.query(
				`SELECT DATE(created_at) as date, COUNT(*) as count FROM ${tableName} GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC`
			);
			const dailyMap = {};
			dailyData.forEach(item => {
				const dateStr = formatDate(item.date);
				dailyMap[dateStr] = item.count;
			});
			let cumulativeCount = 0;
			const result = [];
			let currentDate = new Date(startDate);
			currentDate.setHours(0, 0, 0, 0);
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			while (currentDate <= today) {
				const dateStr = formatDate(currentDate);
				const dayCount = dailyMap[dateStr] || 0;
				cumulativeCount += dayCount;
				result.push({
					date: dateStr,
					total: cumulativeCount,
					delta: dayCount
				});
				
				currentDate.setDate(currentDate.getDate() + 1);
			}
			
			return result;
		}
		const [articlesCountResult] = await db.query('SELECT COUNT(*) as count FROM articles');
		const [pastesCountResult] = await db.query('SELECT COUNT(*) as count FROM pastes');
		const articlesCount = articlesCountResult[0].count;
		const pastesCount = pastesCountResult[0].count;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const [todayArticlesResult] = await db.query(
			'SELECT COUNT(*) as count FROM articles WHERE created_at >= ?',
			[today]
		);
		const [todayPastesResult] = await db.query(
			'SELECT COUNT(*) as count FROM pastes WHERE created_at >= ?',
			[today]
		);
		const todayArticles = todayArticlesResult[0].count;
		const todayPastes = todayPastesResult[0].count;
		const articlesData = await getTimeSeriesData('articles');
		const pastesData = await getTimeSeriesData('pastes');
		res.json(makeStandardResponse(
			true,
			{
				articles_total: articlesCount,
				pastes_total: pastesCount,
				today_articles: todayArticles,
				today_pastes: todayPastes,
				time_series: {
					articles: articlesData,
					pastes: pastesData
				}
			}
		));
	} catch (error) {
		logger.warn(`An error occurred while fetching statistics: ${error.message}`);
		res.json(makeStandardResponse(false, {message: error.message}));
	}
});

export default router;