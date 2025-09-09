import express from 'express';

const router = express.Router();

async function loadRelationships(article) {
	const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [article.author_uid]);
	if (rows.length === 0) {
		throw new Error('Author not found.');
	}
	article.author = rows[0];
	return article;
}

router.get('/recent', async (req, res, next) => {
	try {
		const count = 20;
		const [rows] = await db.execute(
			`SELECT a.*, u.name AS author_name, u.color AS author_color
             FROM articles a
                      LEFT JOIN users u ON a.author_uid = u.id
             WHERE deleted = false
             ORDER BY priority DESC, updated_at DESC LIMIT ?`,
			[count]
		);
		let articles = rows;
		articles.map((article) => {
			article.updated_at = utils.formatDate(article.updated_at);
			article.created_at = utils.formatDate(article.created_at);
			article.summary = article.content.slice(0, 200);
			article.tags = JSON.parse(article.tags);
			return article;
		});
		res.render('article_recent.njk', { title: "最近更新", articles });
	} catch (error) {
		next(error);
	}
});

router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params;
		if (id.length !== 8) throw new Error('Invalid article ID.');
		const start = Date.now();
		const [rows] = await db.query('SELECT * FROM articles WHERE id = ?', [id]);
		if (rows.length === 0) {
			res.render('article.njk', {
				title: "保存文章",
				article: {
					title: `文章 - ${id}`,
					id,
					updated_at: "尚未保存"
				},
				renderedContent: null,
				empty: true
			});
			return next();
		}
		const article = await loadRelationships({
			...rows[0],
			updated_at: utils.formatDate(rows[0].updated_at),
			created_at: utils.formatDate(rows[0].created_at),
		});
		if (article.deleted) {
			throw new Error(article.deleted_reason);
		}
		//const versions = await db.query('SELECT * FROM article_versions WHERE origin_id = ? ORDER BY version DESC', [article.id]);
		const end_1 = Date.now();
		logger.debug(`Article ${article.id} loaded from database in ${end_1 - start}ms.`);
		const sanitized = utils.sanitizeLatex(article.content);
		const renderedContent = renderer.createMarkdownRenderer().renderMarkdown(sanitized);
		const end_2 = Date.now();
		logger.debug(`Article ${article.id} loaded in ${end_2 - start}ms.`);
		res.render('article.njk', { title: `${article.title}`, article, renderedContent, empty: false });
	} catch (error) {
		next(error);
	}
});

router.get('/save/:id', async (req, res) => {
	try {
		const s = req.params.id;
		if (s.length !== 8) throw new Error('Invalid article ID.');
		const url = `https://www.luogu.com/article/${s}`;
		const id = await worker.pushQueue({ url, aid: s, type: 0 });
		res.send(utils.makeResponse(true, { message: "Request queued.", result: id }));
	} catch (error) {
		logger.warn('An error occurred when saving article: ' + error.message);
		res.send(utils.makeResponse(false, { message: error.message }));
	}
});

export default router;