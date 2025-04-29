import { generateBasedCode } from "./openaiService";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export async function generateDiff(
	original: string,
	idea: string
): Promise<string> {
	const prompt = `You are a diff generator. Given the Based code below and a change request, produce a unified diff.\n\nOriginal Based file:\n${original}\n\nUser request:\n${idea}\n\nOutput only a valid unified diff.`;
	return await generateBasedCode(prompt);
}

export function validateDiff(diff: string): boolean {
	return (
		diff.includes("@@") &&
		diff.includes("+++ agent.based") &&
		diff.includes("--- agent.based")
	);
}

export function applyDiff(
	folder: string,
	targetFile: string,
	patchFile: string
): boolean {
	const targetPath = path.join(
		__dirname,
		`../outputs/${folder}/${targetFile}`
	);
	const patchPath = path.join(__dirname, `../outputs/${folder}/${patchFile}`);

	try {
		let originalLines = fs.readFileSync(targetPath, "utf-8").split("\n");
		const patchLines = fs.readFileSync(patchPath, "utf-8").split("\n");

		let outputLines: string[] = [];
		let oIndex = 0;
		let pIndex = 0;

		while (pIndex < patchLines.length) {
			const patchLine = patchLines[pIndex];

			if (patchLine.startsWith("---") || patchLine.startsWith("+++")) {
				// Ignore headers
				pIndex++;
				continue;
			}

			if (patchLine.startsWith("@@")) {
				// Parse the hunk header
				const match = /@@ -(\d+),\d+ \+(\d+),\d+ @@/.exec(patchLine);
				if (match) {
					const [, origStart, newStart] = match.map(Number);
					// Copy unchanged lines until the hunk start
					while (oIndex < origStart - 1) {
						outputLines.push(originalLines[oIndex]);
						oIndex++;
					}
					pIndex++;
				} else {
					throw new Error("Invalid hunk header.");
				}
			} else if (patchLine.startsWith("-")) {
				// Remove the line from original
				oIndex++;
				pIndex++;
			} else if (patchLine.startsWith("+")) {
				// Add the new line
				outputLines.push(patchLine.slice(1));
				pIndex++;
			} else {
				// Context line, must match original
				outputLines.push(originalLines[oIndex]);
				oIndex++;
				pIndex++;
			}
		}

		// Copy remaining lines from original if any
		while (oIndex < originalLines.length) {
			outputLines.push(originalLines[oIndex]);
			oIndex++;
		}

		// Write the updated agent file
		fs.writeFileSync(targetPath, outputLines.join("\n"), "utf-8");

		console.log("Patch applied cleanly.");
		return true;
	} catch (err) {
		console.error("Patch application failed:", err);
		return false;
	}
}
