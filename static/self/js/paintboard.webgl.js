const H = 600;
const W = 1000;
let scale = 1;
const activityStartTime = 1761926400;
const activityEndTime = 1771480800;

let nowColor = "#000000";

// WebGL 相关变量
let gl;
let program;
let positionBuffer;
let texCoordBuffer;
let texture;
let u_resolution_loc, u_transform_loc;

// 视图控制变量
let viewOffsetX = 0;
let viewOffsetY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let lastViewOffsetX = 0;
let lastViewOffsetY = 0;

let canvas, container, overlayCanvas, overlayCtx;
let reconnectTimer = null;

// --- 优化点 1: 引入“需要重绘”的标志位 ---
let needsRender = false;

function showLoadingOverlay(message = '正在加载...') {
	let overlay = document.getElementById('loading-overlay');
	if (!overlay) {
		container = document.getElementById('canvas-box');
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

function initWebGL() {
	canvas = document.getElementById('mycanvas');
	// powerPreference: 'low-power' 已经是一个很好的节能选项
	gl = canvas.getContext('webgl2', { antialias: false, depth: false, powerPreference: 'low-power' });
	if (!gl) {
		alert("无法初始化 WebGL 2.0。您的浏览器或设备可能不支持。");
		return false;
	}
	
	const vsSource = `#version 300 es
        in vec2 a_position;
        in vec2 a_texCoord;
        uniform vec2 u_resolution;
        uniform vec4 u_transform; // (scale, scale, offsetX, offsetY)
        out vec2 v_texCoord;
        void main() {
            vec2 scaled_pos = a_position * u_transform.x;
            vec2 moved_pos = scaled_pos + u_transform.zw;
            vec2 clip_pos = (moved_pos / u_resolution) * 2.0 - 1.0;
            gl_Position = vec4(clip_pos * vec2(1, -1), 0, 1);
            v_texCoord = a_texCoord;
        }
    `;
	const fsSource = `#version 300 es
        precision highp float;
        uniform sampler2D u_image;
        in vec2 v_texCoord;
        out vec4 outColor;
        void main() {
            outColor = texture(u_image, v_texCoord);
        }
    `;
	
	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
	const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
	program = createProgram(gl, vertexShader, fragmentShader);
	
	const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
	const texCoordAttributeLocation = gl.getAttribLocation(program, "a_texCoord");
	u_resolution_loc = gl.getUniformLocation(program, "u_resolution");
	u_transform_loc = gl.getUniformLocation(program, "u_transform");
	
	positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, W, 0, 0, H, 0, H, W, 0, W, H]), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(positionAttributeLocation);
	gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
	
	texCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(texCoordAttributeLocation);
	gl.vertexAttribPointer(texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);
	
	texture = createAndSetupTexture(gl);
	overlayCanvas = document.getElementById('overlay-canvas');
	overlayCtx = overlayCanvas.getContext('2d');
	
	return true;
}

function createShader(gl, type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function createProgram(gl, vs, fs) {
	const program = gl.createProgram();
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
		return null;
	}
	return program;
}

function createAndSetupTexture(gl) {
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, W, H, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
	return tex;
}

function render() {
	if (!gl) return;
	const displayWidth  = container.clientWidth;
	const displayHeight = container.clientHeight;
	if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
		canvas.width = displayWidth;
		canvas.height = displayHeight;
		overlayCanvas.width = displayWidth;
		overlayCanvas.height = displayHeight;
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	}
	
	gl.clearColor(0.94, 0.94, 0.94, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.useProgram(program);
	gl.uniform2f(u_resolution_loc, gl.drawingBufferWidth, gl.drawingBufferHeight);
	gl.uniform4f(u_transform_loc, scale, scale, viewOffsetX, viewOffsetY);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function update(y, x, color) {
	if(!gl) return;
	const r = parseInt(color.slice(1, 3), 16);
	const g = parseInt(color.slice(3, 5), 16);
	const b = parseInt(color.slice(5, 7), 16);
	const pixel = new Uint8Array([r, g, b]);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, 1, 1, gl.RGB, gl.UNSIGNED_BYTE, pixel);
	
	// --- 优化点 2: 请求重绘，而不是立即重绘 ---
	needsRender = true;
}

function highlightPixel(x, y) {
	overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
	overlayCtx.fillStyle = 'rgba(255, 255, 0, 0.5)';
	const screenX = x * scale + viewOffsetX;
	const screenY = y * scale + viewOffsetY;
	overlayCtx.fillRect(screenX, screenY, scale, scale);
}

function clearHighlight() {
	overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
}

function zoom(s) {
	const oldScale = scale;
	const rect = container.getBoundingClientRect();
	const mouseX = rect.width / 2;
	const mouseY = rect.height / 2;
	const worldX = (mouseX - viewOffsetX) / oldScale;
	const worldY = (mouseY - viewOffsetY) / oldScale;
	
	scale = s;
	if (s === 1) {
		const containerWidth = container.clientWidth;
		const containerHeight = container.clientHeight;
		viewOffsetX = (containerWidth - W * scale) / 2;
		viewOffsetY = (containerHeight - H * scale) / 2;
	} else {
		viewOffsetX = mouseX - worldX * scale;
		viewOffsetY = mouseY - worldY * scale;
	}
	// --- 优化点 2: 请求重绘，而不是立即重绘 ---
	needsRender = true;
}

// WebSocket 和 HTTP 请求逻辑保持不变
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
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, W, H, 0, gl.RGB, gl.UNSIGNED_BYTE, byteArray);
			// 初始加载后，请求一次渲染
			needsRender = true;
			hideLoadingOverlay();
		}
	};
	oReq.onerror = function() {
		console.error("Failed to fetch the paintboard data via HTTP.");
		showLoadingOverlay('获取绘板数据失败，请检查网络。');
	};
	oReq.send();
}

// 时间格式化函数保持不变
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


// --- 优化点 3: 创建主渲染循环 ---
function animationLoop() {
	if (needsRender) {
		render();
		needsRender = false; // 重置标志位
	}
	// 无论是否渲染，都请求下一帧，以保持循环运行
	requestAnimationFrame(animationLoop);
}


$(document).ready(function() {
	container = document.getElementById('canvas-box');
	
	if (!initWebGL()) {
		showLoadingOverlay("WebGL 初始化失败！");
		return;
	}
	
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
			// --- 优化点 2: 请求重绘 ---
			needsRender = true;
			clearHighlight();
			return;
		}
		
		const rect = container.getBoundingClientRect();
		const canvasX = e.clientX - rect.left;
		const canvasY = e.clientY - rect.top;
		const x = Math.floor((canvasX - viewOffsetX) / scale);
		const y = Math.floor((canvasY - viewOffsetY) / scale);
		
		if (x >= 0 && x < W && y >= 0 && y < H) {
			$('#current-x').text(x);
			$('#current-y').text(y);
			if (highlightedX !== x || highlightedY !== y) {
				highlightPixel(x, y);
				highlightedX = x;
				highlightedY = y;
			}
		} else {
			if (highlightedX !== -1) {
				clearHighlight();
				highlightedX = -1;
				highlightedY = -1;
				$('#current-x').text('-');
				$('#current-y').text('-');
			}
		}
	});
	
	container.addEventListener('mouseleave', function() {
		if (highlightedX !== -1) {
			clearHighlight();
			highlightedX = -1;
			highlightedY = -1;
			$('#current-x').text('-');
			$('#current-y').text('-');
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
			scale = Math.min(scale * 1.25, 32);
		} else {
			scale = Math.max(scale / 1.25, 0.5);
		}
		
		if (oldScale !== scale) {
			viewOffsetX = mouseX - worldX * scale;
			viewOffsetY = mouseY - worldY * scale;
			// --- 优化点 2: 请求重绘 ---
			needsRender = true;
			const x = Math.floor((mouseX - viewOffsetX) / scale);
			const y = Math.floor((mouseY - viewOffsetY) / scale);
			if (x >= 0 && x < W && y >= 0 && y < H) {
				highlightPixel(x,y);
				highlightedX = x;
				highlightedY = y;
			} else {
				clearHighlight();
			}
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
	
	// --- 优化点 4: 启动渲染循环 ---
	animationLoop();
});