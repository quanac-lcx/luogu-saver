import express from 'express';
import { asyncJsonHandler, ValidationError } from "../core/errors.js";
import { makeResponse } from "../core/utils.js";
import { getAt, getStatistics, searchById } from "../services/benben.service.js";
import config from "../config.js";
import { benbenCallbacks } from "../core/storage.js";

const router = express.Router();

router.get('/api/statistic', asyncJsonHandler(async (req, res) => {
	res.json(makeResponse(true, { ...await getStatistics() }));
}));

router.get('/api/at/:username', asyncJsonHandler(async (req, res) => {
	const { username } = req.params;
	if (!username) throw new ValidationError("用户名无效");
	res.json(makeResponse(true, { data: await getAt(username) }));
}));

router.post('/api/search/advanced', asyncJsonHandler(async (req, res) => {
	const { keyword, senders, date_before, date_after } = req.body;
	// TODO: 实现搜索功能
	res.json(makeResponse(false, { message: "搜索功能尚未实现" }));
}));

router.get('/api/search/feed/:uid', asyncJsonHandler(async (req, res) => {
	const { uid } = req.params;
	const { page, per_page } = req.query;
	if (!parseInt(uid)) throw new ValidationError("UID 无效");
	res.json(makeResponse(true, await searchById(uid, { page, per_page })));
}));

router.get('/save/:id', asyncJsonHandler(async (req, res) => {
	const { id } = req.params;
	if (!parseInt(id)) throw new ValidationError("UID 无效");
	if (benbenCallbacks.get(parseInt(id))) throw new ValidationError("该用户已在队列中");
	const url = `${config.service.crawler_url}/${id}`;
	const tid = await worker.pushTaskToQueue({ url, aid: id, type: 2 });
	res.send(makeResponse(true, { message: "请求已入队", result: tid }));
}));

export default router;