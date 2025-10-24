const H = 600;
const W = 1000;
let scale = 1;
const activityStartTime = 1761926400;
const activityEndTime = 1771480800;

let nowColor = "#000000";

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

let canvas, ctx, container, bufferCanvas, bufferCtx;
let reconnectTimer = null;

function showLoadingOverlay(message = '正在加载...') {
	let overlay = document.getElementById('loading-overlay');
	if (!overlay) {
		container = document.getElementById('canvas-box'); // 确保容器存在
		overlay = document.createElement('div');
		overlay.id = 'loading-overlay';
		Object.assign(overlay.style, {
			position: 'absolute',
			top: '0',
			left: '0',
			width: '100%',
			height: '100%',
			backgroundColor: 'rgba(0, 0, 0, 0.75)',
			color: 'white',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'center',
			alignItems: 'center',
			zIndex: '1000',
			fontFamily: 'sans-serif',
			textAlign: 'center'
		});
		
		const spinner = document.createElement('div');
		Object.assign(spinner.style, {
			border: '8px solid #f3f3f3',
			borderTop: '8px solid #3498db',
			borderRadius: '50%',
			width: '60px',
			height: '60px',
			animation: 'spin 1.5s linear infinite',
			marginBottom: '20px'
		});
		
		const styleSheet = document.createElement("style");
		styleSheet.innerText = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
		document.head.appendChild(styleSheet);
		
		const messageEl = document.createElement('p');
		messageEl.id = 'loading-message';
		
		overlay.appendChild(spinner);
		overlay.appendChild(messageEl);
		container.appendChild(overlay);
	}
	
	document.getElementById('loading-message').textContent = message;
	overlay.style.display = 'flex';
}

function hideLoadingOverlay() {
	const overlay = document.getElementById('loading-overlay');
	if (overlay) {
		overlay.style.display = 'none';
	}
}

function render() {
	ctx.imageSmoothingEnabled = false;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(bufferCanvas, 0, 0, canvas.width, canvas.height);
}

function update(y, x, color) {
	myarr[y][x] = color;
	bufferCtx.fillStyle = color;
	bufferCtx.fillRect(x, y, 1, 1);
	ctx.fillStyle = color;
	ctx.fillRect(x * scale, y * scale, scale, scale);
}

function highlightPixel(x, y) {
	ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
	ctx.fillRect(x * scale, y * scale, scale, scale);
}

function zoom(s) {
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
		canvas.style.transform = `translate(${viewOffsetX}px, ${viewOffsetY}px)`;
	}
	render();
}

let ws = null;

function connectWs() {
	if (reconnectTimer) clearTimeout(reconnectTimer);
	showLoadingOverlay('正在连接服务器...');
	
	ws = new WebSocket('wss://paintboard.luogu.me/api/paintboard/ws?readonly=1');
	ws.binaryType = "arraybuffer";
	
	ws.onopen = function() {
		console.log("WebSocket connection established.");
		showLoadingOverlay('连接成功，正在获取绘板...');
		initialPaint();
	};
	
	ws.onclose = function(event) {
		console.error(`WebSocket closed. Code: ${event.code}. Reason: ${event.reason}`);
		showLoadingOverlay('连接已断开，将在 1 秒后尝试重连...');
		reconnectTimer = setTimeout(connectWs, 1000);
	};
	
	ws.onerror = function(event) {
		console.error("WebSocket Error:", event);
	};
	
	ws.onmessage = function(event) {
		const buffer = event.data;
		const dataView = new DataView(buffer);
		let offset = 0;
		while (offset < buffer.byteLength) {
			const type = dataView.getUint8(offset++);
			switch (type) {
				case 0xfa: {
					const x = dataView.getUint16(offset, true);
					const y = dataView.getUint16(offset + 2, true);
					const r = dataView.getUint8(offset + 4);
					const g = dataView.getUint8(offset + 5);
					const b = dataView.getUint8(offset + 6);
					offset += 7;
					const color = '#' +
						r.toString(16).padStart(2, '0') +
						g.toString(16).padStart(2, '0') +
						b.toString(16).padStart(2, '0');
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

function initialPaint() {
	let oReq = new XMLHttpRequest();
	oReq.open("GET", "https://paintboard.luogu.me/api/paintboard/getboard");
	oReq.responseType = "arraybuffer";
	
	oReq.onload = function() {
		const arrayBuffer = oReq.response;
		if (arrayBuffer) {
			const byteArray = new Uint8Array(arrayBuffer);
			for (let y = 0; y < H; y++) {
				for (let x = 0; x < W; x++) {
					const idx = (y * W + x) * 3;
					const color = '#' +
						byteArray[idx].toString(16).padStart(2, '0') +
						byteArray[idx + 1].toString(16).padStart(2, '0') +
						byteArray[idx + 2].toString(16).padStart(2, '0');
					myarr[y][x] = color;
					bufferCtx.fillStyle = color;
					bufferCtx.fillRect(x, y, 1, 1);
				}
			}
			render();
			hideLoadingOverlay();
		}
	};
	
	oReq.onerror = function() {
		console.error("Failed to fetch the paintboard data via HTTP.");
		showLoadingOverlay('获取绘板数据失败，请检查网络。');
	};
	
	oReq.send();
}

function getDateTime(timestamp, isRangeEnd) {
	let d = new Date(timestamp * 1000);
	let is2400 = false;
	if (isRangeEnd && d.getHours() === 0 && d.getMinutes() === 0) {
		d.setDate(d.getDate() - 1);
		is2400 = true;
	}
	let s = d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') + ' ';
	s += is2400 ? '24:00' : String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
	return s;
}

function getFormattedTime(timestamp) {
	let str = '';
	let d = Math.floor(timestamp / 86400);
	if (d > 0) str += d + ' 天 ';
	let h = Math.floor(timestamp / 3600) % 24;
	if (h > 0 || str.length > 0) str += String(h).padStart(2, '0') + ' 时 ';
	let m = Math.floor(timestamp / 60) % 60;
	if (m > 0 || str.length > 0) str += String(m).padStart(2, '0') + ' 分 ';
	let s = Math.floor(timestamp) % 60;
	str += String(s).padStart(2, '0') + ' 秒';
	return str;
}

$(document).ready(function() {
	canvas = document.getElementById('mycanvas');
	ctx = canvas.getContext('2d');
	container = document.getElementById('canvas-box');
	bufferCanvas = document.getElementById('buffer-canvas');
	bufferCtx = bufferCanvas.getContext('2d');
	
	let highlightedX = -1;
	let highlightedY = -1;
	
	zoom(1);
	
	$("[zoom]").click(function() {
		zoom(parseInt($(this).attr('zoom')));
	});
	
	$('#select-color').on("change", (evt) => {
		nowColor = evt.currentTarget.value;
	});
	
	container.addEventListener('mousedown', function(e) {
		isDragging = true;
		container.style.cursor = 'grabbing';
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
			return;
		}
		
		const rect = canvas.getBoundingClientRect();
		const canvasX = e.clientX - rect.left;
		const canvasY = e.clientY - rect.top;
		const x = Math.floor(canvasX / scale);
		const y = Math.floor(canvasY / scale);
		
		if (x >= 0 && x < W && y >= 0 && y < H) {
			$('#current-x').text(x);
			$('#current-y').text(y);
			
			if (highlightedX !== x || highlightedY !== y) {
				if (highlightedX !== -1) {
					ctx.drawImage(bufferCanvas,
						highlightedX, highlightedY, 1, 1,
						highlightedX * scale, highlightedY * scale, scale, scale
					);
				}
				highlightPixel(x, y);
				highlightedX = x;
				highlightedY = y;
			}
		} else {
			if (highlightedX !== -1) {
				ctx.drawImage(bufferCanvas,
					highlightedX, highlightedY, 1, 1,
					highlightedX * scale, highlightedY * scale, scale, scale
				);
				highlightedX = -1;
				highlightedY = -1;
				$('#current-x').text('-');
				$('#current-y').text('-');
			}
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
					Swal.fire({
						title: `获取 PaintKey 失败`,
						text: `${resp.data.errorType || resp.data.error}${resp.data.message ? ': ' + resp.data.message : ''}`,
						icon: 'error'
					});
				} else {
					document.getElementById('paint_key').value = resp.data.token;
				}
			},
			contentType: "application/json"
		});
	});
	
	document.addEventListener('mouseup', function() {
		isDragging = false;
		container.style.cursor = 'grab';
	});
	
	container.addEventListener('wheel', function(e) {
		e.preventDefault();
		
		const rect = container.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;
		
		const worldX = (mouseX - viewOffsetX) / scale;
		const worldY = (mouseY - viewOffsetY) / scale;
		
		const oldScale = scale;
		
		if (e.deltaY < 0) {
			scale = Math.min(scale + 1, 10);
		} else {
			scale = Math.max(scale - 1, 1);
		}
		
		if (oldScale !== scale) {
			zoom(scale);
			viewOffsetX = mouseX - worldX * scale;
			viewOffsetY = mouseY - worldY * scale;
			canvas.style.transform = `translate(${viewOffsetX}px, ${viewOffsetY}px)`;
		}
	});
	
	connectWs();
	
	$('#activity-time-start').html(getDateTime(activityStartTime, false));
	$('#activity-time-end').html(getDateTime(activityEndTime, true));
	let $$ = $('#activity-reminder');
	
	let clock = setInterval(function() {
		let time = Math.floor(new Date().getTime() / 1000);
		if (time <= activityStartTime) {
			$$.html(' (倒计时: ' + getFormattedTime(activityStartTime - time) + ')');
		} else if (time <= activityEndTime) {
			$$.html(' (剩余: ' + getFormattedTime(activityEndTime - time) + ')');
		} else {
			$$.html(' (活动已结束)');
			clearInterval(clock);
		}
	}, 1000);
});
