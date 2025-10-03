function handleKeyPress(event) {
	if (event.key === 'Enter') {
		performSearch();
	}
}

function performSearch() {
	const username = document.getElementById('username-input').value.trim();
	if (!username) {
		Swal.fire('提示', '请输入用户名', 'info');
		return;
	}
	
	executeSearch(username);
}

function executeSearch(username) {
	const resultsSection = document.getElementById('search-results');
	const resultsContent = document.getElementById('results-content');
	
	resultsSection.style.display = 'block';
	resultsContent.innerHTML = `
        <div class="ui active centered inline loader"></div>
    `;
	
	fetch(`/benben/api/at/${encodeURIComponent(username)}`)
		.then(response => response.json())
		.then(data => {
			if (data.success) {
				renderResults(data.data);
			} else {
				showError(data.message || '查询失败，请稍后重试');
			}
		})
		.catch(error => {
			console.error('Search error:', error);
			showError('网络错误或请求失败，请稍后再试。');
		});
}

function renderResults(results) {
	const container = document.getElementById('results-content');
	
	if (results.length === 0) {
		container.innerHTML = `
            <div class="ui icon message">
                <i class="search icon"></i>
                <div class="content">
                    <div class="header">没有找到相关结果</div>
                    <p>该用户没有被 at 的记录</p>
                </div>
            </div>
        `;
		return;
	}
	
	let html = '';
	results.forEach(item => {
		html += `
            <div class="benben-item">
                <div class="benben-meta firacode">
                    <span><i class="fa fa-hashtag"></i> ${item.id}</span>
                    <span><i class="fa fa-user"></i> UID: ${item.user_id}</span>
                    <span><i class="fa fa-clock"></i> 发送时间: ${item.send_time}</span>
                    <span><i class="fa fa-download"></i> 抓取时间: ${item.grab_time}</span>
                </div>
                <div class="benben-content">
                    ${escapeHtml(item.content)}
                </div>
            </div>
        `;
	});
	
	container.innerHTML = html;
}

function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

function showError(message) {
	const resultsContent = document.getElementById('results-content');
	resultsContent.innerHTML = `
        <div class="ui negative message">
            <i class="exclamation triangle icon"></i>
            ${message}
        </div>
    `;
}
