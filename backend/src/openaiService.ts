import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

// Load Based Guide
const BASED_GUIDE = fs.readFileSync(
	path.join(__dirname, "../docs/docs.txt"),
	"utf-8"
);

export async function generateBasedCode(userPrompt: string): Promise<string> {
	const response = await openai.chat.completions.create({
		model: "gpt-4",
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
