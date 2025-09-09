import express from 'express';

const router = express.Router();

router.get('/apply', async (req, res, next) => {
	try {
		res.render('token_apply.njk', { title: "申请 Token" });
	} catch (error) {
		next(error);
	}
});

router.post('/generate', async (req, res) => {
	if (!req.body || !req.body.pasteId || !req.body.uid) {
		throw new Error("Missing required parameters.");
	}
	const { pasteId, uid } = req.body;
	const url = `https://www.luogu.com/paste/${pasteId}`;
	try {
		const value = await worker.sendContentRequest(url, worker.defaultHeaders, 1);
		if (!value.success) {
			throw new Error(value.message || "Failed to fetch paste content.");
		}
		const content = value.content || "";
		if (content !== "lgs_register_verification") {
			throw new Error("Verification content does not match.");
		}
		if (parseInt(uid) !== value.userData.uid) {
			throw new Error("UID does not match.");
		}
		const token = [...Array(32)].map(() => Math.random().toString(36)[2]).join('');
		await db.execute(`
			INSERT INTO token (id, uid, role) VALUES (?, ?, 0)
			ON DUPLICATE KEY UPDATE uid = VALUES(uid), id = VALUES(id), role = VALUES(role)
		`, [token, uid]);
		res.json(utils.makeResponse(true, { token }));
	} catch (error) {
		logger.warn(`An error occurred while generating token: ${error.message}`);
		res.json(utils.makeResponse(false, { message: error.message || "Failed to generate token." }));
	}
});

export default router;