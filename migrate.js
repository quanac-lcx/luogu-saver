import { AppDataSource } from "./app.js";

export async function migrate() {
	await AppDataSource.initialize();
	
	logger.info("开始数据迁移：将 user 表的 introduction 列迁移到 user_introduction 表");
	
	try {
		logger.info("步骤 1: 创建 user_introduction 表并迁移数据");
		await AppDataSource.query(`
			INSERT INTO user_introduction (user_uid, introduction, created_at, updated_at)
			SELECT id, introduction, created_at, updated_at
			FROM user
			WHERE introduction IS NOT NULL
		`);
		
		logger.info("步骤 2: 删除 user 表的 introduction 列");
		await AppDataSource.query(`
			ALTER TABLE user DROP COLUMN introduction
		`);
		
		logger.info("迁移完成！");
	} catch (error) {
		logger.error("迁移失败:", error.message);
		throw error;
	}
	
	process.exit(0);
}

migrate();
