import express from 'express';
import { getPasteById } from "../services/paste.service.js";
import { ValidationError, logError } from "../core/errors.js";

const router = express.Router();

router.get('/save/:id', async (req, res) => {
	try {
		const s = req.params.id;
		if (s.length !== 8) throw new ValidationError("剪贴板 ID 无效");
		const url = `https://www.luogu.com/paste/${s}`;
		const id = await worker.pushTaskToQueue({ url, aid: s, type: 1 });
		res.send(utils.makeResponse(true, { message: "Request queued.", result: id }));
	} catch (error) {
		await logError(error, req, logger);
		res.send(utils.makeResponse(false, { message: error.message }));
	}
});

router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params;
		const result = await getPasteById(id);
		
		if (!result) {
			res.render('content/paste.njk', {
				title: "保存剪贴板",
				paste: { title: `剪贴板 ${id}`, id, updated_at: "尚未保存" },
				renderedContent: null,
				empty: true
			});
			return;
		}
		
		const { paste, renderedContent } = result;
		res.render('content/paste.njk', {
			title: `剪贴板 ${paste.id}`,
			paste,
			renderedContent,
			empty: false
		});
	} catch (error) {
		next(error);
	}
});

export default router;