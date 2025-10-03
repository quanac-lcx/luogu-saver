/**
 * Mobile device detection middleware
 * Detects if the user is accessing from a mobile device
 * and makes the information available to templates
 */

const mobileRegex = /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i;

export default function mobileDetect(req, res, next) {
	const userAgent = req.headers['user-agent'] || '';
	const isMobile = mobileRegex.test(userAgent);
	
	req.isMobile = isMobile;
	res.locals.isMobile = isMobile;
	
	next();
}
