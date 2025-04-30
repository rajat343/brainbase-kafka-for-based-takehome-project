import { generateBasedCode } from "./openaiService";
import { readFile, saveFile } from "./utils";

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
	const diffPrompt = `Generate a unified diff with @@ hunks to implement:\n${idea}\n\nOriginal file:\n${original}`;
	const diff = await generateBasedCode(diffPrompt);
	saveFile(folder, "agent.patch", diff);
	return diff
		.split(/(?=@@)/)
		.filter(Boolean)
		.map((t, i) => ({ id: `h${i}`, text: t, selected: true }));
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
