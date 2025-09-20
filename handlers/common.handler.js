import { getResponseObject, getResponseUser } from "../core/response.js";
import { truncateUtf8 } from "../core/utils.js";
import { upsertUser } from "../services/user.service.js";

export default async (resp, type) => {
	const obj = getResponseObject(resp, type);
	obj.content = truncateUtf8(type ? obj.data : obj.content);
	obj.userData = getResponseUser(obj);
	await upsertUser(obj.userData);
	return obj;
};