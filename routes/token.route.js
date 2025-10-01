import express from "express";
import { generateToken } from "../services/token.service.js";
import { ValidationError, logError } from "../core/errors.js";

const router = express.Router();

router.get("/apply", async (req, res, next) => {
	try {
		res.render("user/token_apply.njk", { title: "申请 Token" });
	} catch (error) {
		next(error);
	}
});

router.post("/generate", async (req, res) => {
	try {
		if (!req.body || !req.body.pasteId || !req.body.uid) {
			throw new ValidationError("缺少必需参数");
		}
		
		const { pasteId, uid } = req.body;
		const tokenText = await generateToken(pasteId, uid);
		
		res.json(utils.makeResponse(true, { token: tokenText }));
	} catch (error) {
		await logError(error, req, logger);
		res.json(utils.makeResponse(false, { message: error.message || "Failed to generate token." }));
	}
});

export default router;
