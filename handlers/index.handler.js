import commonFetchHandler from "./common.fetch.handler.js";
import broadcastBenbenHandler from "./broadcast.benben.handler.js";
import taskProgressBenbenHandler from "./task_progress.benben.handler.js";
import taskSuccessBenbenHandler from "./task_success.benben.handler.js";
import taskErrorBenbenHandler from "./task_error.benben.handler.js";
import judgementHandler from "./judgement.handler.js";
import { makeResponse } from "../core/utils.js";
import { changeErrorType, SystemError } from "../core/errors.js";

const fetchHandlers = {
	0: commonFetchHandler,
	1: commonFetchHandler,
	2: (resp, type) => resp.data,
	3: judgementHandler
};

const benbenHandlers = {
	'task_progress': taskProgressBenbenHandler,
	'task_success': taskSuccessBenbenHandler,
	'task_error': taskErrorBenbenHandler,
	'task_retrying': () => undefined,
	'communication_error': () => undefined,
	'broadcast': broadcastBenbenHandler
};

export async function handleFetch({ resp }, type) {
	const handler = fetchHandlers[type];
	if (handler) {
		try {
			return makeResponse(true, { data: await handler(resp, type) });
		} catch (err) {
			err.message = `处理类型 ${type} 任务时出错: ${err.message}`;
			return makeResponse(false, { message: err.message, error: err });
		}
	}
	else {
		return makeResponse(false, { message: `没有针对类型 ${type} 任务的处理器` });
	}
}

export async function handleBenben(data) {
	if (data.type === 'broadcast') {
		data = data.data;
		try {
			data = data.split(' ');
			const uid = data[0], count = data[1];
			benbenHandlers['broadcast']({ uid, count });
			return makeResponse(true);
		} catch(e) {
			e.message = `处理犇站广播时出错: ${e.message}`;
			return makeResponse(false, { message: e.message, error: changeErrorType(e, SystemError) });
		}
	}
	else if (data.type === 'subscribe') {
		try {
			data = JSON.parse(data.data);
			const type = data.type;
			benbenHandlers[type](data.data);
			return makeResponse(true);
		} catch(e) {
			e.message = `处理犇站订阅时出错: ${e.message}`;
			return makeResponse(false, { message: e.message, error: changeErrorType(e, SystemError) });
		}
	}
	else {
		return makeResponse(false, { message: `没有针对类型 ${data.type} 犇站回调的处理器` });
	}
}