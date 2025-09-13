import "dotenv/config";
import axios from "axios";
import * as cheerio from 'cheerio';
import { createTask, updateTask } from "./task_manager.js";
import { createHash } from 'crypto';
import Article from "./models/article.js";
import ArticleVersion from "./models/article_version.js";
import Paste from "./models/paste.js";
import User from "./models/user.js";
import Task from "./models/task.js";

let queue = [];
let requestPoint = process.env.INITIAL_REQ_POINT;
let running = 0;

function hashContent(content) {
	return createHash('sha256').update(content, 'utf8').digest('hex');
}

export async function processTask() {
	if (!queue.length) return;
	running++;
	const task = queue.shift();
	logger.debug(`Start to process task #${task.id}. Type: ${task.type}`);
	await updateTask(task.id, 1, "We are processing your task.");
	const url = task.url;
	const headers = task.headers || defaultHeaders;
	const aid = task.aid;
	const response = await sendContentRequest(url, headers, task.type);
	await updateTask(task.id, 1, "Content fetched. Updating database...");
	if (!response.success) {
		logger.warn(`An error occurred when processing task #${task.id}: ${response.message}`);
		await updateTask(task.id, 3, response.message);
		running--;
		return;
	}
	const obj = response;
	try {
		if (task.type === 0) {
			const article = await Article.findById(aid);
			const newHash = hashContent(obj.content);
			if (!article) {
				const newArticle = Article.create({
					id: aid,
					title: obj.title,
					content: obj.content,
					author_uid: obj.userData.uid,
					category: obj.category,
					solution_for_pid: obj.category === 2 ? (obj.solutionFor?.pid || null) : null,
					content_hash: newHash
				});
				await newArticle.save();
			} else {
				let oldHash = article.content_hash;
				if (!oldHash) {
					oldHash = hashContent(article.content);
					article.content_hash = oldHash;
					await article.save();
				}
				if (article.title === obj.title && oldHash === newHash) {
					await updateTask(task.id, 2, "The article is already up-to-date.");
					return;
				}
				const newArticle = Article.create({
					id: aid,
					title: obj.title,
					content: obj.content,
					author_uid: obj.userData.uid,
					category: obj.category,
					solution_for_pid: obj.category === 2 ? (obj.solutionFor?.pid || null) : null,
					content_hash: newHash
				});
				await newArticle.save();
			}
			await updateTask(task.id, 1, "Article data updated. Updating version history...");
			const latestVersion = await Article.getLatestVersion(aid);
			const nextVersion = latestVersion ? latestVersion.version + 1 : 1;
			const newVersion = ArticleVersion.create({
				origin_id: aid,
				version: nextVersion,
				title: obj.title,
				content: obj.content
			});
			await newVersion.save();
		} else {
			const newPaste = Paste.create({
				id: aid,
				title: aid,
				content: obj.content,
				author_uid: obj.userData.uid
			});
			await newPaste.save();
		}
		await updateTask(task.id, 2, "Your task has been completed successfully.");
	} catch (error) {
		logger.warn(`An error occurred when upserting data for task #${task.id}: ${error.message}`);
		await updateTask(task.id, 3, error.message);
	} finally {
		running--;
		logger.debug(`Finish processing task #${task.id}`);
	}
}

export async function c3vk(response, url, headers) {
	if (typeof response.data === 'string') {
		const c3vkMatch = response.data.match(/C3VK=([a-zA-Z0-9]+);/);
		if (c3vkMatch) {
			logger.debug(`Processing C3VK cookie for ${url.split('?')[0]}`);
			response = await axios.get(url, {
				headers: { ...headers, Cookie: `C3VK=${c3vkMatch[1]}` }
			});
		}
	}
	return response;
}

function getResponseObject(response, type = 0) {
	if (!type) {
		const $ = cheerio.load(response.data);
		const contextElement = $('#lentille-context');
		if (!contextElement.length) throw new Error("Context not found.");
		const dataObj = JSON.parse(contextElement.text().trim());
		return dataObj.data?.article;
	}
	else return response.data?.currentData?.paste;
}

export async function upsertUser(userData) {
	if (!userData || !userData.uid) return;
	const { uid, name, color } = userData;
	
	const user = await User.findById(uid);
	user.name = name;
	user.color = color;
	await user.save();
}

function getResponseUser(response) {
	const author = response.author || response.user || {};
	return {
		uid: parseInt(author.uid),
		name: author.name,
		color: author.color
	};
}

export async function sendContentRequest(url, headers = defaultHeaders, type = 0) {
	try {
		const startTime = Date.now();
		let response = await axios.get(url + "?_contentOnly=1", headers);
		if (type) response = await c3vk(response, url, headers);
		const obj = getResponseObject(response, type);
		if (!obj) throw new Error("Invalid response structure.");
		const max_length = 524288;
		let content = obj.content || obj.data;
		if (Buffer.byteLength(content, 'utf8') > max_length) {
			const buf = Buffer.from(content, 'utf8');
			let end = max_length;
			while (end > 0 && (buf[end] & 0b11000000) === 0b10000000) end--;
			content = buf.toString('utf8', 0, end) + '\n\n**WARNING:** 内容过长已截断';
		}
		obj.content = content;
		try {
			obj.userData = getResponseUser(obj);
			await upsertUser(obj.userData);
		} catch (ignore) {
			logger.warn(`Failed to upsert user when requesting ${url}`);
		}
		const endTime = Date.now();
		logger.debug(`Content fetched from ${url.split('?')[0]} in ${endTime - startTime}ms`);
		return utils.makeResponse(true, obj);
	}
	catch(error) {
		logger.warn(`Error fetching content from ${url.split('?')[0]}: ${error.message}`);
		return utils.makeResponse(false, { message: error.message });
	}
}

export function processQueue() {
	setInterval(async() => {
		if (queue.length && requestPoint && running < process.env.CONCURRENCY_LIMIT) {
			requestPoint--;
			await processTask();
		}
	}, 200);
}

export function requestPointTick() {
	setInterval(() => {
		if (requestPoint >= process.env.INITIAL_REQ_POINT) return;
		requestPoint = requestPoint + 1
		logger.debug(`One request point has been restored. Now point: ${requestPoint}`);
	}, 1000);
}

export function getQueuePosition(id) {
	for (let i = 0; i < queue.length; i++) {
		if (queue[i].id === id) {
			return i + 1;
		}
	}
	return -1;
}

export async function restoreQueue() {
	const tasks = await Task.createQueryBuilder("t").where("t.status = 0 OR t.status = 1").orderBy("t.id", "ASC").getMany();
	for (const task of tasks) {
		if (task.status === 0) {
			queue.push({
				id: task.id,
				url: `https://www.luogu.com/${task.type === 0 ? 'article' : 'paste'}/${task.oid}`,
				headers: defaultHeaders,
				aid: task.oid,
				type: task.type
			});
			logger.debug(`Task #${task.id} restored to queue.`);
		} else if (task.status === 1) {
			await updateTask(task.id, 3, "The server was restarted while processing this task. Please try again.");
			logger.debug(`Task #${task.id} was being processed during shutdown. Marked as failed.`);
		}
	}
}

export async function pushQueue(task) {
	if (queue.length > process.env.QUEUE_MAX_LENGTH)
		throw new Error('The queue is full. Please try again later.');
	task.id = await createTask(task);
	logger.debug(`Task #${task.id} queued.`);
	queue.push(task);
	return task.id;
}

export const defaultHeaders = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
};
