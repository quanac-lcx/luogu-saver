import express from "express";
import { getStatistics } from "../services/statistic.service.js";
import { asyncJsonHandler } from "../core/errors.js";
import { makeResponse } from "../core/utils.js";
import { requireLogin } from "../middleware/permission.js";
import * as deletionRequestService from "../services/deletion_request.service.js";
import * as settingsService from "../services/settings.service.js";

const router = express.Router();

router.get("/statistic", asyncJsonHandler(async (req, res) => {
	res.json(makeResponse(true, await getStatistics()));
}));

router.get("/ads", asyncJsonHandler(async (req, res) => {
	res.json(makeResponse(true, { data: await settingsService.getAds() }));
}));

router.post("/deletion/:type/:id", requireLogin, asyncJsonHandler(async (req, res) => {
	const { type, id } = req.params;
	const { reason } = req.body;
	const requesterUid = req.user.id;
	
	const result = await deletionRequestService.createDeletionRequest(type, id, requesterUid, reason);
	res.json(makeResponse(true, result));
}));

export default router;
