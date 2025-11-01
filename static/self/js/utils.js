function parseUrl(url) {
	const userMatch = url.match(/\/user\/(\d+)$/);
	if (userMatch) {
		return { type: 'user', id: userMatch[1] };
	}
	
	if (url.length < 14) throw new Error("非法链接，请检查输入。");
	const tail = url.slice(-14);
	const tailMatch = tail.match(/^(paste|ticle)\/([a-zA-Z0-9]{8})$/);
	if (!tailMatch) throw new Error("非法链接，请检查输入。");
	
	const type = tailMatch[1] === "ticle" ? "article" : "paste";
	const id = tailMatch[2];
	if (type !== "article" && type !== "paste") throw new Error("非法链接，请检查输入。");
	
	return { type, id };
}
