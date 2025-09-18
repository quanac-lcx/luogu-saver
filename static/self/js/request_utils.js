document.addEventListener("DOMContentLoaded", () => {
	document.getElementById("search-btn")?.addEventListener("click", () => {
		const q = document.getElementById("search-input").value.trim();
		if (q) {
			window.location.href = "/search?q=" + encodeURIComponent(q);
		}
	});
	
	document.getElementById("save-btn")?.addEventListener("click", async () => {
		let url = document.getElementById("url").value.trim();
		if (!url) return;
		
		try {
			if (url.length < 14) throw new Error("非法链接，请检查输入。");
			const tail = url.slice(-14);
			const tailMatch = tail.match(/^(paste|ticle)\/([a-zA-Z0-9]{8})$/);
			if (!tailMatch) throw new Error("非法链接，请检查输入。");
			
			const type = tailMatch[1] === "ticle" ? "article" : "paste";
			const id = tailMatch[2];
			if (type !== "article" && type !== "paste") throw new Error("非法链接，请检查输入。");
			
			const response = await fetch(`/${type}/save/` + encodeURIComponent(id));
			
			if (response.status === 429) {
				// 从 Retry-After 读取秒数
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
			
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			
			const data = await response.json();
			if (!data.success) throw new Error(data.message || "保存请求失败");
			
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
				text: "网络错误或请求过于频繁，请稍后再试",
				icon: "error",
				confirmButtonText: "确定"
			});
		}
	});
	
	document.getElementById("view-btn")?.addEventListener("click", () => {
		let url = document.getElementById("url").value.trim();
		if (!url) return;
		
		try {
			if (url.length < 14) throw new Error("非法链接，请检查输入。");
			const tail = url.slice(-14);
			const tailMatch = tail.match(/^(paste|ticle)\/([a-zA-Z0-9]{8})$/);
			if (!tailMatch) throw new Error("非法链接，请检查输入。");
			
			const type = tailMatch[1] === "ticle" ? "article" : "paste";
			const id = tailMatch[2];
			if (type !== "article" && type !== "paste") throw new Error("非法链接，请检查输入。");
			
			window.location.href = `/${type}/` + encodeURIComponent(id);
		} catch (err) {
			console.error(err);
			Swal.fire({
				title: "跳转失败",
				text: err.message || "无法跳转到内容，请稍后再试。",
				icon: "error",
				confirmButtonText: "确定"
			});
		}
	});
});
