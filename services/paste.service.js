import Paste from "../models/paste.js";

export async function savePaste(task, obj) {
	const newPaste = Paste.create({
		id: task.aid,
		title: task.aid,
		content: obj.content,
		author_uid: obj.userData.uid
	});
	await newPaste.save();
}

export async function getPasteById(id) {
	if (id.length !== 8) throw new Error("Invalid paste ID.");
	
	const paste = await Paste.findById(id);
	if (!paste) return null;
	
	await paste.loadRelationships();
	paste.formatDate();
	
	if (paste.deleted) throw new Error(paste.deleted_reason);
	
	const sanitizedContent = utils.sanitizeLatex(paste.content);
	const renderedContent = renderer.renderMarkdown(sanitizedContent);
	
	return { paste, renderedContent };
}