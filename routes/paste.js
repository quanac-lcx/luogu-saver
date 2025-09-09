import express from 'express';

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
			updated_at: utils.formatDate(rows[0].updated_at),
			created_at: utils.formatDate(rows[0].created_at),
		});
		if (paste.deleted) {
			throw new Error(paste.deleted_reason);
		}
		const sanitized = utils.sanitizeLatex(paste.content);
		const renderedContent = renderer.createMarkdownRenderer().renderMarkdown(sanitized);
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
		const id = await worker.pushQueue({ url, aid: s, type: 1 });
		res.send(utils.makeResponse(true, { message: "Request queued.", result: id })).end();
	} catch (error) {
		logger.warn('An error occurred when saving paste: ' + error.message);
		res.send(utils.makeResponse(false, { message: error.message })).end();
	}
});

export default router;