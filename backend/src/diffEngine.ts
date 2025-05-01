import { readFile, saveFile } from "./utils";
import { generateBasedCode } from "./openaiService";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

export interface Hunk {
	id: string;
	text: string;
	selected: boolean;
}

export const createDiffHunks = async (
	folder: string,
	idea: string
): Promise<Hunk[]> => {
	const original = readFile(folder, "agent.based");
	const prompt = [
		"You are a Based-language diff engine. Produce a **unified diff**",
		"(no ``` fences) between the ORIGINAL and an updated version that",
		`implements: ${idea}`,
		"",
		"Format must include:",
		"- `--- a/agent.based` and `+++ b/agent.based` file headers",
		"- Hunk headers like `@@ -start,len +start,len @@`",
		"- `-` for removals, `+` for additions, space for context",
		"",
		"Here is the ORIGINAL:",
		"--------------------",
		original,
		"--------------------",
		"",
		"Output only the diff text.",
	].join("\n");
	let diff = await generateBasedCode(prompt);
	diff = diff
		.replace(/^\s*```[^\n]*\n/gm, "")
		.replace(/```/g, "")
		.trim();
	saveFile(folder, "agent.patch", diff);
	const lines = diff.split("\n");
	let i = 0;
	while (
		i < lines.length &&
		(lines[i].startsWith("--- ") || lines[i].startsWith("+++ "))
	) {
		i++;
	}
	const hunks: Hunk[] = [];
	while (i < lines.length) {
		if (lines[i].startsWith("@@ ")) {
			const start = i;
			i++;
			while (i < lines.length && !lines[i].startsWith("@@ ")) {
				i++;
			}
			const hunkLines = lines.slice(start, i);
			if (hunkLines.some((l) => l.startsWith("+") || l.startsWith("-"))) {
				hunks.push({
					id: `hunk${hunks.length}`,
					text: hunkLines.join("\n"),
					selected: true,
				});
			}
		} else {
			i++;
		}
	}
	return hunks;
};

export function applySelectedHunks(folder: string, hunks: Hunk[]) {
	const filePath = path.join(__dirname, `../outputs/${folder}/agent.based`);
	const original = readFileSync(filePath, "utf-8");
	const updated = applyHunksToText(original, hunks);
	writeFileSync(filePath, updated, "utf-8");
}

export function applyHunksToText(original: string, hunks: Hunk[]): string {
	const src = original.split("\n");
	let out: string[] = [],
		idx = 0;
	for (const h of hunks.filter((h) => h.selected)) {
		const lines = h.text.split("\n");
		const header = lines.shift()!;
		const start = parseInt(/@@ -(\d+)/.exec(header)![1], 10) - 1;
		while (idx < start) out.push(src[idx++]);
		for (const l of lines) {
			if (l.startsWith("+")) out.push(l.slice(1));
			else if (l.startsWith("-")) idx++;
			else out.push(src[idx++]);
		}
	}
	while (idx < src.length) out.push(src[idx++]);
	return out.join("\n");
}
