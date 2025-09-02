import express from 'express';
import db from '../db.js';
import {formatDate, makeStandardResponse, sanitizeLatex} from '../utils.js';
import { createMarkdownRenderer } from "../renderer.js";
import {pushQueue} from "../request.js";
import logger from "../logger.js";

const router = express.Router();

async function loadRelationships(paste) {
	const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [paste.author_uid]);
	if (rows.length === 0) {
		throw new Error('Author not found');
	}
	paste.author = rows[0];
	return paste;
}

router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params;
		if (id.length !== 8) throw new Error('Invalid article ID.');
		const [rows] = await db.query('SELECT * FROM pastes WHERE id = ?', [id]);
		if (rows.length === 0) {
			res.render('paste.njk', {
				title: "保存剪贴板",
				paste: {
					title: `剪贴板 ${id}`,
					id,
					updated_at: "尚未保存"
				},
				renderedContent: null,
				empty: true
			});
			return next();
		}
		const paste = await loadRelationships({
			...rows[0],
			updated_at: formatDate(rows[0].updated_at),
			created_at: formatDate(rows[0].created_at),
		});
		if (paste.deleted) {
			throw new Error(paste.deleted_reason);
		}
		const sanitized = sanitizeLatex(paste.content);
		const renderedContent = createMarkdownRenderer().renderMarkdown(sanitized);
		res.render('paste.njk', { title: `剪贴板 ${paste.id}`, paste, renderedContent });
	} catch (error) {
		next(error);
	}
});

router.get('/save/:id', async (req, res) => {
	try {
		const s = req.params.id;
		if (s.length !== 8) throw new Error('Invalid paste ID.');
		const url = `https://www.luogu.com/paste/${s}`;
		const headers = {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
		};
		const id = await pushQueue({ url, headers, aid: s, type: 1 });
		res.send(makeStandardResponse(true, { message: "Request queued.", result: id })).end();
	} catch (error) {
		logger.warn('An error occurred when saving paste: ' + error.message);
		res.send(makeStandardResponse(false, { message: error.message })).end();
	}
});

export default router;