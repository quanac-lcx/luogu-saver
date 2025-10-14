document.addEventListener("DOMContentLoaded", () => {
	function parseUrl(url) {
		// Check for user profile: user/123456
		const userMatch = url.match(/\/user\/(\d+)$/);
		if (userMatch) {
			return { type: 'user', id: userMatch[1] };
		}
		
		// Check for article/paste: article/xxxxxxxx or paste/xxxxxxxx
		if (url.length < 14) throw new Error("非法链接，请检查输入。");
		const tail = url.slice(-14);
		const tailMatch = tail.match(/^(paste|ticle)\/([a-zA-Z0-9]{8})$/);
		if (!tailMatch) throw new Error("非法链接，请检查输入。");
		
		const type = tailMatch[1] === "ticle" ? "article" : "paste";
		const id = tailMatch[2];
		if (type !== "article" && type !== "paste") throw new Error("非法链接，请检查输入。");
		
		return { type, id };
	}

	document.getElementById("search-btn")?.addEventListener("click", () => {
		const q = document.getElementById("search-input").value.trim();
		if (q) {
			window.location.href = "/search?q=" + encodeURIComponent(q);
		}
	});
	
	document.getElementById("save-btn")?.addEventListener("click", async () => {
		let url = document.getElementById("url").value.trim();
		if (!url) {
			Swal.fire('提示', '请输入链接', 'info');
			return;
		}
		
		try {
			const { type, id } = parseUrl(url);
			
			const confirmResult = await Swal.fire({
				title: '确认保存',
				text: `确定要保存这个${type === 'article' ? '文章' : type === 'paste' ? '剪贴板' : '用户资料'}吗？`,
				icon: 'question',
				showCancelButton: true,
				confirmButtonText: '确定',
				cancelButtonText: '取消'
			});
			
			if (!confirmResult.isConfirmed) {
				return;
			}
			
			Swal.fire({
				title: '正在保存...',
				allowOutsideClick: false,
				didOpen: () => {
					Swal.showLoading();
				}
			});
			
			const response = await fetch(`/${type}/save/` + encodeURIComponent(id));
			
			if (response.status === 429) {
				const retryAfter = response.headers.get("Retry-After");
				const waitSec = retryAfter ? parseInt(retryAfter, 10) : null;
				Swal.fire({
					title: "请求过于频繁",
					text: waitSec
						? `请等待 ${waitSec} 秒后再试`
						: "请稍后再试",
					icon: "warning",
					confirmButtonText: "确定"
				});
				return;
			}
			
			const data = await response.json();
			if (!response.ok || !data.success) {
				throw new Error(data.message || `HTTP ${response.status}`);
			}
			
			const tid = data.result;
			Swal.fire({
				title: "请求已入队",
				text: "您的请求已加入队列，任务 ID: " + tid,
				icon: "success",
				confirmButtonText: "查看进度",
				showCancelButton: true,
				cancelButtonText: "继续保存",
			}).then((result) => {
				if (result.isConfirmed) {
					window.location.href = "/task/" + encodeURIComponent(tid);
				}
			});
		} catch (err) {
			console.error(err);
			Swal.fire({
				title: "保存失败",
				text: err.message || "网络错误或请求失败，请稍后再试",
				icon: "error",
				confirmButtonText: "确定"
			});
		}
	});
	
	document.getElementById("view-btn")?.addEventListener("click", () => {
		let url = document.getElementById("url").value.trim();
		if (!url) {
			Swal.fire('提示', '请输入链接', 'info');
			return;
		}
		
		try {
			const { type, id } = parseUrl(url);
			
			window.location.href = `/${type}/` + encodeURIComponent(id);
		} catch (err) {
			console.error(err);
			Swal.fire({
				title: "跳转失败",
				text: err.message || "无法跳转到内容，请稍后再试",
				icon: "error",
				confirmButtonText: "确定"
			});
		}
	});
});

async function handleTaskRequest(endpoint, options = {}) {
	const {
		loadingTitle = '正在提交...',
		successTitle = '请求已入队',
		errorTitle = '请求失败',
		onSuccess = null
	} = options;

	try {
		Swal.fire({
			title: loadingTitle,
			allowOutsideClick: false,
			didOpen: () => {
				Swal.showLoading();
			}
		});

		const response = await fetch(endpoint);

		if (response.status === 429) {
			const retryAfter = response.headers.get("Retry-After");
			const waitSec = retryAfter ? parseInt(retryAfter, 10) : null;
			Swal.fire({
				title: "请求过于频繁",
				text: waitSec ? `请等待 ${waitSec} 秒后再试` : "请稍后再试",
				icon: "warning",
				confirmButtonText: "确定"
			});
			return null;
		}

		const data = await response.json();
		if (!response.ok || !data.success) {
			throw new Error(data.message || `HTTP ${response.status}`);
		}

		const tid = data.result;
		const result = await Swal.fire({
			title: successTitle,
			text: "您的请求已加入队列，任务 ID: " + tid,
			icon: "success",
			confirmButtonText: "查看进度",
			showCancelButton: true,
			cancelButtonText: "继续操作",
		});

		if (result.isConfirmed) {
			window.location.href = "/task/" + encodeURIComponent(tid);
		}

		if (onSuccess) {
			onSuccess(tid, result);
		}

		return { tid, result };
	} catch (err) {
		console.error(err);
		Swal.fire({
			title: errorTitle,
			text: err.message || "网络错误或请求失败，请稍后再试",
			icon: "error",
			confirmButtonText: "确定"
		});
		return null;
	}
}

function showRateLimitError(retryAfter) {
	const waitSec = retryAfter ? parseInt(retryAfter, 10) : null;
	Swal.fire({
		title: "请求过于频繁",
		text: waitSec ? `请等待 ${waitSec} 秒后再试` : "请稍后再试",
		icon: "warning",
		confirmButtonText: "确定"
	});
}
