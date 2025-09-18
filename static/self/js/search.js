let currentPage = 1;
let currentQuery = '';
let totalPages = 1;

function handleKeyPress(event) {
	if (event.key === 'Enter') {
		performSearch();
	}
}

function performSearch() {
	const query = document.getElementById('search-input').value.trim();
	if (!query) {
		Swal.fire('提示', '请输入搜索关键词', 'info');
		return;
	}
	currentQuery = query;
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
	
	fetch(`https://api-v2.luogu.me/api/search?q=${encodeURIComponent(currentQuery)}&page=${currentPage}`)
		.then(response => response.json())
		.then(data => {
			if (data.success) {
				totalPages = Math.ceil(data.meta.total / data.meta.size);
				renderResults(data.data.results);
				renderPagination();
			} else {
				showError('搜索失败，请稍后重试');
			}
		})
		.catch(error => {
			console.error('Search error:', error);
			showError('网络错误或请求过于频繁，请稍后再试。');
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
                    <p>请尝试使用其他关键词搜索</p>
                </div>
            </div>
        `;
		document.getElementById('pagination').style.display = 'none';
		return;
	}
	
	const isUidSearch = /^\d+$/.test(currentQuery);
	const uidNumber = isUidSearch ? currentQuery : null;
	
	let html = '<div class="ui divided items">';
	results.forEach(item => {
		const authorUidDisplay = isUidSearch && item.author_uid === uidNumber
			? `<span style="color: red">${item.author_uid}</span>`
			: item.author_uid;
		
		html += `
            <div class="item">
                <div class="content">
                    <a class="header" style="color: #1e70bf" href="/article/${item.id}">
                        ${item.highlight?.title?.[0] || item.title}
                    </a>
                    <div class="meta firacode">
                        <span><i class="fa fa-hashtag"></i> ${item.id}</span>
                        <span><i class="fa fa-user"></i> UID: ${authorUidDisplay}</span>
                        <span><i class="fa fa-clock"></i> 更新时间: ${new Date(item.updated_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        `;
	});
	html += '</div>';
	
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
	
	paginationContent.innerHTML = `
        <button class="ui icon button ${currentPage > 1 ? '' : 'disabled'}"
                ${currentPage > 1 ? `onclick="changePage(${currentPage - 1})"` : ''}>
            <i class="chevron left icon"></i> 上一页
        </button>
        <span style="margin-left: 10px; margin-right: 10px; width: auto;">${currentPage}/${totalPages}</span>
        <button class="ui icon button ${currentPage < totalPages ? '' : 'disabled'}"
                ${currentPage < totalPages ? `onclick="changePage(${currentPage + 1})"` : ''}>
            下一页 <i class="chevron right icon"></i>
        </button>
    `;
}

function changePage(page) {
	currentPage = page;
	executeSearch();
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
