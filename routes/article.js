import express from 'express';
import db from '../db.js';

const router = express.Router();

router.get('/:id', async (req, res, next) => {
	try {
		const [rows] = await db.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
		if (rows.length === 0) {
			next(new Error('Article not found'));
			return;
		}
		const article = rows[0];
		res.render('article.njk', { article });
	} catch (error) {
		next(error);
	}
});

router.get('/save/:id', async (req, res) => {

});

export default router;