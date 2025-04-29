import fs from "fs";
import path from "path";

export function generateFolderNameFromPrompt(prompt: string): string {
	const words = prompt
		.toLowerCase()
		.replace(/[^a-zA-Z0-9 ]/g, "")
		.split(" ")
		.filter((w) => w.length > 2)
		.slice(0, 5)
		.join("_");
	return words || "agent";
}

export function saveBasedFile(
	folder: string,
	filename: string,
	content: string
): void {
	try {
		const folderPath = path.join(__dirname, `../outputs/${folder}`);
		if (!fs.existsSync(folderPath)) {
			fs.mkdirSync(folderPath, { recursive: true });
		}
		const fullPath = path.join(folderPath, filename);
		fs.writeFileSync(fullPath, content, "utf-8");
	} catch (err) {
		console.error(`Failed to save ${filename} in ${folder}:`, err);
	}
}

export function readBasedFile(folder: string, filename: string): string {
	try {
		return fs.readFileSync(
			path.join(__dirname, `../outputs/${folder}/${filename}`),
			"utf-8"
		);
	} catch (err) {
		console.error(`Failed to read ${filename} in ${folder}:`, err);
		return "";
	}
}

export function isValidBasedCode(code: string): boolean {
	const hasLoop = code.includes("loop:");
	const hasTalk = code.includes("talk(");
	const hasUntil = code.includes('until "');

	return hasLoop && hasTalk && hasUntil;
}
