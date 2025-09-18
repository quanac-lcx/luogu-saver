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
import Problem from "./models/problem.js";
import fs from "fs";
import { In } from "typeorm";

let queue = [];
let requestPoint = process.env.INITIAL_REQ_POINT;
let running = 0;
const accountPool = JSON.parse(fs.readFileSync("./accounts.json", "utf8"));

export const defaultHeaders = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
};

function hashContent(content) {
	return createHash('sha256').update(content, 'utf8').digest('hex');
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
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
					running--;
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
			const latestVersion = await ArticleVersion.getLatestVersion(aid);
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

export async function c3vkOld(response, url, headers = defaultHeaders) {
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

export async function c3vkNew(response, url, headers = defaultHeaders) {
	const setCookie = response.headers['set-cookie'];
	if (setCookie) {
		// 保留原有的
		const existingCookies = headers.Cookie ? headers.Cookie.split('; ').reduce((acc, cur) => {
			const [k, v] = cur.split('=');
			acc[k] = v;
			return acc;
		}, {}) : {};
		setCookie.forEach(cookieStr => {
			const [cookiePair] = cookieStr.split(';');
			const [k, v] = cookiePair.split('=');
			existingCookies[k] = v;
		});
		headers.Cookie = Object.entries(existingCookies).map(([k, v]) => `${k}=${v}`).join('; ');
		// logger.debug(`Updated cookies for ${url.split('?')[0]}: ${headers.Cookie}`);
	}
	response = await axios.get(url, { headers });
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
	
	const user = (await User.findById(uid)) || User.create({ id: uid });
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
		let response = await axios.get(url + "?_contentOnly=1", { headers });
		if (type) response = await c3vkOld(response, url, headers);
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
		} catch (error) {
			logger.warn('An error occurred when upserting user data: ' + error.message);
		}
		const endTime = Date.now();
		logger.debug(`Content fetched from ${url.split('?')[0]} in ${endTime - startTime}ms`);
		return utils.makeResponse(true, obj);
	}
	catch(error) {
		logger.warn(`Error fetching content from ${url.split('?')[0]}: ${error.message}`);
		
		if (error.response && error.response.status === 451) {
			const errorMsg = "HTTP ERROR 451: Unavailable For Legal Reasons - This content is not available in your region.";
			return utils.makeResponse(false, { message: errorMsg });
		}
		
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

async function saveProblems(problems) {
	logger.debug(`Start to save ${problems.length} problems to database (bulk upsert).`);
	if (!problems.length) return;
	
	try {
		await Problem.upsert(problems.map(p => ({
				id: p.id,
				difficulty: p.difficulty,
				accept_solution: p.accept_solution,
				solution_count: p.solution_count,
				title: p.title,
				updated_at: Date.now()
			})), ["id"], { skipUpdateIfNoValuesChanged: true });
		
		logger.debug(`Bulk upsert completed: ${problems.length} problems processed.`);
	} catch (error) {
		logger.warn(`An error occurred when saving problems: ${error.message}`);
	}
}

const newFrontendConfig = {
	headers: defaultHeaders,
	maxRedirects: 0,
	validateStatus: () => true
};

async function debugRedirects(url, headers = {}) {
	let currentUrl = url;
	let depth = 0;
	
	while (depth < 20) {
		const res = await axios.get(currentUrl, newFrontendConfig);
		
		const setCookie = res.headers['set-cookie'];
		if (setCookie) {
			headers['Cookie'] = setCookie.map(c => c.split(';')[0]).join('; ');
		}
		
		logger.debug(`[${depth}] ${currentUrl} -> ${res.status}`);
		
		if (res.status >= 300 && res.status < 400 && res.headers.location) {
			const next = new URL(res.headers.location, currentUrl).toString();
			logger.debug(`    Redirect to: ${next}`);
			currentUrl = next;
			depth++;
		} else {
			logger.debug(`Final response at ${currentUrl}, status=${res.status}`);
			break;
		}
	}
}

async function fetchProblemPage(page, type, retry = 0) {
	logger.debug(`Fetching problem list, page ${page}, type ${type}`);
	if (retry >= 3) {
		logger.warn(`Max retries reached for fetching problem list page ${page}, type ${type}. Returning empty list.`);
		return [];
	}
	if (retry > 0) await sleep(1000 * retry);
	try {
		// await sleep(2000);
		const url = `https://www.luogu.com.cn/problem/list?type=${type}&page=${page}`;
		const html = (await c3vkNew(await axios.get(url, newFrontendConfig), url)).data;
		const $ = cheerio.load(html);
		const jsonStr = $("#lentille-context").html();
		const json = JSON.parse(jsonStr);
		return json.data.problems.result.map(i => ({
			id: i.pid,
			difficulty: i.difficulty,
			title: i.title
		}));
	} catch (e) {
		logger.warn(`Error fetching problem list page ${page}, type ${type} (attempt ${retry + 1}): ${e}`);
		return fetchProblemPage(page, type, retry + 1);
	}
}

async function fetchProblemTotal(type, retry = 0) {
	logger.debug(`Fetching total pages for type ${type}`);
	if (retry >= 3) {
		logger.warn(`Max retries reached for fetching total pages of type ${type}. Returning 0.`);
		return 0;
	}
	if (retry > 0) await sleep(1000 * retry);
	try {
		const url = `https://www.luogu.com.cn/problem/list?type=${type}&page=1`;
		const html = (await c3vkNew(await axios.get(url, newFrontendConfig), url)).data;
		const $ = cheerio.load(html);
		const jsonStr = $("#lentille-context").html();
		const json = JSON.parse(jsonStr);
		const total = json.data.problems.count;
		return Math.ceil(total / 50);
	} catch (e) {
		logger.warn(`Error fetching total pages for type ${type} (attempt ${retry + 1}): ${e}`);
		return fetchProblemTotal(type, retry + 1);
	}
}

async function fetchProblemSolution(pid, retry = 0) {
	logger.debug(`Fetching solution info for problem ${pid}`);
	if (retry >= 3) {
		logger.warn(`Max retries reached for problem ${pid}. Returning default values.`);
		return { accept_solution: false, solution_count: 0 };
	}
	if (retry > 0) await sleep(1000 * retry);
	try {
		// await sleep(2000);
		const url = `https://www.luogu.com.cn/problem/solution/${pid}`;
		const cookieStr = Object.entries(accountPool[Math.floor(Math.random() * accountPool.length)])
			.map(([k, v]) => `${k}=${v}`).join("; ");
		const html = (
			await c3vkNew(await axios.get(url, {
				...newFrontendConfig,
				headers: { ...defaultHeaders, Cookie: cookieStr },
				withCredentials: true
			}), url, { ...defaultHeaders, Cookie: cookieStr })
		).data;
		const $ = cheerio.load(html);
		const jsonStr = $("#lentille-context").html();
		const json = JSON.parse(jsonStr);
		return {
			accept_solution: Boolean(json.data.acceptSolution),
			solution_count: json.data.solutions ? parseInt(json.data.solutions.count) : 0
		};
	} catch (e) {
		logger.warn(`Error fetching solution for problem ${pid} (attempt ${retry + 1}): ${e}`);
		return fetchProblemSolution(pid, retry + 1);
	}
}

async function fetchProblemSet(type) {
	logger.debug(`Start fetching problem set, type: ${type}`);
	const total = await fetchProblemTotal(type);
	
	for (let page = 1; page <= total; page++) {
		const problems = await fetchProblemPage(page, type);
		logger.debug(`Page ${page} fetched, ${problems.length} problems.`);
		
		const ids = problems.map(p => p.id);
		const existing = await Problem。find({
			where: { id: In(ids) }，
			select: ["id"， "updated_at"]，
		});
		
		const existingMap = new Map(existing。map(e => [e.id， e]));
		
		const allProblems = [];
		
		for (let i = 0; i < problems.length; i += 1) {
			const chunk = problems。slice(i， i + 1);
			const results = await Promise。全部(
				chunk.map(async (p) => {
					const dbProblem = existingMap.get(p。id);
					const 当前 = Date.当前();
					if (dbProblem && 当前 - new Date(dbProblem.updated_at).getTime() < 18 * 60 * 60 * 1000) {
						return null;
					}
					try {
						const result = await fetchProblemSolution(p.id);
						p。accept_solution = result。accept_solution;
						p.solution_count = result.solution_count;
						return p;
					} catch (err) {
						logger.warn(`An error occurred while fetching solution for problem ${p.id}: ${err.message}`);
						return p;
					}
				})
			);
			allProblems.push(...results.filter(Boolean));
		}
		if (allProblems。length > 0) {
			await saveProblems(allProblems);
			logger。debug(`Page ${page} processed, ${allProblems。length} problems updated.`);
		}
		else {
			logger.debug(`Page ${page} processed, no problems needed update.`);
		}
		await sleep(500); // QPS = 2 req/s
	}
	
	logger.debug(`Finished fetching type ${type}`);
}

export async function runProblemUpdater() {
	try {
		logger.debug("Starting scheduled solution update...");
		await fetchProblemSet("luogu");
		await fetchProblemSet("CF");
		await fetchProblemSet("SP");
		await fetchProblemSet("UVA");
		await fetchProblemSet("AT");
		logger.debug("Scheduled update completed successfully.");
	} catch (e) {
		logger.warn("An error occurred during the scheduled update: " + e.message);
	}
}
