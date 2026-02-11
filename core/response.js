
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
		// For judgement, handle both direct JSON response and HTML with lentille-context
		const responseData = response.data;
		
		// 检查响应是否是直接JSON
		if (typeof responseData === 'object' && responseData !== null) {
			// 已经是对象，可能是直接API响应
			logger.debug('陶片放逐响应是直接JSON对象');
			
			// 检查是否是预期的数据结构
			if (responseData.data && responseData.data.logs && Array.isArray(responseData.data.logs)) {
				logger.debug(`陶片放逐 API 返回 ${responseData.data.logs.length} 条记录`);
				return responseData.data;
			} else if (responseData.logs && Array.isArray(responseData.logs)) {
				// 如果logs在顶层
				logger.debug(`陶片放逐 API 返回 ${responseData.logs.length} 条记录（顶层logs）`);
				return responseData;
			} else {
				// 尝试从常见路径查找数据
				const possiblePaths = ['data', 'currentData', 'result'];
				for (const path of possiblePaths) {
					if (responseData[path] && responseData[path].logs && Array.isArray(responseData[path].logs)) {
						logger.debug(`从路径 ${path} 找到logs数组，长度: ${responseData[path].logs.length}`);
						return responseData[path];
					}
				}
				
				// 没有找到预期的结构，记录并尝试作为HTML处理
				logger.warn('陶片放逐JSON响应结构异常，尝试作为HTML处理');
				logger.debug('响应结构:', JSON.stringify(responseData, null, 2).substring(0, 1000));
			}
		}
		
		// 如果不是直接JSON或结构不符合预期，尝试作为HTML处理
		if (typeof responseData === 'string') {
			// 检查是否是HTML
			if (responseData.includes('<!DOCTYPE') || responseData.includes('<html') || responseData.includes('lentille-context')) {
				logger.debug('陶片放逐响应是HTML，尝试解析lentille-context');
				const $ = cheerio.load(responseData);
				const contextElement = $('#lentille-context');
				if (!contextElement.length) {
					logger.error('陶片放逐HTML中未找到lentille-context元素');
					throw new ExternalServiceError("陶片放逐页面结构出错", "Luogu API");
				}
				
				let dataObj;
				try {
					dataObj = JSON.parse(contextElement.text().trim());
				} catch (parseError) {
					throw new ExternalServiceError(`解析陶片放逐页面JSON失败: ${parseError.message}`, "Luogu API");
				}
				
				// 修正数据路径：应该从 dataObj.data 而不是 dataObj.currentData 获取
				const result = dataObj.data || {};
				
				if (result && result.logs && Array.isArray(result.logs)) {
					logger.debug(`陶片放逐 HTML 解析返回 ${result.logs.length} 条记录`);
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
			} else {
				// 可能是JSON字符串
				try {
					const jsonData = JSON.parse(responseData);
					logger.debug('陶片放逐响应是JSON字符串，已解析');
					
					// 递归处理解析后的对象
					const fakeResponse = { data: jsonData };
					return getResponseObject(fakeResponse, type);
				} catch (parseError) {
					logger.error('陶片放逐响应既不是HTML也不是有效JSON');
					throw new ExternalServiceError(`陶片放逐响应解析失败: ${parseError.message}`, "Luogu API");
				}
			}
		}
		
		// 如果到达这里，说明无法处理响应
		logger.error('无法处理陶片放逐响应，类型:', typeof responseData);
		throw new ExternalServiceError("无法处理陶片放逐响应", "Luogu API");
	}
	else if (type === 4) {
		// For user profile, parse HTML like articles
		const $ = cheerio.load(response.data);
		const contextElement = $('#lentille-context');
		if (!contextElement.length) throw new ExternalServiceError("用户页面结构出错", "Luogu API");
		const dataObj = JSON.parse(contextElement.text().trim());
		return dataObj.data?.user;
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
