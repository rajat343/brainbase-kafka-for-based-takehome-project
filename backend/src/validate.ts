// backend/src/validate.ts

import { spawn } from "child_process";
import path from "path";
import fs from "fs";

/**
 * Runs the brainbase_checker.py script to validate the .based file in the given folder.
 * Logs checker output and rejects if validation fails.
 *
 * @param folder - Name of the outputs subfolder containing agent.based
 */
export async function validateBasedFile(folder: string): Promise<void> {
	return new Promise((resolve, reject) => {
		// 1. Locate the Python binary: venv if present, else system python3
		const venvPython = path.join(__dirname, "../venv/bin/python");
		const pythonCmd = fs.existsSync(venvPython) ? venvPython : "python3";

		// 2. Path to the checker script
		const checkerScript = path.join(
			__dirname,
			"../runner/brainbase_checker.py"
		);
		const cwd = path.join(__dirname, `../outputs/${folder}`);

		// 3. Spawn the process
		const proc = spawn(pythonCmd, [checkerScript], {
			cwd,
			env: process.env,
		});

		// 4. Log stdout
		proc.stdout.on("data", (data: Buffer) => {
			console.log(`[validate stdout] ${data.toString().trim()}`);
		});

		// 5. Log stderr
		proc.stderr.on("data", (data: Buffer) => {
			console.error(`[validate stderr] ${data.toString().trim()}`);
		});

		// 6. Handle exit
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

		// 7. Handle spawn errors
		proc.on("error", (err) => {
			reject(
				new Error(`Failed to start validation process: ${err.message}`)
			);
		});
	});
}
