import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const docsPath = path.join(__dirname, "../docs");
const BASED_GUIDE = [
	"BASED_LANGUAGE_FUNDAMENTALS.md",
	"BASED_GUIDE.md",
	"BASED_CRASH_COURSE.md",
]
	.map((file) => fs.readFileSync(path.join(docsPath, file), "utf-8"))
	.join("\n\n");

export async function generateBasedCode(userPrompt: string): Promise<string> {
	const response = await openai.chat.completions.create({
		model: "gpt-4-turbo",
		messages: [
			{
				role: "system",
				content: `You are an expert Based agent writer. Use only the documentation below to generate Based code.\n\n${BASED_GUIDE}`,
			},
			{ role: "user", content: userPrompt },
		],
		temperature: 0.3,
		max_tokens: 2000,
	});

	return response.choices[0].message?.content || "";
}
