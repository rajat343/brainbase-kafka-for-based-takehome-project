import express, { Request, Response } from "express";
import { generateDiff, validateDiff, applyDiff } from "./diffEngine";
import { generateBasedCode } from "./openaiService";
import {
	generateFolderNameFromPrompt,
	saveBasedFile,
	readBasedFile,
} from "./utils";
import { runBasedAgent } from "./runner";

const app = express();
const PORT = 3000;

let activeFolder = "default_folder"; // track current folder

app.use(express.json());

app.get("/agent", (_req: Request, res: Response) => {
	try {
		const content = readBasedFile(activeFolder, "agent.based");
		res.send(content);
	} catch (err) {
		res.status(500).json({ error: "Failed to read agent file." });
	}
});

app.post("/generate", async (req: Request, res: Response) => {
	try {
		const { idea } = req.body;
		const code = await generateBasedCode(idea);

		const folder = generateFolderNameFromPrompt(idea);
		activeFolder = folder;
		saveBasedFile(folder, "agent.based", code);

		res.json({ status: "finished", folder });
	} catch (err) {
		res.status(500).json({ error: "Failed to generate agent." });
	}
});

app.post("/diff", async (req: any, res: any) => {
	try {
		const { idea } = req.body;
		const base = readBasedFile(activeFolder, "agent.based");
		const diff = await generateDiff(base, idea);
		console.log("diff: ", diff);
		// const valid = validateDiff(diff);
		// if (!valid) {
		// 	return res.status(400).json({ error: "Invalid diff format." });
		// }

		saveBasedFile(activeFolder, "agent.patch", diff);
		res.json({ status: "diff_ready", diff });
	} catch (err) {
		res.status(500).json({ error: "Failed to generate diff." });
	}
});

app.post("/apply", (_req: any, res: any) => {
	try {
		const success = applyDiff(activeFolder, "agent.based", "agent.patch");
		if (!success) {
			return res.status(500).json({ error: "Failed to apply patch." });
		}
		res.json({ status: "applied" });
	} catch (err) {
		res.status(500).json({ error: "Patch application failed." });
	}
});

app.post("/run", async (_req: Request, res: Response) => {
	try {
		await runBasedAgent(activeFolder);
		res.json({ status: "running" });
	} catch (err) {
		res.status(500).json({ error: "Runner failed", details: err });
	}
});

app.listen(PORT, () => {
	console.log(`Kafka server listening on http://localhost:${PORT}`);
});
