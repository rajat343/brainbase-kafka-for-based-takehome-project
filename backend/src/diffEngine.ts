import { readFile, saveFile } from "./utils";
import { generateBasedCode } from "./openaiService";

export interface Hunk {
	id: string;
	text: string;
	selected: boolean;
}

export const createDiffHunks = async (
	folder: string,
	idea: string
): Promise<Hunk[]> => {
	// 1. Read original .based
	const original = readFile(folder, "agent.based");

	// 2. Build a prompt that *requires* proper diff headers + hunks
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

	// 3. Get the diff from the LLM
	let diff = await generateBasedCode(prompt);

	// 4. Strip any stray code-fences
	diff = diff
		.replace(/^\s*```[^\n]*\n/gm, "")
		.replace(/```/g, "")
		.trim();

	// 5. Save full patch for debugging
	saveFile(folder, "agent.patch", diff);

	// 6. Split into lines and skip the first two lines if they're file headers
	const lines = diff.split("\n");
	let i = 0;
	while (
		i < lines.length &&
		(lines[i].startsWith("--- ") || lines[i].startsWith("+++ "))
	) {
		i++;
	}

	// 7. Extract real hunks (those beginning with @@)
	const hunks: Hunk[] = [];
	while (i < lines.length) {
		if (lines[i].startsWith("@@ ")) {
			const start = i;
			i++;
			// Collect until next hunk or end
			while (i < lines.length && !lines[i].startsWith("@@ ")) {
				i++;
			}
			const hunkLines = lines.slice(start, i);
			// Only keep if there is at least one addition or removal
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

export const applySelectedHunks = (folder: string, hunks: Hunk[]) => {
	const src = readFile(folder, "agent.based").split("\n");
	let out: string[] = [];
	let idx = 0;
	hunks
		.filter((h) => h.selected)
		.forEach((h) => {
			const lines = h.text.split("\n");
			const header = lines.shift()!;
			const [, aStr] = /@@ -(\d+)/.exec(header)!;
			const a = Number(aStr) - 1;
			while (idx < a) out.push(src[idx++]);
			lines.forEach((l) => {
				if (l.startsWith("+")) out.push(l.slice(1));
				else if (l.startsWith("-")) idx++;
				else out.push(src[idx++]);
			});
		});
	while (idx < src.length) out.push(src[idx++]);
	saveFile(folder, "agent.based", out.join("\n"));
};

export function applyHunksToText(original: string, hunks: Hunk[]): string {
	const srcLines = original.split("\n");
	let out: string[] = [];
	let idx = 0;
	// Only process hunks with `selected === true`
	hunks
		.filter((h) => h.selected)
		.forEach((h) => {
			const lines = h.text.split("\n");
			const header = lines.shift()!;
			const match = /@@ -(\d+)/.exec(header);
			const start = match ? parseInt(match[1], 10) - 1 : idx;
			// copy lines up to this hunk
			while (idx < start) {
				out.push(srcLines[idx]);
				idx++;
			}
			// apply the hunk’s changes
			lines.forEach((l) => {
				if (l.startsWith("+")) {
					out.push(l.slice(1));
				} else if (l.startsWith("-")) {
					idx++;
				} else {
					out.push(srcLines[idx]);
					idx++;
				}
			});
		});
	// copy any remaining lines
	while (idx < srcLines.length) {
		out.push(srcLines[idx]);
		idx++;
	}
	return out.join("\n");
}
