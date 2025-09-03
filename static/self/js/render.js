import {createHighlighter} from 'https://esm.sh/shiki@latest';

async function renderShiki() {
	try {
		const highlighter = await createHighlighter({
			themes: ['github-light'],
			langs: [
				'cpp',
				'c',
				'javascript',
				'python',
				'html',
				'css',
				'java',
				'typescript',
				'markdown',
				'json',
				'sql',
				'bash',
				'diff',
				'text',
				'go',
				'rust',
				'haskell',
				'php',
				'kotlin',
				'swift',
				'ruby'
			]
		});
		
		document.querySelectorAll('pre').forEach(pre => {
			if (pre.closest('.code-container')) return;
			let code = pre.textContent.trim();
			if (!code) return;
			const codeElement = pre.querySelector('code');
			let lang = 'cpp';
			if (codeElement) {
				let language = 'cpp';
				let langClassFound = false;
				codeElement.classList.forEach(className => {
					if (className.startsWith('language-')) {
						language = className.substring('language-'.length);
						langClassFound = true;
					}
				});
				lang = language;
			}
			const container = document.createElement('div');
			container.classList.add('code-container');
			
			try {
				const supportedLangs = highlighter.getLoadedLanguages();
				if (!supportedLangs.includes(lang)) {
					lang = 'text';
				}

				container.innerHTML = highlighter.codeToHtml(code, {
					lang: lang,
					theme: 'github-light'
				});
			} catch (e) {
				container.innerHTML = `<pre><code>${escapeHtml(code)}</code></pre>`;
			}
			pre.replaceWith(container);
		});
	} catch (error) {
		console.error('代码高亮加载失败:', error);
	}
}

document.addEventListener("DOMContentLoaded", () => {
	document.querySelectorAll(".md-block .md-block-title").forEach((title) => {
		title.addEventListener("click", () => {
			const body = title.nextElementSibling;
			const btn = title.querySelector(".toggle-btn");
			const open = body.style.display !== "none";
			body.style.display = open ? "none" : "block";
			btn.className = !open ? "fa fa-caret-down toggle-btn" : "fa fa-caret-right toggle-btn";
		});
	});
});

async function renderAll() {
	try {
		renderMathInElement(document.body, {
			delimiters: [
				{left: '$$', right: '$$', display: true},
				{left: '$', right: '$', display: false},
			],
			throwOnError : false
		});
		$('.ui.text.loader').text("渲染 Shiki 中...");
		await renderShiki();
		
	} catch (err) {
		console.error("渲染失败：", err);
	} finally {
		const loader = document.getElementById("render-loader");
		if (loader) loader.classList.remove("active");
		const content = document.getElementById("render-content");
		const container = document.getElementById("render-container");
		content.style.display = "block";
		container.style.minHeight = "auto";
		$(content).transition('fade in');
	}
}

window.addEventListener("DOMContentLoaded", () => { renderAll(); });
