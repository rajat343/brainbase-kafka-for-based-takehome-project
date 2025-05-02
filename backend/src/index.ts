import express, { Request, Response } from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import OpenAI from "openai";
import { folderName, saveFile, readFile } from "./utils";
import { generateBasedCode } from "./openaiService";
import {
	createDiffHunks,
	applySelectedHunks,
	Hunk,
	applyHunksToText,
} from "./diffEngine";
import { validateBasedFile } from "./validate";

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const PORT = process.env.PORT;
const BASE_URL = process.env.BASE_URL;

app.use(cors());
app.use(express.json());

let folder = "default_agent";

// REST APIs
app.get("/agent", (_req: Request, res: Response) => {
	const code = readFile(folder, "agent.based");
	res.type("text/plain").send(code);
});

app.post("/generate", async (req: Request, res: Response) => {
	try {
		const idea: string = req.body.idea;
		const code = await generateBasedCode(idea);
		folder = folderName(idea);
		saveFile(folder, "agent.based", code);
		await validateBasedFile(folder);
		res.json({ folder, code });
	} catch (err) {
		console.error("Generate error:", err);
		res.status(500).json({ error: "Failed to generate Based code" });
	}
});

app.post("/diff", async (req: Request, res: Response) => {
	try {
		const hunks = await createDiffHunks(folder, req.body.idea);
		res.json({ hunks });
	} catch (err) {
		console.error("Diff error:", err);
		res.status(500).json({ error: "Failed to create diffs" });
	}
});

app.post("/apply", async (req, res) => {
	try {
		const hunks = req.body.hunks as Hunk[];
		applySelectedHunks(folder, hunks);
		const updatedCode = readFile(folder, "agent.based");
		validateBasedFile(folder).catch((e) => console.error(e));
		res.json({ ok: true, code: updatedCode });
	} catch (err: any) {
		console.error("Apply error:", err);
		res.status(500).json({ ok: false, error: err.message });
	}
});

app.post("/run", async (_req: any, res: any) => {
	try {
		const pythonPath = path.join(__dirname, "../venv/bin/python");
		const pythonCmd = fs.existsSync(pythonPath) ? pythonPath : "python3";
		const setupPy = path.join(__dirname, "../runner/setup.py");
		const basedFile = path.join(
			process.cwd(),
			"outputs",
			folder,
			"agent.based"
		);
		const setupProc = spawn(pythonCmd, [setupPy, basedFile], {
			cwd: process.cwd(),
			env: process.env,
		});
		let out = "";
		setupProc.stdout.on("data", (b) => (out += b.toString()));
		setupProc.stderr.on("data", (b) =>
			console.error("[setup stderr]", b.toString())
		);
		await new Promise<void>((resolve, reject) => {
			setupProc.on("exit", (code) =>
				code === 0 ? resolve() : reject(new Error("setup.py failed"))
			);
			setupProc.on("error", reject);
		});
		const { worker_id, flow_id } = JSON.parse(out);
		const runnerPy = path.join(__dirname, "../runner/brainbase_runner.py");
		const runner = spawn(pythonCmd, [runnerPy, worker_id, flow_id], {
			cwd: process.cwd(),
			env: process.env,
			stdio: "inherit",
		});

		runner.on("spawn", () =>
			console.log("Runner started (PID:", runner.pid, ")")
		);
		runner.on("error", (err) =>
			console.error("Failed to start runner:", err)
		);
		return res.json({ ok: true, worker_id, flow_id });
	} catch (err: any) {
		console.error("Run error:", err);
		return res.status(500).json({ ok: false, error: err.message });
	}
});

app.post("/preview", (req, res) => {
	try {
		const hunks = req.body.hunks as Hunk[];
		const original = readFile(folder, "agent.based"); // read disk
		const previewCode = applyHunksToText(original, hunks); // in-memory only
		res.json({ code: previewCode });
	} catch (err: any) {
		console.error("Preview error:", err);
		res.status(500).json({ error: "Failed to preview changes" });
	}
});

// Web socket
wss.on("connection", async (ws: WebSocket) => {
	console.log("WebSocket client connected");
	const basedCode = readFile(folder, "agent.based");
	const history: {
		role: "system" | "user" | "assistant";
		content: string;
	}[] = [{ role: "system", content: basedCode }];
	try {
		const initial = await openai.chat.completions.create({
			model: "gpt-4-turbo",
			temperature: 0.5,
			messages: history,
		});
		const assistantMsg = initial.choices[0].message?.content || "";
		history.push({ role: "assistant", content: assistantMsg });
		ws.send(JSON.stringify({ role: "agent", content: assistantMsg }));
	} catch (err) {
		console.error("Initial greeting error:", err);
		ws.send(
			JSON.stringify({
				role: "agent",
				content: "Sorry, I couldn't start our conversation.",
			})
		);
	}
	ws.on("message", async (data) => {
		const userText = data.toString();
		history.push({ role: "user", content: userText });
		try {
			const reply = await openai.chat.completions.create({
				model: "gpt-4-turbo",
				temperature: 0.5,
				messages: history,
			});
			const assistantMsg = reply.choices[0].message?.content || "";
			history.push({ role: "assistant", content: assistantMsg });
			ws.send(JSON.stringify({ role: "agent", content: assistantMsg }));
		} catch (err) {
			console.error("Reply generation error:", err);
			ws.send(
				JSON.stringify({
					role: "agent",
					content: "I'm having trouble responding right now.",
				})
			);
		}
	});
	ws.on("close", () => console.log("WebSocket client disconnected"));
});

server.listen(PORT, () => {
	console.log(`Backend and Websocket listening on ${BASE_URL}:${PORT}`);
});
