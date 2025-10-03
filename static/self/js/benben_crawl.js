// 添加回车键支持
document.addEventListener('DOMContentLoaded', () => {
	const uidInput = document.getElementById('uid-input');
	uidInput.addEventListener('keypress', (event) => {
		if (event.key === 'Enter') {
			performCrawl();
		}
	});
});

function performCrawl() {
	const uid = document.getElementById('uid-input').value.trim();
	if (!uid) {
		Swal.fire('提示', '请输入用户 UID', 'info');
		return;
	}
	
	if (!/^\d+$/.test(uid)) {
		Swal.fire('错误', 'UID 必须是数字', 'error');
		return;
	}
	
	// 显示确认对话框
	Swal.fire({
		title: '确认抓取',
		text: `确定要抓取用户 ${uid} 的犇犇吗？`,
		icon: 'question',
		showCancelButton: true,
		confirmButtonText: '确定',
		cancelButtonText: '取消'
	}).then((result) => {
		if (result.isConfirmed) {
			executeCrawl(uid);
		}
	});
}

function executeCrawl(uid) {
	// 显示加载中
	Swal.fire({
		title: '正在提交...',
		allowOutsideClick: false,
		didOpen: () => {
			Swal.showLoading();
		}
	});
	
	fetch(`/benben/save/${uid}`)
		.then(response => response.json())
		.then(data => {
			if (data.success) {
				const tid = data.result;
				Swal.fire({
					title: '请求已入队',
					text: '您的请求已加入队列，任务 ID: ' + tid,
					icon: 'success',
					confirmButtonText: '查看进度',
					showCancelButton: true,
					cancelButtonText: '继续抓取'
				}).then((result) => {
					if (result.isConfirmed) {
						window.location.href = '/task/' + encodeURIComponent(tid);
					} else {
						// 清空输入框
						document.getElementById('uid-input').value = '';
					}
				});
			} else {
				Swal.fire({
					title: '失败',
					text: data.message || '提交失败，请稍后重试',
					icon: 'error',
					confirmButtonText: '确定'
				});
			}
		})
		.catch(error => {
			console.error('Crawl error:', error);
			Swal.fire({
				title: '错误',
				text: '网络错误或请求失败，请稍后再试',
				icon: 'error',
				confirmButtonText: '确定'
			});
		});
}
