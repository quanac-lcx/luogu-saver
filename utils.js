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