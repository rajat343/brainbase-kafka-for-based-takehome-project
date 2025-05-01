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

app.use(cors());
app.use(express.json());

let folder = "default_agent";

/** GET current .based file */
app.get("/agent", (_req: Request, res: Response) => {
	const code = readFile(folder, "agent.based");
	res.type("text/plain").send(code);
});

/** POST /generate: create initial Based code */
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

/** POST /diff: produce diff hunks */
app.post("/diff", async (req: Request, res: Response) => {
	try {
		const hunks = await createDiffHunks(folder, req.body.idea);
		res.json({ hunks });
	} catch (err) {
		console.error("Diff error:", err);
		res.status(500).json({ error: "Failed to create diffs" });
	}
});

/** POST /apply: apply selected hunks */
app.post("/apply", async (req, res) => {
	try {
		const hunks = req.body.hunks as Hunk[];
		applySelectedHunks(folder, hunks); // ← disk is updated here
		const updatedCode = readFile(folder, "agent.based");
		validateBasedFile(folder).catch((e) => console.error(e));
		res.json({ ok: true, code: updatedCode });
	} catch (err: any) {
		console.error("Apply error:", err);
		res.status(500).json({ ok: false, error: err.message });
	}
});

/** POST /run: launch the Python-based agent runner */
app.post("/run", (_req: Request, res: Response) => {
	const venvPy = path.join(__dirname, "../venv/bin/python");
	const pythonCmd = fs.existsSync(venvPy) ? venvPy : "python3";
	const runnerScript = path.join(__dirname, "../runner/brainbase_runner.py");
	const proc = spawn(pythonCmd, [runnerScript], {
		cwd: process.cwd(),
		env: process.env,
		stdio: "inherit",
	});
	proc.on("error", (err) => {
		console.error("Failed to start Python runner:", err);
	});
	proc.on("spawn", () => {
		console.log("Brainbase runner started (PID:", proc.pid, ")");
	});
	res.json({ ok: true, message: "Agent runner started" });
});

app.post("/preview", (req, res) => {
	try {
		const hunks = req.body.hunks as Hunk[];
		const original = readFile(folder, "agent.based");
		const previewCode = applyHunksToText(original, hunks);
		res.json({ code: previewCode });
	} catch (err: any) {
		console.error("Preview error:", err);
		res.status(500).json({ error: "Failed to preview changes" });
	}
});

/** WebSocket chat powered by OpenAI + Based code */
wss.on("connection", async (ws: WebSocket) => {
	console.log("WebSocket client connected");

	// Load the current .based file as system prompt
	const basedCode = readFile(folder, "agent.based");
	const history: {
		role: "system" | "user" | "assistant";
		content: string;
	}[] = [{ role: "system", content: basedCode }];

	// Send initial greeting
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

	// Handle incoming user messages
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

/** Start HTTP + WS server */
server.listen(3000, () => {
	console.log("Backend + WS listening on http://localhost:3000");
});
