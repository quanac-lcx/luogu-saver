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
			return makeResponse(false, { message: `An error occurred while handling type ${type}: ${err.message}` });
		}
	}
	else {
		return makeResponse(false, { message: `No handler for type ${type}` });
	}
}