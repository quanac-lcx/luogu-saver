let currentPage = 1;
let currentUid = '';
let totalPages = 1;

function handleKeyPress(event) {
	if (event.key === 'Enter') {
		performSearch();
	}
}

function performSearch() {
	const uid = document.getElementById('uid-input').value.trim();
	if (!uid) {
		Swal.fire('提示', '请输入用户 UID', 'info');
		return;
	}
	
	if (!/^\d+$/.test(uid)) {
		Swal.fire('错误', 'UID 必须是数字', 'error');
		return;
	}
	
	currentUid = uid;
	currentPage = 1;
	executeSearch();
}

function executeSearch() {
	const resultsSection = document.getElementById('search-results');
	const resultsContent = document.getElementById('results-content');
	
	resultsSection.style.display = 'block';
	resultsContent.innerHTML = `
        <div class="ui active centered inline loader"></div>
    `;
	
	fetch(`/benben/api/search/feed/${currentUid}?page=${currentPage}&per_page=20`)
		.then(response => response.json())
		.then(data => {
			if (data.success) {
				totalPages = Math.ceil(data.count / 20);
				renderResults(data.data);
				renderPagination();
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
                    <p>该用户暂无犇犇记录</p>
                </div>
            </div>
        `;
		document.getElementById('pagination').style.display = 'none';
		return;
	}
	
	let html = '';
	results.forEach(item => {
		const avatarUrl = `https://cdn.luogu.com.cn/upload/usericon/${item.user_id || 3}.png`;
		const userName = item.user_name || '未知用户';
		const userColor = item.user_color || 'Gray';
		
		html += `
            <div class="benben-item">
                <div class="benben-header" style="display: flex; align-items: center; margin-bottom: 10px;">
                    <img class="ui mini circular image" 
                         src="${avatarUrl}" 
                         alt="${userName}" 
                         style="margin-right: 10px;">
                    <div style="flex: 1;">
                        <div>
                            <a href="/user/${item.user_id}" class="user-${userColor}" style="font-weight: 550; font-size: 1.1em;">${userName}</a>
                        </div>
                        <div class="benben-meta firacode" style="margin-top: 5px;">
                            <span><i class="fa fa-hashtag"></i> ${item.id}</span>
                            <span><i class="fa fa-clock"></i> ${item.send_time}</span>
                        </div>
                    </div>
                </div>
                <div class="benben-content md-container">
                    ${item.rendered_content || escapeHtml(item.content)}
                </div>
            </div>
        `;
	});
	
	container.innerHTML = html;
}

function renderPagination() {
	const paginationSection = document.getElementById('pagination');
	const paginationContent = document.getElementById('pagination-content');
	
	if (totalPages <= 1) {
		paginationSection.style.display = 'none';
		return;
	}
	
	paginationSection.style.display = 'block';
	
	let paginationHTML = '<div class="ui pagination menu">';
	
	// 上一页按钮
	if (currentPage > 1) {
		paginationHTML += `<a class="item" onclick="changePage(${currentPage - 1})"><i class="left chevron icon"></i></a>`;
	}
	
	// 页码 (显示当前页 ±2)
	const startPage = Math.max(1, currentPage - 2);
	const endPage = Math.min(totalPages, currentPage + 2);
	
	for (let i = startPage; i <= endPage; i++) {
		const activeClass = i === currentPage ? 'active' : '';
		paginationHTML += `<a class="item ${activeClass}" onclick="changePage(${i})">${i}</a>`;
	}
	
	// 下一页按钮  
	if (currentPage < totalPages) {
		paginationHTML += `<a class="item" onclick="changePage(${currentPage + 1})"><i class="right chevron icon"></i></a>`;
	}
	
	paginationHTML += '</div>';
	paginationContent.innerHTML = paginationHTML;
}

function changePage(page) {
	currentPage = page;
	executeSearch();
	window.scrollTo({ top: 0, behavior: 'smooth' });
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
	document.getElementById('pagination').style.display = 'none';
}
