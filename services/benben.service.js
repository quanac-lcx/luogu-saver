/**
 * 犇犇服务模块
 *
 * 该模块提供犇犇（动态消息）相关的服务功能。
 *
 * @author Ark-Aak
 */
import { fetchContent } from "../core/request.js";
import { withCache } from "../core/cache.js";
import { benbenCallbacks } from "../core/storage.js";
import config from "../config.js";
import { formatDate, makeApiUrl, sanitizeLatex } from "../core/utils.js";
import { createMarkdownRenderer } from "../core/markdown.js";

const renderer = createMarkdownRenderer();

export async function getStatistics() {
	return withCache({
		cacheKey: 'benben:statistics',
		ttl: 1200, // 显然这是给 API 的不可靠性预留的，五分钟我会请求一次
		fetchFn: async () => {
			const url = makeApiUrl('/statistics');
			const { resp } = await fetchContent(url, null, { c3vk: "none" })
			const { data } = resp;
			return data;
		}
	});
}

export function subscribeTask(uid, callback) {
	const request = { '+': { 'id': parseInt(uid) } };
	listener.subscribe.send(JSON.stringify(request));
	logger.debug(`已订阅犇站任务: ${uid}`);
	benbenCallbacks.set(uid, callback);
}

function formatData(item) {
	item.grab_time = formatDate(new Date(item.grabTime));
	item.grabTime = undefined;
	item.send_time = formatDate(new Date(item.time));
	item.time = undefined;
	item.user_color = item.userColor;
	item.userColor = undefined;
	item.user_id = item.userId;
	item.userId = undefined;
	item.user_name = item.username;
	item.username = undefined;
	// Render markdown content
	const sanitizedContent = sanitizeLatex(item.content || '');
	item.rendered_content = renderer.renderMarkdown(sanitizedContent);
	return item;
}

export async function getAt(username) {
	const url = makeApiUrl('/tools/at/' + username);
	const { resp } = await fetchContent(url, null, { c3vk: "none" });
	let { data } = resp;
	data = data.map(formatData);
	return data;
}

export async function searchById(uid, { page, per_page }) {
	const params = new URLSearchParams();
	if (page) params.append('page', page);
	else params.append('page', '1');
	if (per_page) params.append('per_page', per_page);
	else params.append('per_page', '50');
	const url = makeApiUrl('/blackHistory/feed/' + uid + '?' + params.toString());
	const { resp } = await fetchContent(url, null, { c3vk: "none" });
	let { data } = resp;
	data = data.feeds.map(formatData);
	return { count: resp.data.count, data };
}