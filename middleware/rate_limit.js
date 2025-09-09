import 'dotenv/config';

let bannedIPs = {};
let requestHistory = {};

const filterIPs = (req, res, next) => {
	const now = Date.now();
	if (bannedIPs[req.realIP] && now > bannedIPs[req.realIP]) {
		delete bannedIPs[req.realIP];
	}
	if (req.path.startsWith('/article/save') || req.path.startsWith('/paste/save')) {
		if (!requestHistory[req.realIP]) {
			requestHistory[req.realIP] = [];
		}
		requestHistory[req.realIP] = requestHistory[req.realIP].filter(ts => now - ts < 60000);
		if (bannedIPs[req.realIP] || requestHistory[req.realIP].length >= process.env.RATE_LIMIT) {
			if (!bannedIPs[req.realIP]) {
				bannedIPs[req.realIP] = now + parseInt(process.env.BAN_DURATION);
				logger.warn(`IP ${req.realIP} is banned until ${utils.formatDate(new Date(bannedIPs[req.realIP]))}`);
			}
			const pardonTime = utils.formatDate(new Date(bannedIPs[req.realIP]));
			res.json(utils.makeResponse(false, { message: "Your IP address is blocked until " + pardonTime + "." }));
			return;
		}
		requestHistory[req.realIP].push(now);
	}
	next();
}

export { filterIPs };