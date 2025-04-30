export interface Hunk {
	id: string;
	text: string;
	selected: boolean;
}
export interface Message {
	role: "user" | "agent";
	content: string;
}
