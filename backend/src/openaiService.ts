import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

// Dynamically load and combine all docs
const docsPath = path.join(__dirname, "../docs");

const BASED_GUIDE = [
	"BASED_LANGUAGE_FUNDAMENTALS.md",
	"BASED_GUIDE.md",
	"BASED_CRASH_COURSE.md",
]
	.map((fileName) => fs.readFileSync(path.join(docsPath, fileName), "utf-8"))
	.join("\n\n"); // join with double line break

export async function generateBasedCode(userPrompt: string): Promise<string> {
	const response = await openai.chat.completions.create({
		model: "gpt-4-turbo",
		messages: [
			{
				role: "system",
				content: `You are the world expert at writing Based (.based) files.
Use only the Based documentation below to respond. Write Based code clearly and correctly.

${BASED_GUIDE}
`,
			},
			{
				role: "user",
				content: userPrompt,
			},
		],
		temperature: 0.3,
		max_tokens: 1500,
	});

	return response.choices[0].message?.content || "";
}
