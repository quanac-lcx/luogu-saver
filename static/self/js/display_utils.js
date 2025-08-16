function rTS(str) {
	return str.endsWith('/') ? str.slice(0, -1) : str;
}

function setCookie(name, value, days) {
	const expires = new Date();
	expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
	document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
}

function getCookie(name) {
	const nameEQ = name + "=";
	const ca = document.cookie.split(';');
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) === ' ') c = c.substring(1, c.length);
		if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
	}
	return null;
}

function copyMarkdown() {
	let rawMarkdown = document.getElementById("markdown-content").value;
	navigator.clipboard.writeText(rawMarkdown).then(function() {
		Swal.fire({
			icon: 'success',
			title: 'Markdown 复制成功',
			text: '已将 Markdown 文本复制到剪贴板。'
		});
	}, function(err) {
		Swal.fire({
			icon: 'error',
			title: 'Markdown 复制失败',
			text: err.message || '未知错误，请联系管理员。'
		});
	});
}

function goToOriginal() {
	const article_id = rTS(window.location.href).split('/').pop();
	const originalUrl = 'https://www.luogu.com.cn/article/' + article_id;
	window.open(originalUrl, '_blank');
}