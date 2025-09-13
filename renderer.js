import markdownit from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";
import markdownItContainer from "markdown-it-container";

export function createMarkdownRenderer() {
	const md = markdownit({
		html: true,
		linkify: true,
		typographer: true
	}).use(markdownItAttrs)
	
	md.use(markdownItContainer, "align", {
		render: (tokens, idx) => {
			if (tokens[idx].nesting === 1) {
				const m = tokens[idx].attrs ? (tokens[idx].attrs[0]?.length ? tokens[idx].attrs[0][0] : "") : "";
				const cls = m ? `md-align-${m}` : "md-align-center";
				return `<div class="${cls}">`;
			} else return "</div>";
		},
	});
	
	md.use(markdownItContainer, "epigraph", {
		render: (tokens, idx) => {
			if (tokens[idx].nesting === 1) {
				return `<div class="md-epigraph"><div class="epigraph-body">`;
			} else {
				const m = tokens[idx].info.match(/\[(.*)\]/);
				const author = m ? m[1] : "";
				const authorHtml = author
					? `<span class="epigraph-author">${md.utils.escapeHtml(author)}</span>`
					: "";
				return `</div>${authorHtml}</div>`;
			}
		},
	});
	
	["info", "warning", "success"].forEach((name) => {
		md.use(markdownItContainer, name, {
			render: (tokens, idx) => {
				const info = tokens[idx].info || "";
				if (tokens[idx].nesting === 1) {
					const titleMatch = info.match(/\[(.*?)\]/);
					const openMatch = info.match(/\{(.*?)\}/);
					const title = titleMatch ? titleMatch[1] : name.toUpperCase();
					const open = (tokens[idx].attrs ? (tokens[idx].attrs[0]?.length ? tokens[idx].attrs[0][0] : "") : "") === "open";
					let icon = "fa fa-";
					if (name === "success") icon = icon + "check-circle";
					else if (name === "warning") icon = icon + "warning";
					else icon = icon + "info-circle";
					return `<div class="md-block ${name}"><div class="md-block-title"><span>${title}</span><i class="toggle-btn fa fa-caret-${open ? "down" : "right"}"></i></div><div class="md-block-body"${open ? "" : ' style="display:none"'}>`;
				} else {
					return `</div></div>`;
				}
			},
		});
	});
	
	md.use(markdownItContainer, "cute-table", {
		render: (tokens, idx) => {
			return "";
		}
	});
	
	function renderMarkdown(src) {
		const startTime = Date.now();
		const size = Buffer.byteLength(src || '', 'utf8');
		
		const pattern = /^(:{2,})([\w|-]+)(\s*\[.*?\])?(\s*\{.*?\})?$/;
		function preprocessLine(line) {
			const match = line.match(pattern);
			if (match) {
				const colons = match[1];
				const word = match[2];
				let bracket = match[3] || "";
				let brace = match[4] || "";
				if (bracket) bracket = " " + bracket.trim();
				if (brace) brace = " " + brace.trim();
				return `${colons} ${word}${bracket}${brace}`.trim();
			}
			return line;
		}
		
		const preprocessed = src.split(/\r?\n/).map(preprocessLine).join("\n");
		
		const uid = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
		const codePlaceholder = (i) => `CODE?PLACEHOLDER${uid}?${i}?`;
		const mathDisplayPlaceholder = (i) => `MATH?DISPLAY${uid}?${i}?`;
		const mathInlinePlaceholder = (i) => `MATH?INLINE${uid}?${i}?`;
		
		const codeBlocks = [];
		const codeHtmlBlocks = [];
		const mathBlocks = [];
		
		const codeRegex = /((?:^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2(?=\n|$))|(`+)([\s\S]*?)\3/g;
		const mathRegex = /\$\$([\s\S]*?)\$\$|\$([^\$]+?)\$/g;
		
		let processed = preprocessed.replace(codeRegex, function(match) {
			const idx = codeBlocks.push(match) - 1;
			try {
				codeHtmlBlocks[idx] = md.render(match);
			} catch (e) {
				codeHtmlBlocks[idx] = '<pre><code>' + md.utils.escapeHtml(match) + '</code></pre>';
			}
			return codePlaceholder(idx);
		});
		
		processed = processed.replace(mathRegex, function(match, block, inline) {
			if (block !== undefined) {
				const idx = mathBlocks.push(block) - 1;
				return mathDisplayPlaceholder(idx);
			} else {
				const idx = mathBlocks.push(inline) - 1;
				return mathInlinePlaceholder(idx);
			}
		});
		
		console.log(processed);
		
		let resultHtml;
		try {
			resultHtml = md.render(processed);
		} catch (err) {
			logger.warn('md.render failed' + err);
			return `<p>渲染失败：${md.utils ? md.utils.escapeHtml(err.message) : 'render error'}</p>`;
		}
		
		function escapeHtmlInMath(str) {
			if (!str) return "";
			return String(str)
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;");
		}
		
		for (let i = 0; i < mathBlocks.length; i++) {
			const display = mathDisplayPlaceholder(i);
			const inline = mathInlinePlaceholder(i);
			resultHtml = resultHtml.split(display).join(`$$${escapeHtmlInMath(mathBlocks[i])}$$`);
			resultHtml = resultHtml.split(inline).join(`$${escapeHtmlInMath(mathBlocks[i])}$`);
		}
		
		for (let i = 0; i < codeHtmlBlocks.length; i++) {
			const ph = codePlaceholder(i);
			resultHtml = resultHtml.split(ph).join(codeHtmlBlocks[i] || '');
		}
		
		function replaceUI(s) {
			return s.split('<table>')
					.join('<div class="table-container"><table class="ui structured celled table">')
					.split('</table>')
					.join('</table></div>');
		}
		
		resultHtml = replaceUI(resultHtml);
		
		const endTime = Date.now();
		logger.debug(`Markdown rendered in ${endTime - startTime}ms. Size: ${size} bytes. Output: ${resultHtml.length} chars.`);
		return resultHtml;
	}
	
	return { renderMarkdown };
}

