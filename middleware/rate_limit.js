import logger from '../logger.js';

let bannedIPs = {};
let requestHistory = {};

const filterIPs = (req, res, next) => {
	const now = Date.now();
	if (bannedIPs[req.ip] && now > bannedIPs[req.ip]) {
		delete bannedIPs[req.ip];
	}
	if (req.path.startsWith('/api/save/article/') || req.path.startsWith('/api/save/pastes/')) {
		if (!requestHistory[req.ip]) {
			requestHistory[req.ip] = [];
		}
		requestHistory[req.ip] = requestHistory[req.ip].filter(ts => now - ts < 60000);
		requestHistory[req.ip].push(now);
		if (bannedIPs[req.ip] || requestHistory[req.ip].length > process.env.RATE_LIMIT) {
			if (!bannedIPs[req.ip]) {
				bannedIPs[req.ip] = now + process.env.BAN_DURATION;
				logger.warn(`IP ${req.ip} is banned until ${new Date(bannedIPs[req.ip]).toLocaleString('zh-CN')}`);
			}
			const pardonTime = new Date(bannedIPs[req.ip]).toLocaleString('zh-CN');
			res.status(429).json({
				success: false,
				message: "Your IP address is blocked until" + pardonTime.toLocaleString() + "."
			});
			return;
		}
	}
	next();
}

export { filterIPs };