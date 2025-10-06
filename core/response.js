
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
	else if (type === 3) {
		// For judgement, parse HTML like articles
		const $ = cheerio.load(response.data);
		const contextElement = $('#lentille-context');
		if (!contextElement.length) throw new ExternalServiceError("陶片放逐页面结构出错", "Luogu API");
		
		let dataObj;
		try {
			dataObj = JSON.parse(contextElement.text().trim());
		} catch (parseError) {
			throw new ExternalServiceError(`解析陶片放逐页面JSON失败: ${parseError.message}`, "Luogu API");
		}
		
		// 修正数据路径：应该从 dataObj.data 而不是 dataObj.currentData 获取
		const result = dataObj.data || {};
		
		if (result && result.logs && Array.isArray(result.logs)) {
			logger.debug(`陶片放逐 API 返回 ${result.logs.length} 条记录`);
		} else {
			const resultStr = JSON.stringify(result, null, 2) || '';
			logger.debug('陶片放逐数据结构异常: ' + resultStr.substring(0, 1000));
			logger.debug('dataObj 完整结构: ' + JSON.stringify(dataObj, null, 2).substring(0, 1000));
			// 确保返回一个包含空logs数组的对象
			if (!result.logs) {
				result.logs = [];
			}
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
