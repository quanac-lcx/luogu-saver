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

export function makeStandardResponse(success, data) {
	return { success, data };
}

export function generateRandomString(length = 8) {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return result;
}