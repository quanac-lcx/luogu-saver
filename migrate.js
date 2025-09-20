import { AppDataSource } from "./app.js";

export async function migrate() {
	await AppDataSource.initialize();
	
	const truncateQueries = [
		"SET FOREIGN_KEY_CHECKS = 0;",
		"TRUNCATE TABLE user;",
		"TRUNCATE TABLE paste;",
		"TRUNCATE TABLE article_version;",
		"TRUNCATE TABLE task;",
		"TRUNCATE TABLE article;"
	];
	
	const insertQueries = [
		// users → user
		`INSERT INTO user (id, name, color)
         SELECT id, name, color FROM users;`,
		
		// pastes → paste
		`INSERT INTO paste (id, title, content, author_uid, created_at, updated_at, deleted, deleted_reason)
         SELECT id, title, content, author_uid, created_at, updated_at, deleted, deleted_reason
         FROM pastes;`,
		
		// article_versions → article_version
		`INSERT INTO article_version (id, origin_id, version, content, created_at, title)
         SELECT id, origin_id, version, content, created_at, title FROM article_versions;`,
		
		// tasks → task
		`INSERT INTO task (id, info, status, created_at, expire_time, type, oid)
         SELECT id, info, status, created_at, expire_time, type, oid FROM tasks;`,
		
		// articles → article
		`INSERT INTO article (id, title, content, author_uid, category, upvote, favor_count,
                              solution_for_pid, created_at, updated_at, priority, tags,
                              deleted, deleted_reason, content_hash)
         SELECT id, title, content, author_uid, category, upvote, favorCount,
                solutionFor_pid, created_at, updated_at, priority, tags,
                deleted, deleted_reason, content_hash
         FROM articles;`,
		"SET FOREIGN_KEY_CHECKS = 1;"
	];
	
	for (const sql of [...truncateQueries, ...insertQueries]) {
		logger.info("Running:", sql.split(" ")[0], sql.includes("TRUNCATE") ? sql.split(" ")[2] : "");
		await AppDataSource.query(sql);
	}
	
	logger.info("Migration completed!");
	process.exit(0);
}

migrate();