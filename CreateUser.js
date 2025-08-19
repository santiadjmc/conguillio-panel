#!/usr/bin/env node
// Simple CLI to create a user using the project's DB and utils
require('dotenv').config();

const readline = require('readline');
const db = require('./mysql/db');
const utils = require('./utils');
const data = require('./data/data');
// Ensure tables exist (no-op if already created)
require('./mysql/mainQuerys');

function isTTY() {
	return process.stdin.isTTY && process.stdout.isTTY;
}

function createInterface() {
	return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(rl, question) {
	return new Promise(resolve => rl.question(question, ans => resolve(ans.trim())));
}

async function askHidden(question) {
	if (!isTTY()) {
		// Fallback when not in a TTY
		const rl = createInterface();
		const ans = await ask(rl, question);
		rl.close();
		return ans;
	}
	return new Promise(resolve => {
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
		const onData = char => {
			char = char + '';
			switch (char) {
				case '\n':
				case '\r':
				case '\u0004':
					process.stdin.removeListener('data', onData);
					process.stdout.write('\n');
					rl.pause();
					resolve(buffer.join(''));
					break;
				case '\u0003': // Ctrl+C
					process.stdout.write('\n');
					process.exit(130);
					break;
				default:
					buffer.push(char);
					process.stdout.write('*');
					break;
			}
		};
		const buffer = [];
		rl.question(question, () => {});
		process.stdin.on('data', onData);
	});
}

function isValidEmail(email) {
	// Simple but practical
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseArgs() {
	const args = process.argv.slice(2);
	const out = {};
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a.startsWith('--')) {
			const key = a.slice(2);
			const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
			out[key] = val;
		}
	}
	return out;
}

async function ensureNoDuplicates(username, email) {
	const rows = await db.query('SELECT id, username, email FROM users WHERE username = ? OR email = ?', [username, email]);
	if (rows && rows.length) {
		const conflicts = [];
		if (rows.find(r => r.username === username)) conflicts.push('username');
		if (rows.find(r => r.email === email)) conflicts.push('email');
		throw new Error(`Already taken: ${conflicts.join(', ')}`);
	}
}

async function insertUser({ username, name, email, password, admin }) {
	const key = data.server.encryptionKey;
	if (!key || ![16, 24, 32].includes(key.length)) {
		throw new Error('ENCRYPTION_KEY is missing or invalid length (must be 16, 24, or 32 chars)');
	}
	const encryptedPassword = utils.encryptWithAES(key, password);
	const payload = { username, name, email, password: encryptedPassword, admin: !!admin };
	const res = await db.query('INSERT INTO users SET ?', [payload]);
	return res?.insertId;
}

async function interactiveCreate() {
	const rl = createInterface();
	try {
		console.log('Create a new user');
		console.log('Press Ctrl+C to cancel.');

		let username = await ask(rl, 'Username: ');
		while (!username || username.length < 3) {
			console.log('Username must be at least 3 characters.');
			username = await ask(rl, 'Username: ');
		}

		let name = await ask(rl, 'Name: ');
		while (!name || name.length < 2) {
			console.log('Name must be at least 2 characters.');
			name = await ask(rl, 'Name: ');
		}

		let email = await ask(rl, 'Email: ');
		while (!isValidEmail(email)) {
			console.log('Please enter a valid email.');
			email = await ask(rl, 'Email: ');
		}

		rl.pause();
		const password = await askHidden('Password: ');
		if (!password || password.length < 6) {
			console.log('Password must be at least 6 characters.');
			process.exit(1);
		}
		const adminAns = (await (async () => { rl.resume(); return ask(rl, 'Admin? (y/N): '); })()).toLowerCase();
		const admin = adminAns === 'y' || adminAns === 'yes';

		await ensureNoDuplicates(username, email);
		const id = await insertUser({ username, name, email, password, admin });

		console.log('User created successfully');
		if (id !== undefined) console.log('ID:', id);
		console.log('Username:', username);
		console.log('Admin:', admin ? 'Yes' : 'No');
	} finally {
		rl.close();
		// Best effort to end when using a real MySQL connection
		if (typeof db.end === 'function') {
			try { db.end(); } catch (_) {}
		}
	}
}

async function nonInteractiveCreate(args) {
	const required = ['username', 'name', 'email', 'password'];
	const missing = required.filter(k => !args[k]);
	if (missing.length) {
		console.error(`Missing required args: ${missing.join(', ')}`);
		process.exit(1);
	}
	if (!isValidEmail(args.email)) {
		console.error('Invalid email.');
		process.exit(1);
	}
	if (String(args.username).length < 3) {
		console.error('Username must be at least 3 characters.');
		process.exit(1);
	}
	if (String(args.password).length < 6) {
		console.error('Password must be at least 6 characters.');
		process.exit(1);
	}

	const admin = ['1', 'true', 'yes', 'y'].includes(String(args.admin).toLowerCase());
	await ensureNoDuplicates(args.username, args.email);
	const id = await insertUser({
		username: args.username,
		name: args.name,
		email: args.email,
		password: args.password,
		admin
	});
	console.log(JSON.stringify({ status: 'ok', id, username: args.username, admin }, null, 2));
}

async function main() {
	try {
		const args = parseArgs();
		if (Object.keys(args).length > 0) {
			await nonInteractiveCreate(args);
		} else {
			await interactiveCreate();
		}
	} catch (err) {
		console.error('Error:', err.message || err);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

