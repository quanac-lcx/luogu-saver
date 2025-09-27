/**
 * Statistics Service Module
 * 
 * This module provides statistical data services for the application, including:
 * - Article and paste count statistics
 * - Time series data generation for charts and analytics
 * - Comprehensive statistics with daily breakdowns
 * - Cached results for performance optimization
 * 
 * @author Copilot
 */

import Article from "../models/article.js";
import Paste from "../models/paste.js";
import { withCache } from "../core/cache.js";

/**
 * Generate time series data for a given entity type
 * 
 * Creates daily statistics from the earliest record to today,
 * including cumulative totals and daily deltas.
 * 
 * @param {Object} entityClass - Database entity class (Article or Paste)
 * @returns {Promise<Array>} Array of daily statistics objects
 * @private
 */

async function getTimeSeriesData(entityClass) {
	// Find the earliest record to determine start date
	const earliest = await entityClass
		.createQueryBuilder("t")
		.select("t.created_at", "created_at")
		.orderBy("t.created_at", "ASC")
		.limit(1)
		.getRawOne();
	
	if (!earliest) return [];
	
	// Set start date to beginning of day
	const startDate = new Date(earliest.created_at);
	startDate.setHours(0, 0, 0, 0);
	
	// Get daily counts grouped by date
	const dailyData = await entityClass
		.createQueryBuilder("t")
		.select("DATE(t.created_at)", "date")
		.addSelect("COUNT(*)", "count")
		.groupBy("DATE(t.created_at)")
		.orderBy("DATE(t.created_at)", "ASC")
		.getRawMany();
	
	// Create lookup map for daily counts
	const dailyMap = {};
	dailyData.forEach((row) => {
		const dateStr = utils.formatDate(row.date);
		dailyMap[dateStr] = Number(row.count);
	});
	
	// Generate complete time series with cumulative totals
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

/**
 * Get comprehensive statistics with caching support
 * 
 * Retrieves complete statistical overview including totals, today's counts,
 * and time series data for both articles and pastes. Results are cached
 * for 5 minutes due to expensive time series calculations.
 * 
 * @returns {Promise<Object>} Complete statistics object with time series data
 */
export async function getStatistics() {
	return await withCache({
		cacheKey: 'statistics:full',
		ttl: 300, // 5 minutes
		fetchFn: async () => {
			// Get basic counts
			const articlesCount = await Article.count();
			const pastesCount = await Paste.count();
			
			// Set up today's date for filtering
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			
			// Get today's counts in parallel
			const [todayArticles, todayPastes] = await Promise.all([
				Article.createQueryBuilder("a")
					.where("a.created_at >= :today", { today })
					.getCount(),
				Paste.createQueryBuilder("p")
					.where("p.created_at >= :today", { today })
					.getCount()
			]);
			
			// Generate time series data for both entity types
			const [articlesData, pastesData] = await Promise.all([
				getTimeSeriesData(Article),
				getTimeSeriesData(Paste)
			]);
			
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

/**
 * Get simple count statistics with caching support
 * 
 * Retrieves basic article and paste counts. Results are cached
 * for 2 minutes as these are frequently accessed but simple queries.
 * 
 * @returns {Promise<Object>} Object with articlesCount and pastesCount
 */
export async function getCounts() {
	return await withCache({
		cacheKey: 'statistics:counts',
		ttl: 120, // 2 minutes
		fetchFn: async () => {
			// Get counts in parallel for better performance
			const [articlesCount, pastesCount] = await Promise.all([
				Article.count(),
				Paste.count()
			]);
			return { articlesCount, pastesCount };
		}
	});
}
