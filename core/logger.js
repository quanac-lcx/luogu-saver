import chalk from 'chalk';
import config from "../config.js";
import { formatDate } from "./utils.js";

export function info(msg) {
	console.log(`[INFO] [${formatDate(new Date())}] ${msg}`);
}

export function warn(msg) {
	console.log(`${chalk.yellow(`[WARN] [${formatDate(new Date())}] ${msg}`)}`);
}

export function error(msg) {
	console.error(`${chalk.red(`[ERROR] [${formatDate(new Date())}] ${msg}`)}`);
}

export function debug(msg) {
	if (config.debug) {
		console.log(`${chalk.greenBright(`[DEBUG] [${formatDate(new Date())}] ${msg}`)}`);
	}
}

export default { info, warn, error, debug };