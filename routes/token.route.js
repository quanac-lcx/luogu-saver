import express from "express";
import { generateToken } from "../services/token.service.js";

const router = express.Router();

router.get("/apply", async (req, res, next) => {
	try {
		res.render("token_apply.njk", { title: "申请 Token" });
	} catch (error) {
		next(error);
	}
});

router.post("/generate", async (req, res) => {
	try {
		if (!req.body || !req.body.pasteId || !req.body.uid) {
			throw new Error("Missing required parameters.");
		}
		
		const { pasteId, uid } = req.body;
		const tokenText = await generateToken(pasteId, uid);
		
		res.json(utils.makeResponse(true, { token: tokenText }));
	} catch (error) {
		logger.warn(`An error occurred while generating token: ${error.message}`);
		res.json(utils.makeResponse(false, { message: error.message || "Failed to generate token." }));
	}
});

export default router;
