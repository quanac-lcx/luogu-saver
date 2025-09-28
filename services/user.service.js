/**
 * 用户服务模块
 * 
 * 该模块提供用户管理相关的服务功能，包括：
 * - 用户数据的创建和更新操作
 * - 用户信息的插入或更新（Upsert）操作
 * - 用户属性管理（名称、颜色等）
 * 
 * @author Copilot
 */

import User from "../models/user.js";

/**
 * 插入或更新用户数据
 * 
 * 根据提供的用户数据创建新用户或更新现有用户信息。
 * 如果用户不存在则创建新用户，如果存在则更新用户属性。
 * 
 * @param {Object} userData - 用户数据对象
 * @param {string|number} userData.uid - 用户ID
 * @param {string} userData.name - 用户名
 * @param {string} userData.color - 用户颜色标识
 * @returns {Promise<void>}
 */
export async function upsertUser(userData) {
	if (!userData || !userData.uid) return;
	const { uid, name, color } = userData;
	
	const user = (await User.findById(uid)) || User.create({ id: uid });
	user.name = name;
	user.color = color;
	await user.save();
}
