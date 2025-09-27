import axios from 'axios';
import config from "../config.js";

export const defaultHeaders = config.requestHeader;

export const frontendFetchConfig = {
	maxRedirects: 0,
	validateStatus: () => true,
	timeout: 30000
};



export function mergeSetCookieToHeaders(response, headers) {
	const setCookie = response.headers && response.headers['set-cookie'];
	if (!setCookie) return;
	const existingCookies = headers.Cookie ? headers.Cookie.split('; ').reduce((acc, cur) => { const [k,v] = cur.split('='); acc[k]=v; return acc; }, {}) : {};
	setCookie.forEach(cookieStr => {
		const [cookiePair] = cookieStr.split(';');
		const [k,v] = cookiePair.split('=');
		existingCookies[k] = v;
	});
	headers.Cookie = Object.entries(existingCookies).map(([k,v]) => `${k}=${v}`).join('; ');
}

export async function fetchContent(url, headers = {}, { c3vk = "new", timeout = 30000 } = {}) {
	logger.debug(`Fetching URL: ${url} with c3vk mode: ${c3vk}`);
	const h = { ...defaultHeaders, ...headers };
	let resp = await axios.get(url + '?_contentOnly=1', {
		...frontendFetchConfig,
		headers: h,
		timeout
	});
	if (c3vk === "legacy") resp = await handleLegacyC3VK(resp, url, h, timeout);
	mergeSetCookieToHeaders(resp, h);
	if (c3vk === "new" && resp.status === 302 && resp.headers.location) {
		mergeSetCookieToHeaders(resp, h);
		resp = await axios.get(url, {
			...frontendFetchConfig,
			headers: h,
			timeout
		});
	}
	logger.debug(`Fetched URL: ${url} with status: ${resp.status}`);
	return { resp, headers: h };
}

export async function handleLegacyC3VK(response, url, headers, timeout = 30000) {
	if (typeof response.data === 'string') {
		const m = (response.data).match(/C3VK=([a-zA-Z0-9]+);/);
		if (m) {
			const c3vk = m[1];
			return await axios.get(url, {
				headers: { ...headers, Cookie: `C3VK=${c3vk}` },
				timeout
			});
		}
	}
	return response;
}

export async function debugRedirects(url, headers = {}, timeout = 30000) {
	let currentUrl = url;
	let depth = 0;
	while (depth < 20) {
		const res = await axios.get(currentUrl, {
			...frontendFetchConfig,
			timeout
		});
		if (res.headers && res.headers['set-cookie']) {
			headers['Cookie'] = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
		}
		if (res.status >= 300 && res.status < 400 && res.headers.location) {
			currentUrl = new URL(res.headers.location, currentUrl).toString();
			depth++;
		} else {
			break;
		}
	}
}