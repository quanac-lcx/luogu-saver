import express from "express";
import { getStatistics } from "../services/statistic.service.js";
import { asyncJsonHandler } from "../core/errors.js";

const router = express.Router();

router.get("/statistic", asyncJsonHandler(async (req, res) => {
	res.json(utils.makeResponse(true, await getStatistics()));
}));

export default router;
