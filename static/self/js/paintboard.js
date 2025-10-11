let H = 600;
let W = 1000;
let scale = 1;
let dragged = 0;
const activityStartTime = 1761926400;
const activityEndTime = 1771480800;
let nowColor = "#000000";
let nowX = 0;
let nowY = 0;

let viewOffsetX = 0;
let viewOffsetY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let lastViewOffsetX = 0;
let lastViewOffsetY = 0;

let myarr = [];
for (let i = 0; i < H; i++) {
	myarr[i] = [];
	for (let j = 0; j < W; j++) {
		myarr[i][j] = '#dddddd';
	}
}

function render(arr) {
	let c = document.getElementById("mycanvas");
	let ctx = c.getContext("2d");
	for (let i = 0; i < H; i++) {
		for (let j = 0; j < W; j++) {
			ctx.fillStyle = arr[i][j];
			ctx.fillRect(j * scale, i * scale, scale, scale);
		}
	}
}

function update(y, x, color, t = false) {
	if (dragged) {
		dragged = 0;
		return;
	}
	let c = document.getElementById("mycanvas");
	let ctx = c.getContext("2d");
	ctx.fillStyle = color;
	if(!t) myarr[y][x] = color;
	ctx.fillRect(x * scale, y * scale, scale, scale);
}

zoom = function (s) {
	const container = document.getElementById('canvas-box');
	const canvas = document.getElementById('mycanvas');
	scale = s;
	const displayWidth = W * scale;
	const displayHeight = H * scale;
	canvas.width = displayWidth;
	canvas.height = displayHeight;
	canvas.style.width = displayWidth + 'px';
	canvas.style.height = displayHeight + 'px';
	if (s === 1) {
		const containerWidth = container.clientWidth;
		const containerHeight = container.clientHeight;
		viewOffsetX = (containerWidth - displayWidth) / 2;
		viewOffsetY = (containerHeight - displayHeight) / 2;
	}
	canvas.style.transform = `translate(${viewOffsetX}px, ${viewOffsetY}px)`;
	render(myarr);
}

let ws = null;

$(document).ready(function() {
	const canvas = document.getElementById('mycanvas');
	const container = document.getElementById('canvas-box');
	zoom(1);
	$("[zoom]").click(function () {
		zoom($(this).attr('zoom'));
	});
	$('#select-color').bind("change", (evt) => {
		nowColor = evt.currentTarget.value;
	});
	render(myarr);
	canvas.addEventListener('mousedown', function(e) {
		isDragging = true;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		lastViewOffsetX = viewOffsetX;
		lastViewOffsetY = viewOffsetY;
	});
	document.addEventListener('mousemove', function(e) {
		if (isDragging) {
			const dx = e.clientX - dragStartX;
			const dy = e.clientY - dragStartY;
			
			viewOffsetX = lastViewOffsetX + dx;
			viewOffsetY = lastViewOffsetY + dy;
			
			canvas.style.transform = `translate(${viewOffsetX}px, ${viewOffsetY}px)`;
		}
		const rect = canvas.getBoundingClientRect();
		const canvasX = e.clientX - rect.left;
		const canvasY = e.clientY - rect.top;
		if (canvasX >= 0 && canvasX < rect.width && canvasY >= 0 && canvasY < rect.height) {
			const x = Math.floor(canvasX / scale);
			const y = Math.floor(canvasY / scale);
			
			if (x >= 0 && x < W && y >= 0 && y < H) {
				document.getElementById('current-x').textContent = x;
				document.getElementById('current-y').textContent = y;
				nowX = x;
				nowY = y;
			}
		}
	});
	document.addEventListener('mouseup', function() {
		isDragging = false;
	});
	container.addEventListener('wheel', function(e) {
		e.preventDefault();
		const mouseX = e.clientX - container.getBoundingClientRect().left;
		const mouseY = e.clientY - container.getBoundingClientRect().top;
		const canvasX = mouseX - viewOffsetX;
		const canvasY = mouseY - viewOffsetY;
		const worldX = canvasX / scale;
		const worldY = canvasY / scale;
		const oldScale = scale;
		if (e.deltaY < 0) {
			scale = Math.min(scale + 1, 10);
		} else {
			scale = Math.max(scale - 1, 1);
		}
		if (oldScale !== scale) {
			const newCanvasX = worldX * scale;
			const newCanvasY = worldY * scale;
			viewOffsetX = mouseX - newCanvasX;
			viewOffsetY = mouseY - newCanvasY;
			const displayWidth = W * scale;
			const displayHeight = H * scale;
			canvas.width = displayWidth;
			canvas.height = displayHeight;
			canvas.style.width = displayWidth + 'px';
			canvas.style.height = displayHeight + 'px';
			canvas.style.transform = `translate(${viewOffsetX}px, ${viewOffsetY}px)`;
			render(myarr);
		}
	});
	$('#reset-token').bind("click", function () {
		$.ajax({
			type: 'POST',
			url: 'https://paintboard.luogu.me/api/auth/gettoken',
			data: JSON.stringify({
				uid: parseInt(document.getElementById('uid').value),
				access_key: document.getElementById('access_key').value
			}),
			complete: (resp) => {
				resp = resp.responseJSON;
				if (resp.statusCode !== 200) {
					console.log(resp);
					alert(`${resp.data.errorType}${resp.data.message?': '+resp.data.message:''}`);
				} else {
					document.getElementById('paint_key').value = resp.data.token;
				}
			},
			contentType: "application/json"
		});
	});
	connectWs();
	$('#activity-time-start').html(getDateTime(activityStartTime, false));
	$('#activity-time-end').html(getDateTime(activityEndTime, true));
	let countBeforeStart = activityStartTime > (new Date().getTime() / 1000);
	let $$ = $('#activity-reminder');
	let clock = setInterval(function () {
		let time = Math.floor(new Date().getTime() / 1000);
		if (countBeforeStart && (time > activityStartTime)) {
			clearInterval(clock);
			window.location.reload();
		} else if (time <= activityStartTime) {
			$$.html('(' + getFormattedTime(activityStartTime - time) + '后开始)');
		} else if (time <= activityEndTime) {
			$$.html('(' + getFormattedTime(activityEndTime - time) + '后结束)');
		} else {
			$$.html('(活动已结束)');
		}
	}, 1000);
});

function connectWs() {
	ws = new WebSocket('wss://paintboard.luogu.me/api/paintboard/ws');
	ws.binaryType = "arraybuffer";
	ws.onopen = function() {
		initialPaint();
	};
	ws.onerror = function(event) {
		console.error(event);
	};
	ws.onmessage = function(event) {
		const buffer = event.data;
		const dataView = new DataView(buffer);
		let offset = 0;
		while (offset < buffer.byteLength) {
			const type = dataView.getUint8(offset++);
			switch(type) {
				case 0xfa: {
					const x = dataView.getUint16(offset, true);
					const y = dataView.getUint16(offset + 2, true);
					const r = dataView.getUint8(offset + 4);
					const g = dataView.getUint8(offset + 5);
					const b = dataView.getUint8(offset + 6);
					offset += 7;
					const color = '#' +
						r.toString(16).padStart(2,'0') +
						g.toString(16).padStart(2,'0') +
						b.toString(16).padStart(2,'0');
					update(y, x, color);
					break;
				}
				case 0xfc:
					ws.send(new Uint8Array([0xfb]));
					break;
			}
		}
	};
}

function getDateTime(timestamp, isRangeEnd) {
	let d = new Date(timestamp * 1000);
	let is2400 = false;
	if (isRangeEnd && d.getHours() === 0 && d.getMinutes() === 0) {
		d.setHours(-24)
		is2400 = true;
	}
	let s = String(d.getFullYear()) + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') + ' ';
	s += is2400 ? '24:00' : String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
	return s;
}

function getFormattedTime(timestamp) {
	let str = '';
	let d = Math.floor(timestamp / 86400);
	if (d !== 0 || str.length > 0) str += d + ' 天 ';
	let h = Math.floor(timestamp / 3600) % 24;
	if (h !== 0 || str.length > 0) str += String(h).padStart(2, '0') + ' 时 ';
	let m = Math.floor(timestamp / 60) % 60;
	if (m !== 0 || str.length > 0) str += String(m).padStart(2, '0') + ' 分 ';
	let s = Math.floor(timestamp) % 60;
	str += String(s).padStart(2, '0') + ' 秒';
	return str;
}

function initialPaint() {
	let oReq = new XMLHttpRequest();
	oReq.open("GET", "https://paintboard.luogu.me/api/paintboard/getboard");
	oReq.responseType = "arraybuffer";
	oReq.onload = function () {
		const arrayBuffer = oReq.response;
		if (arrayBuffer) {
			const byteArray = new Uint8Array(arrayBuffer);
			for (let y = 0; y < 600; y++) {
				for (let x = 0; x< 1000; x++) {
					const idx = (y * 1000 + x) * 3;
					if (myarr[y][x] === '#dddddd') {
						update(y, x, '#' +
							byteArray[idx].toString(16).padStart(2, '0') +
							byteArray[idx + 1].toString(16).padStart(2, '0') +
							byteArray[idx + 2].toString(16).padStart(2, '0')
						);
					}
				}
			}
		}
	};
	oReq.send();
}
