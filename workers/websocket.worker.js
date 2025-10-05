import WebSocket from 'ws';
import { changeErrorType, getError, logError, NetworkError } from "../core/errors.js";
import { handleBenben } from "../handlers/index.handler.js";
import config from "../config.js";

/**
 * 启动并管理单个 WebSocket 连接的生命周期和重连
 * @param {string} path - WS 连接的路径 (如 '/wsbroadcast' 或 '/ws')
 * @param {string} name - 连接的名称 (用于日志，如 '广播' 或 '订阅')
 * @param {Function} handler - 处理器
 * @param {string} type - 消息类型 (用于 handleBenben，如 'broadcast' 或 'subscribe')
 * @returns {Object} ws - 包含 cleanup 和 send 方法的对象
 */
function createWebSocketConnection(path, name, handler, type) {
	let ws;
	let heartbeatId;
	let reconnectCount = 0;
	let lastReconnectTime = 0;
	const pendingMessage = [];
	const wsUrl = config.service.ws_url + path;
	
	const attemptReconnect = () => {
		const now = Date.now();
		if (now - lastReconnectTime > 15000) reconnectCount = 0;
		
		reconnectCount++;
		lastReconnectTime = now;
		const retryDelay = (reconnectCount - 1) * 1000;
		logger.info(`${name}服务器第 ${reconnectCount} 次重连，${retryDelay}ms 后重试`);
		setTimeout(connect, retryDelay);
	};
	
	const send = (msg) => {
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.send(msg);
		} else {
			logger.warn(`${name}服务器未连接，缓存消息: ${msg}`);
		}
	};
	
	const connect = () => {
		ws = new WebSocket(wsUrl);
		
		ws.on('open', () => {
			logger.info(`与${name}服务器建立连接成功`);
			heartbeatId = setInterval(() => ws.send(`heartbeat-${Date.now()}`), 10000);
			while (pendingMessage.length > 0) {
				const msg = pendingMessage.shift();
				logger.info(`向${name}服务器发送缓存消息: ${msg}`);
				send(msg);
			}
		});
		
		ws.on('message', async (data) => {
			const resp = await handler({ type: type, data: data.toString() });
			if (!resp.success) await logError(getError(resp), null);
		});
		
		ws.on('error', async (error) => {
			error = changeErrorType(error, NetworkError);
			error.message = `与${name}服务器通信时发生错误: ` + error.message;
			await logError(error, null);
		});
		
		ws.on('close', () => {
			if (heartbeatId) clearInterval(heartbeatId);
			logger.warn(`与${name}服务器的连接已关闭，正在尝试重新连接...`);
			attemptReconnect();
		});
	};
	
	connect();
	
	return {
		cleanup: () => {
			if (heartbeatId) clearInterval(heartbeatId);
			if (ws) ws.close();
		},
		send
	};
}

export function startWebSocketWorker() {
	const broadcast = createWebSocketConnection(
		'/wsbroadcast',
		'犇站广播',
		handleBenben,
		'broadcast'
	);
	
	const subscribe = createWebSocketConnection(
		'/ws',
		'犇站订阅',
		handleBenben,
		'subscribe'
	);

	return { broadcast, subscribe };
}