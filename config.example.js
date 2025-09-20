export default {
	debug: true,
	port: 55086,
	database: {
		host: 'localhost',
		port: 3306,
		user: 'luogu_saver',
		password: 'your_password',
		database: 'luogu_save'
	},
	pagination: {
		search: 10,
		problem: 50
	},
	request: {
		concurrency: 2,
		maxRequestToken: 20,
		tokenRefillInterval: 1000
	},
	jwtSecret: 'your_jwt_secret',
	requestHeader: {
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
	}
}