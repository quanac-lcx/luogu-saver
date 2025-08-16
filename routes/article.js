import express from 'express';
import db from '../db.js';
import { formatDate } from '../utils.js';

const router = express.Router();

async function loadRelationships(article) {
	const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [article.author_uid]);
	if (rows.length === 0) {
		throw new Error('Author not found');
	}
	article.author = rows[0];
	return article;
}

router.get('/:id', async (req, res, next) => {
	try {
		const [rows] = await db.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
		if (rows.length === 0) {
			next(new Error('Article not found'));
			return;
		}
		const article = await loadRelationships({
			...rows[0],
			updated_at: formatDate(rows[0].updated_at),
			created_at: formatDate(rows[0].created_at),
		});
		res.render('article.njk', { article });
	} catch (error) {
		next(error);
	}
});

router.get('/save/:id', async (req, res) => {

});

export default router;