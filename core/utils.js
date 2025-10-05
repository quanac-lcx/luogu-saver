import { createHash } from 'crypto';
import config from "../config.js";

export function formatDate(date, format = "YYYY-MM-DD HH:mm:ss") {
	const padZero = (num) => (num < 10 ? "0" + num : num);
	
	const map = {
		YYYY: date.getFullYear(),
		MM: padZero(date.getMonth() + 1),
		DD: padZero(date.getDate()),
		HH: padZero(date.getHours()),
		mm: padZero(date.getMinutes()),
		ss: padZero(date.getSeconds())
	};
	
	return format.replace(/YYYY|MM|DD|HH|mm|ss/g, (matched) => map[matched]);
}

export function makeResponse(success, data) {
	return { success, ...data };
}

export function generateRandomString(length = 8) {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return result;
}

export function truncateUtf8(content, maxBytes = 524288) {
	if (!content) return '';
	const buf = Buffer.from(String(content), 'utf8');
	if (buf.length <= maxBytes) return String(content);
	let end = maxBytes;
	while (end > 0 && (buf[end] & 0b11000000) === 0b10000000) end--;
	return buf.toString('utf8', 0, end) + '\n\n**WARNING:** 内容过长已截断';
}

export function hashContent(content) {
	return createHash('sha256').update(content, 'utf8').digest('hex');
}

export function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function sanitizeLatex(src) {
	return src.replace(/\$\$([\s\S]*?)\$\$|\$([^\$]+)\$/g, (match, block, inline) => {
		const content = block ?? inline;
		if (/\\rule\s*{[^}]*(em|px)\s*}{[^}]*(em|px)}/.test(content))
			return inline ?
				'$\\color{red}\\text{\\textbackslash rule haven\'t supported yet.}$' :
				'$$\\color{red}\\text{\\textbackslash rule haven\'t supported yet.}$$';
		return match;
	});
}

export function makeApiUrl(path) {
	return config.service.api_url.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

export const JUDGEMENT_PERMISSIONS = [
	{ id: 1, name: "登录鉴权" },
	{ id: 2, name: "进入主站" },
	{ id: 4, name: "进入后台" },
	{ id: 8, name: "题目管理" },
	{ id: 16, name: "团队管理" },
	{ id: 32, name: "比赛管理" },
	{ id: 64, name: "秩序管理" },
	{ id: 128, name: "百科管理" },
	{ id: 256, name: "用户管理" },
	{ id: 512, name: "博客管理" },
	{ id: 32768, name: "自由发言" },
	{ id: 65536, name: "发送私信" },
	{ id: 131072, name: "使用专栏" },
	{ id: 524288, name: "使用图床" },
	{ id: 1073741824, name: "超级用户" },
];
// quanac-lcx 注：JUDGEMENT_PERMISSIONS 部分参考了 lglg.top 的代码。

export function getPermissionNames(permission) {
	return JUDGEMENT_PERMISSIONS.filter(
		(perm) => (perm.id & permission) === perm.id
	).map((perm) => perm.name);
}

