import * as cheerio from 'cheerio';
import fs from "fs";
import { In } from "typeorm";
import { Like } from "typeorm";

import Problem from "../models/problem.js";
import { fetchContent, defaultHeaders } from "../core/request.js";
import config from "../config.js";
import { sleep } from "../core/utils.js";

const accountPool = JSON.parse(fs.readFileSync("./accounts.json", "utf8"));

let isUpdatingAllProblemSets = false;

async function saveProblems(problems) {
	if (!problems.length) return;
	
	try {
		await Problem.upsert(problems.map(p => ({
			id: p.id,
			difficulty: p.difficulty,
			accept_solution: p.accept_solution,
			solution_count: p.solution_count,
			title: p.title,
			updated_at: new Date()
		})), ["id"], { skipUpdateIfNoValuesChanged: true });
		logger.debug(`Bulk upsert completed: ${problems.length} problems processed.`);
	} catch (error) {
		logger.warn(`Error saving problems: ${error.message}`);
	}
}

async function fetchProblemPage(page, type, retry = 0) {
	if (retry >= 3) return [];
	
	if (retry > 0) await utils.sleep(1000 * retry);
	try {
		const url = `https://www.luogu.com.cn/problem/list?type=${type}&page=${page}`;
		const html = (await fetchContent(url, defaultHeaders, { c3vk: "new" })).resp.data;
		const $ = cheerio.load(html);
		const json = JSON.parse($("#lentille-context").html());
		logger.debug(`Fetched problem page ${page} of type ${type}, ${json.data.problems.result.length} problems found.`);
		return json.data.problems.result.map(i => ({
			id: i.pid,
			difficulty: i.difficulty,
			title: i.title
		}));
	} catch (e) {
		logger.debug(`Error fetching problem page ${page} of type ${type} (attempt ${retry + 1}): ${e.message}`);
		return fetchProblemPage(page, type, retry + 1);
	}
}

async function fetchProblemTotal(type, retry = 0) {
	if (retry >= 3) return 0;
	
	if (retry > 0) await utils.sleep(1000 * retry);
	try {
		const url = `https://www.luogu.com.cn/problem/list?type=${type}&page=1`;
		const html = (await fetchContent(url, defaultHeaders, { c3vk: "new" })).resp.data;
		const json = JSON.parse(cheerio.load(html)("#lentille-context").html());
		const total = json.data.problems.count;
		logger.debug(`Total problems of type ${type}: ${total}`);
		return Math.ceil(total / 50);
	} catch (e) {
		logger.debug(`Error fetching total problem pages of type ${type} (attempt ${retry + 1}): ${e.message}`);
		return fetchProblemTotal(type, retry + 1);
	}
}

async function fetchProblemSolution(pid, retry = 0) {
	if (retry >= 3) return { accept_solution: false, solution_count: 0 };
	if (retry > 0) await sleep(1000 * retry);
	
	try {
		const url = `https://www.luogu.com.cn/problem/solution/${pid}`;
		const cookieStr = Object.entries(accountPool[Math.floor(Math.random() * accountPool.length)])
			.map(([k, v]) => `${k}=${v}`).join("; ");
		const html = (
			await fetchContent(url, {
				...defaultHeaders,
				Cookie: cookieStr
			}, { c3vk: "new" } )
		).resp.data;
		
		const json = JSON.parse(cheerio.load(html)("#lentille-context").html());
		return {
			accept_solution: Boolean(json.data.acceptSolution),
			solution_count: json.data.solutions ? parseInt(json.data.solutions.count) : 0
		};
	} catch (e) {
		logger.debug(`Error fetching solution for problem ${pid} (attempt ${retry + 1}): ${e.message}`);
		return fetchProblemSolution(pid, retry + 1);
	}
}

export async function updateProblemSet(type) {
	const total = await fetchProblemTotal(type);
	
	for (let page = 1; page <= total; page++) {
		const problems = await fetchProblemPage(page, type);
		
		const ids = problems.map(p => p.id);
		const existing = await Problem.find({ where: { id: In(ids) }, select: ["id", "updated_at"] });
		const existingMap = new Map(existing.map(e => [e.id, e]));
		
		const allProblems = [];
		
		for (let p of problems) {
			const dbProblem = existingMap.get(p.id);
			const now = Date.now();
			if (dbProblem && now - new Date(dbProblem.updated_at).getTime() < 18 * 60 * 60 * 1000) continue;
			
			try {
				const result = await fetchProblemSolution(p.id);
				p.accept_solution = result.accept_solution;
				p.solution_count = result.solution_count;
				allProblems.push(p);
			} catch (err) {
				allProblems.push(p);
			}
		}
		logger.debug(`Page ${page}/${total} of type ${type}: ${problems.length} problems fetched, ${allProblems.length} to update.`);
		if (allProblems.length > 0) await saveProblems(allProblems);
		await utils.sleep(500);
	}
}

export async function updateAllProblemSets() {
	if (isUpdatingAllProblemSets) {
		return;
	}
	try {
		const types = ["luogu", "CF", "SP", "UVA", "AT"];
		for (const type of types) {
			await updateProblemSet(type);
		}
	} finally {
		isUpdatingAllProblemSets = false;
	}
}

export async function getProblems({ page, accept_solution, difficulty, prefix }) {
	const perPage = config.pagination.problem;
	const currentPage = Math.max(parseInt(page) || 1, 1);
	const where = {};
	
	if (prefix) {
		where.id = Like(`${prefix}%`);
	}
	
	if (accept_solution === 'true') {
		where.accept_solution = true;
	} else if (accept_solution === 'false') {
		where.accept_solution = false;
	}
	
	if (difficulty !== undefined) {
		const diff = parseInt(difficulty);
		if (!isNaN(diff)) {
			where.difficulty = diff;
		}
	}
	
	const [problems, total] = await Promise.all([
		Problem.createQueryBuilder('p')
			.where(where)
			.orderBy('p.id', 'ASC')
			.skip((currentPage - 1) * perPage)
			.take(perPage)
			.getMany(),
		Problem.count({ where })
	]);
	
	problems.forEach(p => Object.setPrototypeOf(p, Problem.prototype));
	problems.forEach(p => p.formatDate());
	
	const pageCount = Math.ceil(total / perPage);
	
	return { problems, currentPage, pageCount, prefix };
}