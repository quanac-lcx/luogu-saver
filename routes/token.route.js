import express from "express";
import { generateToken } from "../services/token.service.js";
import { ValidationError, asyncHandler, asyncJsonHandler } from "../core/errors.js";
import { makeResponse } from "../core/utils.js";

const router = express.Router();

router.get("/apply", asyncHandler(async (req, res, next) => {
	res.render("user/token_apply.njk", { title: "申请 Token" });
}));

router.post("/generate", asyncJsonHandler(async (req, res) => {
	if (!req.body || !req.body.pasteId || !req.body.uid) {
		throw new ValidationError("缺少必需参数");
	}
	
	const { pasteId, uid } = req.body;
	const tokenText = await generateToken(pasteId, uid);
	
	res.json(makeResponse(true, { token: tokenText }));
}));

export default router;
