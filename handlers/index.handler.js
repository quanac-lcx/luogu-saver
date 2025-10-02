import commonHandler from "./common.handler.js";
import {makeResponse} from "../core/utils.js";

const handlers = {
	0: commonHandler,
	1: commonHandler
};

export async function handleFetch({ resp }, type) {
	const handler = handlers[type];
	if (handler) {
		try {
			return makeResponse(true, { data: await handler(resp, type) });
		} catch (err) {
			return makeResponse(false, { message: `处理类型 ${type} 任务时出错: ${err.message}` });
		}
	}
	else {
		return makeResponse(false, { message: `没有针对类型 ${type} 任务的处理器` });
	}
}