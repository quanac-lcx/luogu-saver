require('dotenv').config();

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

module.exports = { filterIPs };