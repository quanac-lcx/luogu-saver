import Article from "../models/article.js";
import ArticleVersion from "../models/article_version.js";
import { withCache, invalidateCache, invalidateCacheByPattern } from "../core/cache.js";

export async function saveArticle(task, obj, onProgress) {
	const aid = task.aid;
	let article = await Article.findById(aid);
	const newHash = utils.hashContent(obj.content);
	
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
		let oldHash = article.content_hash;
		if (!oldHash) {
			oldHash = utils.hashContent(article.content);
			article.content_hash = oldHash;
			await article.save();
		}
		
		if (article.title === obj.title && oldHash === newHash) {
			onProgress?.(2, "The article is already up-to-date.");
			return;
		}
		
		onProgress?.(1, "Updating existing article...");
		article.title = obj.title;
		article.content = obj.content;
		article.author_uid = obj.userData.uid;
		article.category = obj.category;
		article.solution_for_pid = obj.category === 2 ? (obj.solutionFor?.pid || null) : null;
		article.content_hash = newHash;
		await article.save();
	}
	
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
	
	// Invalidate caches
	await Promise.all([
		invalidateCache(`article:${aid}`),
		invalidateCacheByPattern('recent_articles:*'),
		invalidateCache(['statistics:full', 'statistics:counts'])
	]);
}

export async function getRecentArticles(count, req = null) {
	return await withCache({
		cacheKey: `recent_articles:${count}`,
		ttl: 600, // 10 minutes
		req,
		fetchFn: async () => {
			let articles = await Article.find({
				where: {deleted: false},
				order: {priority: 'DESC', updated_at: 'DESC'},
				take: count
			});
			articles = await Promise.all(articles.map(async(article) => {
				await article.loadRelationships();
				article.formatDate();
				article.summary = article.content.slice(0, 200);
				article.tags = JSON.parse(article.tags);
				return article;
			}));
			return articles;
		}
	});
}


export async function getArticleById(id, req = null) {
	if (id.length !== 8) throw new Error("Invalid article ID.");
	
	return await withCache({
		cacheKey: `article:${id}`,
		ttl: 1800, // 30 minutes
		req,
		fetchFn: async () => {
			const article = await Article.findById(id);
			if (!article) return null;
			
			await article.loadRelationships();
			article.formatDate();
			
			if (article.deleted) throw new Error(article.deleted_reason);
			
			const sanitizedContent = utils.sanitizeLatex(article.content);
			const renderedContent = renderer.renderMarkdown(sanitizedContent);
			
			return { article, renderedContent };
		}
	});
}