import Article from "../models/article.js";
import ArticleVersion from "../models/article_version.js";

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
	
	// Invalidate cache for this article and recent articles
	await redis.del(`article:${aid}`);
	// Clear all recent articles cache (wildcard pattern)
	const keys = await redis.redis.keys('recent_articles:*');
	if (keys.length > 0) {
		await redis.redis.del(...keys);
	}
	// Invalidate statistics cache since article count may have changed
	await redis.del('statistics:full');
	await redis.del('statistics:counts');
}

export async function getRecentArticles(count) {
	const cacheKey = `recent_articles:${count}`;
	
	// Try to get from cache first
	const cachedResult = await redis.get(cacheKey);
	if (cachedResult) {
		return JSON.parse(cachedResult);
	}
	
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
	
	// Cache for 10 minutes (600 seconds)
	await redis.set(cacheKey, JSON.stringify(articles), 600);
	
	return articles;
}


export async function getArticleById(id) {
	if (id.length !== 8) throw new Error("Invalid article ID.");
	
	const cacheKey = `article:${id}`;
	
	// Try to get from cache first
	const cachedResult = await redis.get(cacheKey);
	if (cachedResult) {
		return JSON.parse(cachedResult);
	}
	
	const article = await Article.findById(id);
	if (!article) return null;
	
	await article.loadRelationships();
	article.formatDate();
	
	if (article.deleted) throw new Error(article.deleted_reason);
	
	const sanitizedContent = utils.sanitizeLatex(article.content);
	const renderedContent = renderer.renderMarkdown(sanitizedContent);
	
	const result = { article, renderedContent };
	
	// Cache for 30 minutes (1800 seconds)
	await redis.set(cacheKey, JSON.stringify(result), 1800);
	
	return result;
}