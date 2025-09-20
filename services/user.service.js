import User from "../models/user.js";

export async function upsertUser(userData) {
	if (!userData || !userData.uid) return;
	const { uid, name, color } = userData;
	
	const user = (await User.findById(uid)) || User.create({ id: uid });
	user.name = name;
	user.color = color;
	await user.save();
}
