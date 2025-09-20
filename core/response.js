import * as cheerio from "cheerio";

export function getResponseObject(response, type = 0) {
	if (!type) {
		const $ = cheerio.load(response.data);
		const contextElement = $('#lentille-context');
		if (!contextElement.length) throw new Error("Context not found.");
		const dataObj = JSON.parse(contextElement.text().trim());
		console.log(dataObj);
		return dataObj.data?.article;
	}
	else return response.data?.currentData?.paste;
}

export function getResponseUser(response) {
	const author = response.author || response.user || {};
	return {
		uid: parseInt(author.uid),
		name: author.name,
		color: author.color
	};
}
