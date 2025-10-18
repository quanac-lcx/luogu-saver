import AccessKey from "../models/access_key.js";
import { ValidationError } from "../core/errors.js";
import { generateRandomString } from "../core/utils.js";

export async function applyToken(uid) {
	const key = generateRandomString(8);
	let accessKey = await AccessKey.findOne({ where: { uid } });
	if (!accessKey) {
		accessKey = AccessKey.create({
			uid,
			id: key
		});
		await accessKey.save();
	}
	
	return {
		token: accessKey.id,
		isNew: !accessKey.created_at || new Date(accessKey.created_at).getTime() > Date.now() - 1000
	};
}

export async function refreshToken(uid) {
	const originalKey = await AccessKey.findOne({ where: { uid } });
	if (originalKey) {
		await originalKey.remove();
	}
	const newKey = generateRandomString(8);
	const accessKey = AccessKey.create({
		uid,
		id: newKey
	});
	await accessKey.save();
	
	return {
		token: accessKey.id
	};
}

export async function verifyAccessKey(key) {
	const accessKey = await AccessKey.findById(key);
	if (!accessKey) {
		throw new ValidationError('凭据无效');
	}
	
	return {
		uid: accessKey.uid,
		role: accessKey.role
	};
}