document.addEventListener('DOMContentLoaded', function() {
	document.getElementById('request-deletion-btn')?.addEventListener('click', async function () {
		console.log("?");
		const urlElement = document.getElementById("url");
		let url = urlElement.value.trim();
		const result = await Swal.fire({
			title: '申请删除文章',
			html: `
                    <p style="margin-bottom: 15px; text-align: left;">请说明您申请删除此文章的理由：</p>
                    <textarea id="deletion-reason" class="swal2-textarea" placeholder="请输入删除理由（至少15个字符）" style="width: 80%; height: 120px; resize: vertical;"></textarea>
                    <p style="margin-top: 10px; color: #666; font-size: 0.9em; text-align: left;">提交后将由管理员审核，审核通过后文章将被删除。</p>
				<div class="ui icon red message" style="font-size:13px; line-height:1.45;" id="warning-msg">
						<i class="icon exclamation triangle"></i>
						<div class="content">
						   <div class="header" style="font-size:14px; font-weight:700;">
							   温馨提示
						   </div>
						   <div style="font-size:13px; color:#444;">
							   提交申请前，请仔细阅读我们的<a href="https://help.luogu.me/docs/license/deletion" target="_blank">数据移除政策</a>。多次提交无意义申请可能会受到处罚
						   </div>
					</div>
                <p>
                </p>
            </div>
                `,
			icon: 'warning',
			showCancelButton: true,
			confirmButtonText: '提交申请',
			cancelButtonText: '取消',
			confirmButtonColor: '#dc3545',
			didOpen: () => {
				const warningMsg = document.getElementById('warning-msg');
				if (warningMsg) {
					const colorClass = ['purple', 'orange', 'red' , 'yellow', 'teal', 'blue', 'violet', 'pink', 'brown', 'grey' , 'black' , 'white'];
					let nxtColor = 0;
					setInterval(() => {
						colorClass.forEach(color => {
							warningMsg.classList.remove(color);
						});
						warningMsg.classList.add(colorClass[nxtColor]);
						nxtColor = (nxtColor + 1) % colorClass.length;
					}, 600); // 每隔 600 ms 切换一次
				}
			},
			preConfirm: () => {
				const reason = document.getElementById('deletion-reason').value;
				if (!reason || reason.trim().length < 15) {
					Swal.showValidationMessage('删除理由至少需要15个字符');
					return false;
				}
				return reason.trim();
			}
		});
		
		if (result.isConfirmed) {
			const reason = result.value;
			
			try {
				Swal.fire({
					title: '正在提交...',
					allowOutsideClick: false,
					didOpen: () => {
						Swal.showLoading();
					}
				});

				const { type, id } = parseUrl(url);
				const response = await fetch(`/api/deletion/${type}/${id}`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ reason })
				});
				
				const data = await response.json();
				
				if (data.success) {
					Swal.fire({
						title: '提交成功',
						text: data.message || '删除申请已提交，请等待管理员审核',
						icon: 'success',
						confirmButtonText: '确定'
					});
				} else {
					Swal.fire({
						title: '提交失败',
						text: data.message || '提交删除申请失败，请稍后再试',
						icon: 'error',
						confirmButtonText: '确定'
					});
				}
			} catch (err) {
				console.error(err);
				Swal.fire({
					title: '提交失败',
					text: '网络错误或服务器异常，请稍后再试',
					icon: 'error',
					confirmButtonText: '确定'
				});
			}
		}
	});
});