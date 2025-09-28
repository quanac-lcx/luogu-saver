/**
 * Article Service Module
 * 
 * This module provides services for managing articles, including:
 * - Article creation and updates with version history
 * - Cached retrieval of articles with automatic cache bypass support
 * - Recent articles listing with configurable counts
 * - Cache invalidation on data changes
 * 
 * All cached methods automatically respect the _bypassRedis=1 parameter
 * when present in the request URL.
 * 
 * @author Copilot
 */

import Article from "../models/article.js";
import ArticleVersion from "../models/article_version.js";
import { withCache, invalidateCache, invalidateCacheByPattern } from "../core/cache.js";

/**
 * Save or update an article with version history
 * 
 * This function handles both creating new articles and updating existing ones.
 * It maintains version history and automatically invalidates related cache entries.
 * 
 * @param {Object} task - Task object containing article metadata
 * @param {string} task.aid - Article ID
 * @param {Object} obj - Article data object
 * @param {string} obj.title - Article title
 * @param {string} obj.content - Article content
 * @param {Object} obj.userData - User data with uid
 * @param {number} obj.category - Article category
 * @param {Object} obj.solutionFor - Solution metadata (for category 2)
 * @param {Function} [onProgress] - Optional progress callback function
 */

export async function saveArticle(task, obj, onProgress) {
	const aid = task.aid;
	let article = await Article.findById(aid);
	const newHash = utils.hashContent(obj.content);
	
	// Create new article if it doesn't exist
	if (!article) {
		onProgress?.(1, "Creating new article...");
		article = Article.create({
			id: aid,
			title: obj.title,
			content: obj.content,
			author_uid: obj.userData.uid,
			category: obj.category,
			solution_for_pid: obj.category === 2 ? (obj.solutionFor?.pid || null) : null,
			content_hash: newHash
		});
		await article.save();
	} else {
		// Update existing article if content has changed
		let oldHash = article.content_hash;
		if (!oldHash) {
			// Generate hash for existing content if not present
			oldHash = utils.hashContent(article.content);
			article.content_hash = oldHash;
			await article.save();
		}
		
		// Skip update if title and content are unchanged
		if (article.title === obj.title && oldHash === newHash) {
			onProgress?.(2, "The article is already up-to-date.");
			return;
		}
		
		// Update article with new content
		onProgress?.(1, "Updating existing article...");
		article.title = obj.title;
		article.content = obj.content;
		article.author_uid = obj.userData.uid;
		article.category = obj.category;
		article.solution_for_pid = obj.category === 2 ? (obj.solutionFor?.pid || null) : null;
		article.content_hash = newHash;
		await article.save();
	}
	
	// Create version history entry
	onProgress?.(1, "Updating version history...");
	const latestVersion = await ArticleVersion.getLatestVersion(aid);
	const nextVersion = latestVersion ? latestVersion.version + 1 : 1;
	const newVersion = ArticleVersion.create({
		origin_id: aid,
		version: nextVersion,
		title: obj.title,
		content: obj.content
	});
	await newVersion.save();
	
	// Invalidate all related cache entries
	await Promise.all([
		invalidateCache(`article:${aid}`),
		invalidateCacheByPattern('recent_articles:*'),
		invalidateCache(['statistics:full', 'statistics:counts'])
	]);
}

/**
 * Get recent articles with caching support
 * 
 * Retrieves the most recently updated articles, ordered by priority and update time.
 * Results are cached for 10 minutes to improve performance. The cache automatically
 * respects bypass requests via the _bypassRedis=1 parameter.
 * 
 * @param {number} count - Maximum number of articles to retrieve
 * @returns {Promise<Array>} Array of article objects with formatted dates and summaries
 */
export async function getRecentArticles(count) {
	return await withCache({
		cacheKey: `recent_articles:${count}`,
		ttl: 600, // 10 minutes
		fetchFn: async () => {
			// Fetch articles from database
			let articles = await Article.find({
				where: {deleted: false},
				order: {priority: 'DESC', updated_at: 'DESC'},
				take: count
			});
			
			// Process each article with relationships and formatting
			articles = await Promise.all(articles.map(async(article) => {
				await article.loadRelationships();
				article.formatDate();
				article.summary = article.content.slice(0, 200); // Create summary
				article.tags = JSON.parse(article.tags);
				return article;
			}));
			
			return articles;
		}
	});
}

/**
 * Get article by ID with caching support
 * 
 * Retrieves a specific article by its ID, including rendered content.
 * Results are cached for 30 minutes. Throws error for deleted articles.
 * The cache automatically respects bypass requests.
 * 
 * @param {string} id - Article ID (must be 8 characters)
 * @returns {Promise<Object|null>} Object with article and renderedContent, or null if not found
 * @throws {Error} If ID is invalid or article is deleted
 */
export async function getArticleById(id) {
	if (id.length !== 8) throw new Error("Invalid article ID.");
	
	return await withCache({
		cacheKey: `article:${id}`,
		ttl: 1800, // 30 minutes
		fetchFn: async () => {
			const article = await Article.findById(id);
			if (!article) return null;
			
			// Load relationships and format dates
			await article.loadRelationships();
			article.formatDate();
			
			// Check if article is deleted
			if (article.deleted) throw new Error(`The article (ID: ${id}) has been deleted: ${article.deleted_reason}`);
			
			// Process and render content
			const sanitizedContent = utils.sanitizeLatex(article.content);
			const renderedContent = renderer.renderMarkdown(sanitizedContent);
			
			return { article, renderedContent };
		}
	});
}