import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { EntitySchema } from "typeorm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixSchema(schema) {
	if (schema.columns) {
		for (const [name, col] of Object.entries(schema.columns)) {
			if (col.default === "CURRENT_TIMESTAMP") {
				col.default = () => "CURRENT_TIMESTAMP";
			}
		}
	}
	return schema;
}

export function loadEntities() {
	const dir = path.join(__dirname);
	const files = fs.readdirSync(dir);
	
	return files
		.filter(file => file.endsWith(".entity.json"))
		.map(file => {
			const raw = fs.readFileSync(path.join(dir, file), "utf-8");
			const schema = JSON.parse(raw);
			return new EntitySchema(fixSchema(schema));
		});
}
