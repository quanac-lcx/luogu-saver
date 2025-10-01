/**
 * 文章服务模块
 * 
 * 该模块提供文章管理服务，包括：
 * - 带版本历史的文章创建和更新
 * - 支持自动缓存绕过的文章缓存检索
 * - 可配置计数的最新文章列表
 * - 数据变更时的缓存失效
 * 
 * 所有缓存方法在请求URL中包含_bypassRedis=1参数时
 * 会自动绕过缓存。
 * 
 * @author Copilot
 */

import Article from "../models/article.js";
import ArticleVersion from "../models/article_version.js";
import { withCache, invalidateCache, invalidateCacheByPattern } from "../core/cache.js";
import { ValidationError, NotFoundError } from "../core/errors.js";

/**
 * 保存或更新带版本历史的文章
 * 
 * 此函数处理创建新文章和更新现有文章两种情况。
 * 它维护版本历史并自动使相关缓存条目失效。
 * 
 * @param {Object} task - 包含文章元数据的任务对象
 * @param {string} task.aid - 文章ID
 * @param {Object} obj - 文章数据对象
 * @param {string} obj.title - 文章标题
 * @param {string} obj.content - 文章内容
 * @param {Object} obj.userData - 包含uid的用户数据
 * @param {number} obj.category - 文章分类
 * @param {Object} obj.solutionFor - 题解元数据（用于分类2）
 * @param {Function} [onProgress] - 可选的进度回调函数
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
 * 获取支持缓存的最新文章
 * 
 * 检索最近更新的文章，按优先级和更新时间排序。
 * 结果缓存10分钟以提高性能。缓存会自动识别
 * 通过_bypassRedis=1参数的绕过请求。
 * 
 * @param {number} count - 要检索的最大文章数量
 * @returns {Promise<Array>} 包含格式化日期和摘要的文章对象数组
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
 * 通过ID获取支持缓存的文章
 * 
 * 通过ID检索特定文章，包括渲染的内容。
 * 结果缓存30分钟。对已删除的文章会抛出错误。
 * 缓存会自动识别绕过请求。
 * 
 * @param {string} id - 文章ID（必须是8个字符）
 * @returns {Promise<Object|null>} 包含article和renderedContent的对象，如果未找到则返回null
 * @throws {Error} 如果ID无效或文章已被删除
 */
export async function getArticleById(id) {
	if (id.length !== 8) throw new ValidationError("Invalid article ID.");
	
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
			if (article.deleted) throw new NotFoundError(`The article (ID: ${id}) has been deleted: ${article.deleted_reason}`);
			
			// Process and render content
			const sanitizedContent = utils.sanitizeLatex(article.content);
			const renderedContent = renderer.renderMarkdown(sanitizedContent);
			
			return { article, renderedContent };
		}
	});
}