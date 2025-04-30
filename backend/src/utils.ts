import fs from "fs";
import path from "path";

export const folderName = (prompt: string) =>
	prompt
		.toLowerCase()
		.replace(/[^a-z0-9 ]/g, "")
		.split(" ")
		.filter((w) => w.length > 1)
		.slice(0, 5)
		.join("_") || "agent";

export const ensureDir = (folder: string) => {
	const p = path.join(__dirname, `../outputs/${folder}`);
	if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
	return p;
};

export const saveFile = (folder: string, file: string, content: string) =>
	fs.writeFileSync(path.join(ensureDir(folder), file), content, "utf-8");

export const readFile = (folder: string, file: string) =>
	fs.readFileSync(
		path.join(__dirname, `../outputs/${folder}/${file}`),
		"utf-8"
	);
