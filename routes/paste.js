import express from 'express';
import db from '../db.js';
import { formatDate } from '../utils.js';
import { createMarkdownRenderer } from "../renderer.js";

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
		const [rows] = await db.query('SELECT * FROM pastes WHERE id = ?', [req.params.id]);
		if (rows.length === 0) {
			throw new Error('Paste not found');
		}
		const paste = await loadRelationships({
			...rows[0],
			updated_at: formatDate(rows[0].updated_at),
			created_at: formatDate(rows[0].created_at),
		});
		if (paste.deleted) {
			throw new Error(paste.deleted_reason);
		}
		function sanitizeLatex(src) {
			return src.replace(/\$\$([\s\S]*?)\$\$|\$([^\$]+)\$/g, (match, block, inline) => {
				const content = block ?? inline;
				if (/\\rule\s*{[^}]*(em|px)\s*}{[^}]*(em|px)}/.test(content))
					return inline ?
						'$\\color{red}\\text{\\textbackslash rule haven\'t supported yet.}$' :
						'$$\\color{red}\\text{\\textbackslash rule haven\'t supported yet.}$$';
				return match;
			});
		}
		const sanitized = sanitizeLatex(paste.content);
		const renderedContent = createMarkdownRenderer().renderMarkdown(sanitized);
		res.render('paste.njk', { paste, renderedContent });
	} catch (error) {
		next(error);
	}
});

router.get('/save/:id', async (req, res) => {

});

export default router;