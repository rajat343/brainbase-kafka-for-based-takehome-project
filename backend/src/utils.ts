import fs from "fs";
import path from "path";

// Function to create a safe filename from prompt
export function generateFilenameFromPrompt(prompt: string): string {
	const words = prompt
		.toLowerCase()
		.replace(/[^a-zA-Z0-9 ]/g, "") // remove special chars
		.split(" ")
		.filter((word) => word.length > 2) // ignore tiny words
		.slice(0, 5) // pick first 5 meaningful words
		.join("_");

	const filename = words || "based_agent";
	return `${filename}.based`;
}

// Function to save code to outputs/
export function saveBasedFile(filename: string, content: string): void {
	const outputDir = path.join(__dirname, "../outputs");

	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir);
	}

	const fullPath = path.join(outputDir, filename);
	fs.writeFileSync(fullPath, content, { encoding: "utf-8" });
}
