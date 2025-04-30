import express, { Request, Response } from "express";
import http from "http";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { folderName, saveFile, readFile } from "./utils";
import { generateBasedCode } from "./openaiService";
import { createDiffHunks, applySelectedHunks, Hunk } from "./diffEngine";
import { validateBasedFile } from "./validate";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
app.use(cors());
app.use(express.json());

let folder = "default_agent";

/* -------- REST -------- */

app.get("/agent", (_req: Request, res: Response) => {
	const content = readFile(folder, "agent.based");
	res.send(content);
});

app.post("/generate", async (req: Request, res: Response) => {
	const idea = req.body.idea;
	const code = await generateBasedCode(idea);
	folder = folderName(idea);
	saveFile(folder, "agent.based", code);
	await validateBasedFile(folder);
	res.json({ folder, code });
});

app.post("/diff", async (req: Request, res: Response) => {
	try {
		const hunks = await createDiffHunks(folder, req.body.idea);
		res.json({ hunks });
	} catch (err) {
		res.status(500).json({ error: "Failed to create diff hunks" });
	}
});

app.post("/apply", async (req, res) => {
	applySelectedHunks(folder, req.body.hunks as Hunk[]);
	await validateBasedFile(folder);
	res.json({ ok: true });
});

/* -------- WS -------- */
interface Session {
	msgs: { role: string; content: string }[];
}
wss.on("connection", (ws: WebSocket) => {
	const session: Session = { msgs: [] };
	ws.on("message", (d) => {
		const txt = d.toString();
		session.msgs.push({ role: "user", content: txt });
		const reply = { role: "agent", content: `Echo: ${txt}` };
		session.msgs.push(reply);
		ws.send(JSON.stringify(reply));
	});
});

server.listen(3000, () =>
	console.log("Backend (HTTP+WS) on http://localhost:3000")
);
