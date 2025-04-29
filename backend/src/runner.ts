import { spawn } from "child_process";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

export async function runBasedAgent(folder: string): Promise<void> {
	const scriptPath = path.join(__dirname, "../runner/brainbase_runner.py");

	const pythonPath = path.join(__dirname, "../venv/bin/python");

	const proc = spawn(pythonPath, [scriptPath], {
		cwd: path.join(__dirname, `../outputs/${folder}`),
		env: {
			...process.env,
			WORKER_ID: process.env.WORKER_ID || "default-worker",
			FLOW_ID: process.env.FLOW_ID || "default-flow",
			API_KEY: process.env.BRAINBASE_API_KEY || "",
		},
	});

	proc.stdout.on("data", (data) => console.log(data.toString()));
	proc.stderr.on("data", (data) => console.error(data.toString()));

	await new Promise((resolve, reject) => {
		proc.on("exit", (code) => (code === 0 ? resolve(0) : reject(code)));
	});
}
