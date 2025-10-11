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
	handleTaskRequest(`/benben/save/${uid}`, {
		loadingTitle: '正在提交...',
		successTitle: '请求已入队',
		errorTitle: '失败',
		onSuccess: () => {
			// 清空输入框
			document.getElementById('uid-input').value = '';
		}
	});
}
