import * as cheerio from "cheerio";
import { ExternalServiceError } from "./errors.js";

export function getResponseObject(response, type = 0) {
	if (!type) {
		const $ = cheerio.load(response.data);
		const contextElement = $('#lentille-context');
		if (!contextElement.length) throw new ExternalServiceError("文章结构出错", "Luogu API");
		const dataObj = JSON.parse(contextElement.text().trim());
		return dataObj.data?.article;
	}
	else if (type === 1) {
		return response.data?.currentData?.paste;
	}
	else if (type === 2) {
		// For judgement, parse HTML like articles
		const $ = cheerio.load(response.data);
		const contextElement = $('#lentille-context');
		if (!contextElement.length) throw new ExternalServiceError("陶片放逐页面结构出错", "Luogu API");
		const dataObj = JSON.parse(contextElement.text().trim());
		const result = dataObj.currentData;
		
		if (result && result.logs) {
			console.log(`[DEBUG] 陶片放逐 API 返回 ${result.logs.length} 条记录`);
		} else {
			console.log('[DEBUG] 陶片放逐数据结构:', JSON.stringify(result, null, 2).substring(0, 1000));
		}
		return result;
	}
}

export function getResponseUser(response) {
	const author = response.author || response.user || {};
	return {
		uid: parseInt(author.uid),
		name: author.name,
		color: author.color
	};
}
