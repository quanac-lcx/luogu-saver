document.addEventListener("DOMContentLoaded", () => {
	$('.ui.dropdown').dropdown();
	
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
