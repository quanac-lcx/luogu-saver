import express from 'express';
import Token from '../models/token.js';

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
		const tokenText = utils.generateRandomString(32);
		let token = await Token.findOne({ where: { uid: parseInt(uid) } });
		if (token) await token.remove();
		token = Token.create({
			id: tokenText,
			uid: parseInt(uid),
			role: 0
		});
		await token.save();
		res.json(utils.makeResponse(true, { token: tokenText }));
	} catch (error) {
		logger.warn(`An error occurred while generating token: ${error.message}`);
		res.json(utils.makeResponse(false, { message: error.message || "Failed to generate token." }));
	}
});

export default router;