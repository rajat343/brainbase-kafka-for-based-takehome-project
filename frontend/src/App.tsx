import { useState, useRef, useEffect } from "react";
import { CodePane } from "./components/CodePane";
import { Loader } from "./components/Loader";
import { DiffReview } from "./components/DiffReview";
import { ChatPane } from "./components/ChatPane";
import { Hunk, Message } from "./types";

const BACKEND_BASE_URL = "http://localhost:3000";

export default function App() {
	// Code and diff state
	const [code, setCode] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(false);
	const [hunks, setHunks] = useState<Hunk[]>([]);

	// Chat state
	const [msgs, setMsgs] = useState<Message[]>([]);
	const socketRef = useRef<WebSocket | null>(null);
	const [hasWS, setHasWS] = useState<boolean>(false);

	// Generate a new .based file from a user idea
	const generate = async () => {
		const idea = prompt("Describe the agent") || "";
		if (!idea) return;
		setLoading(true);
		try {
			const res = await fetch(`${BACKEND_BASE_URL}/generate`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idea }),
			});
			const { code: newCode } = await res.json();
			setCode(newCode);
			setHunks([]);
		} catch (err) {
			console.error("Generate error:", err);
			alert("Failed to generate agent");
		} finally {
			setLoading(false);
		}
	};

	// Request diff hunks for a proposed change
	const draftDiff = async () => {
		const idea = prompt("Describe a change") || "";
		if (!idea) return;
		try {
			const res = await fetch(`${BACKEND_BASE_URL}/diff`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idea }),
			});
			const { hunks: newHunks } = await res.json();
			setHunks(newHunks);
		} catch (err) {
			console.error("Diff error:", err);
			alert("Failed to draft diff");
		}
	};

	// Preview the in-memory application of hunks
	const previewHunks = async (hunksToPreview: Hunk[]) => {
		try {
			const resp = await fetch(`${BACKEND_BASE_URL}/preview`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ hunks: hunksToPreview }),
			});
			const { code: previewCode } = await resp.json();
			setCode(previewCode);
		} catch (err) {
			console.error("Preview failed:", err);
		}
	};

	// Whenever the hunks array changes, immediately update the preview
	useEffect(() => {
		if (hunks.length > 0) {
			previewHunks(hunks);
		}
	}, [hunks]);

	// Commit selected hunks to disk and fetch the final code
	const apply = async () => {
		try {
			const resp = await fetch(`${BACKEND_BASE_URL}/apply`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ hunks }),
			});
			const { ok, code: updatedCode, error } = await resp.json();
			if (!ok) throw new Error(error || "Apply failed");
			setCode(updatedCode!);
			setHunks([]); // clear diffs
		} catch (err) {
			console.error("Apply error:", err);
			alert("Error applying changes: " + err);
		}
	};

	const toggleHunk = (id: string) => {
		setHunks((prev) =>
			prev.map((h) => (h.id === id ? { ...h, selected: !h.selected } : h))
		);
	};

	useEffect(() => {
		if (hunks.length > 0) previewHunks(hunks);
	}, [hunks]);

	const startAgent = async () => {
		try {
			const res = await fetch(`${BACKEND_BASE_URL}/run`, {
				method: "POST",
			});
			if (!res.ok) throw new Error("Runner start failed");
			const ws = new WebSocket("ws://localhost:3000/ws");
			ws.onmessage = (e) => {
				const msg = JSON.parse(e.data) as Message;
				setMsgs((prev) => [...prev, msg]);
			};
			socketRef.current = ws;
			setHasWS(true);
		} catch (err) {
			console.error("Run error:", err);
			alert("Could not start agent: " + err);
		}
	};

	// Send user chat text over Websocket
	const sendChat = (text: string) => {
		setMsgs((prev) => [...prev, { role: "user", content: text }]);
		socketRef.current?.send(text);
	};

	return (
		<div className="h-screen grid grid-cols-2 gap-2 p-4 bg-gray-100">
			{/* Left pane: Controls, Code, Diff */}
			<div className="flex flex-col space-y-2">
				<div className="flex space-x-4 mb-4">
					<button
						className="btn bg-blue-600 hover:bg-blue-700"
						onClick={generate}
					>
						Generate .based
					</button>
					<button
						className="btn bg-yellow-500 hover:bg-yellow-600"
						onClick={draftDiff}
					>
						Draft diff
					</button>
					<button
						className="btn bg-green-600 hover:bg-green-700"
						onClick={startAgent}
					>
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

			{/* Right pane: Chat */}
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
			<style>{`
				.btn {
					@apply text-white px-6 py-3 rounded transition;
				}
			`}</style>
		</div>
	);
}
