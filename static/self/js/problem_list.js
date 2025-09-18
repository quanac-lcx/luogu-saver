document.addEventListener("DOMContentLoaded", () => {
	$('.ui.dropdown').dropdown();
	
	const { currentPage, totalPages, prefix } = window.problemPageData;
	renderPagination(currentPage, totalPages);
	
	const params = new URLSearchParams(window.location.search);
	
	// 初始化筛选框
	if (params.has("difficulty")) {
		$('#difficulty-filter').dropdown('set selected', params.get("difficulty"));
	}
	if (params.has("accept_solution")) {
		$('#solution-filter').dropdown('set selected', params.get("accept_solution"));
	}
	if (params.has("prefix")) {
		document.getElementById("prefix-filter").value = params.get("prefix");
	}
});

function applyFilters() {
	const difficulty = document.getElementById("difficulty-filter").value;
	const solution = document.getElementById("solution-filter").value;
	const prefix = document.getElementById("prefix-filter").value.trim();
	
	const params = new URLSearchParams();
	if (difficulty && difficulty !== "all") params.set("difficulty", difficulty);
	if (solution && solution !== "all") params.set("accept_solution", solution);
	if (prefix) params.set("prefix", prefix);
	params.set("page", 1);
	
	window.location.href = "/problem?" + params.toString();
}

function renderPagination(currentPage, totalPages) {
	const paginationSection = document.getElementById("pagination");
	const paginationContent = document.getElementById("pagination-content");
	
	if (totalPages <= 1) {
		paginationSection.style.display = "none";
		return;
	}
	
	paginationSection.style.display = "block";
	
	paginationContent.innerHTML = `
        <button class="ui icon button ${currentPage > 1 ? '' : 'disabled'}"
                ${currentPage > 1 ? `onclick="changePage(${currentPage - 1})"` : ''}>
            <i class="chevron left icon"></i> 上一页
        </button>
        <span style="margin: 0 10px;">${currentPage}/${totalPages}</span>
        <button class="ui icon button ${currentPage < totalPages ? '' : 'disabled'}"
                ${currentPage < totalPages ? `onclick="changePage(${currentPage + 1})"` : ''}>
            下一页 <i class="chevron right icon"></i>
        </button>
    `;
}

function changePage(page) {
	const params = new URLSearchParams(window.location.search);
	params.set("page", page);
	window.location.href = "/problem?" + params.toString();
}
