import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export async function validateBasedFile(folder: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const venvPython = path.join(__dirname, "../venv/bin/python");
		const pythonCmd = fs.existsSync(venvPython) ? venvPython : "python3";
		const checkerScript = path.join(
			__dirname,
			"../runner/brainbase_checker.py"
		);
		const cwd = path.join(__dirname, `../outputs/${folder}`);
		const proc = spawn(pythonCmd, [checkerScript], {
			cwd,
			env: process.env,
		});
		proc.stdout.on("data", (data: Buffer) => {
			console.log(`[validate stdout] ${data.toString().trim()}`);
		});
		proc.stderr.on("data", (data: Buffer) => {
			console.error(`[validate stderr] ${data.toString().trim()}`);
		});
		proc.on("exit", (code) => {
			if (code === 0) {
				console.log("[validate] Based file is valid.");
				resolve();
			} else {
				reject(
					new Error(`Based validation failed (exit code ${code}).`)
				);
			}
		});
		proc.on("error", (err) => {
			reject(
				new Error(`Failed to start validation process: ${err.message}`)
			);
		});
	});
}
