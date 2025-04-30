import express, { Request, Response } from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { folderName, saveFile, readFile } from "./utils";
import { generateBasedCode } from "./openaiService";
import { createDiffHunks, applySelectedHunks, Hunk } from "./diffEngine";
import { validateBasedFile } from "./validate";

dotenv.config(); // ← load .env before anything else!

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

let folder = "default_agent";

/** GET current .based */
app.get("/agent", (_req: Request, res: Response) => {
	const code = readFile(folder, "agent.based");
	res.type("text/plain").send(code);
});

/** Generate initial Based file */
app.post("/generate", async (req, res) => {
	const idea: string = req.body.idea;
	const code = await generateBasedCode(idea);
	folder = folderName(idea);
	saveFile(folder, "agent.based", code);
	await validateBasedFile(folder);
	res.json({ folder, code });
});

/** Produce diff hunks */
app.post("/diff", async (req, res) => {
	const hunks = await createDiffHunks(folder, req.body.idea);
	res.json({ hunks });
});

/** Apply selected hunks */
app.post("/apply", async (req, res) => {
	applySelectedHunks(folder, req.body.hunks as Hunk[]);
	await validateBasedFile(folder);
	res.json({ ok: true });
});

/** === START THE REAL AGENT RUNNER === **/
app.post("/run", (req, res) => {
	// pick up venv/python3
	const venv = path.join(__dirname, "../venv/bin/python");
	const pythonCmd = fs.existsSync(venv) ? venv : "python3";

	const runnerScript = path.join(__dirname, "../runner/brainbase_runner.py");

	// spawn with 'inherit' so you see logs live in Node console
	const proc = spawn(pythonCmd, [runnerScript], {
		cwd: process.cwd(),
		env: process.env,
		stdio: "inherit",
	});

	proc.on("error", (err) => {
		console.error("🔥 Failed to start Python runner:", err);
	});
	proc.on("spawn", () => {
		console.log("🚀 Brainbase runner started (PID:", proc.pid, ")");
	});

	// immediately respond—runner stays alive in background
	res.json({ ok: true, message: "Agent runner started" });
});

/** === WEBSOCKET ECHO / PROXY === **/
interface Session {
	msgs: { role: string; content: string }[];
}

wss.on("connection", (ws: WebSocket) => {
	console.log("⚡ WebSocket client connected");
	const session: Session = { msgs: [] };

	ws.on("message", (data) => {
		const txt = data.toString();
		session.msgs.push({ role: "user", content: txt });
		// For now, echo back. Later proxy to brainbase_runner via some channel.
		const reply = { role: "agent", content: `Echo: ${txt}` };
		session.msgs.push(reply);
		ws.send(JSON.stringify(reply));
	});

	ws.on("close", () => console.log("🔌 WebSocket client disconnected"));
});

/** === START HTTP + WS SERVER === **/
server.listen(3000, () => {
	console.log("🌐 Backend + WS listening on http://localhost:3000");
});
