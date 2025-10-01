import express from "express";
import { getStatistics } from "../services/statistic.service.js";
import { asyncHandler } from "../core/errors.js";

const router = express.Router();

router.get("/statistic", asyncHandler(async (req, res) => {
	res.json(utils.makeResponse(true, await getStatistics()));
}));

export default router;
