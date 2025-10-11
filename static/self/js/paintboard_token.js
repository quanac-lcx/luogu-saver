document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('apply-btn').addEventListener('click', applyToken);
	document.getElementById('refresh-btn').addEventListener('click', refreshToken);
	
	document.getElementById('copy-btn').addEventListener('click', () => {
		const token = document.getElementById('token-display').textContent;
		navigator.clipboard.writeText(token).then(() => {
			Swal.fire({
				title: '复制成功',
				text: ' AccessKey 已复制到剪贴板',
				icon: 'success',
				timer: 1500
			});
		}).catch(err => {
			Swal.fire('复制失败', '请手动复制 AccessKey ', 'error');
		});
	});
});

async function applyToken() {
	Swal.fire({
		title: '正在获取...',
		text: '请稍候',
		allowOutsideClick: false,
		didOpen: () => {
			Swal.showLoading();
		}
	});
	
	try {
		const response = await fetch('/paintboard/apply', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
		});
		
		const data = await response.json();
		
		if (response.ok && data.success) {
			Swal.close();
			document.getElementById('token-display').textContent = data.token;
			document.getElementById('result-section').style.display = 'block';
			
			Swal.fire({
				title: '成功',
				text: data.message,
				icon: 'success',
				timer: 2000,
				confirmButtonText: '确定'
			});
			
			document.getElementById('result-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		} else {
			Swal.fire({
				title: '获取失败',
				text: data.message || '获取 AccessKey 失败',
				icon: 'error',
				confirmButtonText: '确定'
			});
		}
	} catch (error) {
		console.error('Error:', error);
		Swal.fire({
			title: '网络错误',
			text: '请检查网络连接后重试',
			icon: 'error',
			confirmButtonText: '确定'
		});
	}
}

async function refreshToken() {
	const result = await Swal.fire({
		title: '确认刷新 AccessKey ？',
		text: '刷新后旧 AccessKey 将失效',
		icon: 'warning',
		showCancelButton: true,
		confirmButtonText: '确认刷新',
		cancelButtonText: '取消'
	});
	
	if (!result.isConfirmed) {
		return;
	}
	
	Swal.fire({
		title: '正在刷新...',
		text: '请稍候',
		allowOutsideClick: false,
		didOpen: () => {
			Swal.showLoading();
		}
	});
	
	try {
		const response = await fetch('/paintboard/refresh', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
		});
		
		const data = await response.json();
		
		if (response.ok && data.success) {
			Swal.close();
			document.getElementById('token-display').textContent = data.token;
			document.getElementById('result-section').style.display = 'block';
			
			Swal.fire({
				title: '刷新成功',
				text: '新 AccessKey 已生成，请于网页上查看',
				icon: 'success',
				confirmButtonText: '确定'
			});
			
			document.getElementById('result-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		} else {
			Swal.fire({
				title: '刷新失败',
				text: data.message || '刷新 AccessKey 失败',
				icon: 'error',
				confirmButtonText: '确定'
			});
		}
	} catch (error) {
		console.error('Error:', error);
		Swal.fire({
			title: '网络错误',
			text: '请检查网络连接后重试',
			icon: 'error',
			confirmButtonText: '确定'
		});
	}
}
