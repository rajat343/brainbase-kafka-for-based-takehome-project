import express, { Request, Response } from "express";
import { generateBasedCode } from "./openaiService";
import { generateFilenameFromPrompt, saveBasedFile } from "./utils";

const app = express();
const PORT = 3000;

app.use(express.json());

app.post("/generate", async (req: any, res: any) => {
	const { idea } = req.body;
	if (!idea) {
		return res
			.status(400)
			.json({ error: "Missing 'idea' in request body." });
	}

	try {
		const basedCode = await generateBasedCode(idea);
		const filename = generateFilenameFromPrompt(idea);

		saveBasedFile(filename, basedCode);

		res.json({ status: "finished" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to generate Based code." });
	}
});

app.listen(PORT, () => {
	console.log(`Kafka backend running on http://localhost:${PORT}`);
});
