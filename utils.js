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
