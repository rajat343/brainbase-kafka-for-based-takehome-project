import React, { useState, useRef } from "react";
import { CodePane } from "./components/CodePane";
import { Loader } from "./components/Loader";
import { DiffReview } from "./components/DiffReview";
import { ChatPane } from "./components/ChatPane";
import { Hunk, Message } from "./types";

const API = "http://localhost:3000";

export default function App() {
	// State
	const [code, setCode] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(false);
	const [hunks, setHunks] = useState<Hunk[]>([]);
	const [msgs, setMsgs] = useState<Message[]>([]);
	const socketRef = useRef<WebSocket | null>(null);
	const [hasWS, setHasWS] = useState<boolean>(false);

	// Generate initial .based
	const generate = async () => {
		const idea = prompt("Describe the agent") || "";
		if (!idea) return;
		setLoading(true);
		try {
			const res = await fetch(`${API}/generate`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idea }),
			});
			const { code } = await res.json();
			setCode(code);
		} catch (err) {
			console.error(err);
			alert("Failed to generate agent");
		} finally {
			setLoading(false);
		}
	};

	// Draft diff hunks
	const draftDiff = async () => {
		const idea = prompt("Describe a change") || "";
		if (!idea) return;
		try {
			const res = await fetch(`${API}/diff`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idea }),
			});
			const { hunks } = await res.json();
			setHunks(hunks);
		} catch (err) {
			console.error(err);
			alert("Failed to draft diff");
		}
	};

	// Toggle a hunk’s selected state
	const toggleHunk = async (id: string) => {
		// update local state
		const newHunks = hunks.map((h) =>
			h.id === id ? { ...h, selected: !h.selected } : h
		);
		setHunks(newHunks);
		// call /preview for an in-memory patch
		try {
			const resp = await fetch(`${API}/preview`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ hunks: newHunks }),
			});
			const { code: previewCode } = await resp.json();
			setCode(previewCode);
		} catch (err) {
			console.error("Preview failed:", err);
		}
	};

	// Apply selected hunks and re-fetch the updated code
	const apply = async () => {
		try {
			const resp = await fetch(`${API}/apply`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ hunks }),
			});
			const { ok, code: updatedCode, error } = await resp.json();
			if (!ok) throw new Error(error || "Apply failed");

			setCode(updatedCode!);
			setHunks([]);
		} catch (err: any) {
			console.error("Apply failed:", err);
			alert("Error applying changes: " + err.message);
		}
	};

	// Start the Python agent runner, then open WebSocket
	const startAgent = async () => {
		try {
			const resp = await fetch(`${API}/run`, { method: "POST" });
			if (!resp.ok) throw new Error("Runner failed");
			// Open WebSocket after runner is launched
			const socket = new WebSocket("ws://localhost:3000/ws");
			socket.onmessage = (e) => {
				const msg = JSON.parse(e.data) as Message;
				setMsgs((prev) => [...prev, msg]);
			};
			socketRef.current = socket;
			setHasWS(true);
		} catch (err) {
			console.error(err);
			alert("Could not start agent: " + err);
		}
	};

	// Send a message over WebSocket
	const sendChat = (text: string) => {
		const userMsg: Message = { role: "user", content: text };
		setMsgs((prev) => [...prev, userMsg]);
		socketRef.current?.send(text);
	};

	return (
		<div className="h-screen grid grid-cols-2 gap-2 p-4 bg-gray-100">
			{/* Left pane: controls, code, diff */}
			<div className="flex flex-col space-y-2">
				<div className="space-x-2">
					<button className="btn" onClick={generate}>
						Generate .based
					</button>
					<button className="btn bg-yellow-500" onClick={draftDiff}>
						Draft diff
					</button>
					<button className="btn bg-green-600" onClick={startAgent}>
						Create Agent &amp; Chat
					</button>
				</div>

				<div className="flex-1 border rounded overflow-auto">
					{loading ? <Loader /> : <CodePane code={code} />}
				</div>

				<DiffReview
					hunks={hunks}
					onToggle={toggleHunk}
					onApply={apply}
				/>
			</div>

			{/* Right pane: chat */}
			<div className="border rounded p-2 h-full">
				{hasWS ? (
					<ChatPane messages={msgs} send={sendChat} />
				) : (
					<p className="h-full flex items-center justify-center text-gray-500">
						Create agent to start chatting →
					</p>
				)}
			</div>

			{/* Tailwind “btn” utility */}
			<style>{`.btn{@apply bg-blue-600 text-white px-3 py-2 rounded}`}</style>
		</div>
	);
}
