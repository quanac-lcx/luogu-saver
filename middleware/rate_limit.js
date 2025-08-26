import logger from '../logger.js';
import 'dotenv/config';
import {formatDate, makeStandardResponse} from "../utils.js";

let bannedIPs = {};
let requestHistory = {};

const filterIPs = (req, res, next) => {
	const now = Date.now();
	if (bannedIPs[req.ip] && now > bannedIPs[req.ip]) {
		delete bannedIPs[req.ip];
	}
	if (req.path.startsWith('/article/save') || req.path.startsWith('/paste/save')) {
		if (!requestHistory[req.ip]) {
			requestHistory[req.ip] = [];
		}
		requestHistory[req.ip] = requestHistory[req.ip].filter(ts => now - ts < 60000);
		if (bannedIPs[req.ip] || requestHistory[req.ip].length >= process.env.RATE_LIMIT) {
			if (!bannedIPs[req.ip]) {
				bannedIPs[req.ip] = now + parseInt(process.env.BAN_DURATION);
				logger.warn(`IP ${req.ip} is banned until ${formatDate(new Date(bannedIPs[req.ip]))}`);
			}
			const pardonTime = formatDate(new Date(bannedIPs[req.ip]));
			res.json(makeStandardResponse(false, { message: "Your IP address is blocked until " + pardonTime + "." }));
			return;
		}
		requestHistory[req.ip].push(now);
	}
	next();
}

export { filterIPs };