import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const docsPath = path.join(__dirname, "../docs");
const docs = [
	"BASED_GUIDE.md",
	"BASED_LANGUAGE_FUNDAMENTALS.md",
	"BASED_CRASH_COURSE.md",
]
	.map((f) => fs.readFileSync(path.join(docsPath, f), "utf-8"))
	.join("\n\n");

export async function generateBasedCode(userPrompt: string): Promise<string> {
	const res = await openai.chat.completions.create({
		model: "gpt-4-turbo",
		temperature: 0.3,
		max_tokens: 2000,
		messages: [
			{
				role: "system",
				content: [
					"You are an expert in the Based language.",
					"When responding, OUTPUT ONLY the raw Based code that fulfills the user's request—no explanations, no markdown fences, no commentary.",
					"Use only the following reference material to guide code syntax and constructs:",
					docs,
				].join("\n\n"),
			},
			{ role: "user", content: userPrompt },
		],
	});
	let code = res.choices[0].message?.content || "";
	code = code.replace(/^\s*```[^\n]*\n/, "").replace(/\n```+\s*$/, "");
	return code.trim();
}
