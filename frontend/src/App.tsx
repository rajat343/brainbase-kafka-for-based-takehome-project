import { useRef, useState } from "react";
import { CodePane } from "./components/CodePane";
import { Loader } from "./components/Loader";
import { DiffReview } from "./components/DiffReview";
import { Hunk, Message } from "./types";
import { ChatPane } from "./components/ChatPane";

const API = "http://localhost:3000";

export default function App() {
	const [code, setCode] = useState("");
	const [loading, setLoading] = useState(false);
	const [hunks, setHunks] = useState<Hunk[]>([]);
	const [msgs, setMsgs] = useState<Message[]>([]);
	const ws = useRef<WebSocket | null>(null);

	/* ----- helpers ----- */
	const gen = async () => {
		const idea = prompt("Describe the agent") || "";
		if (!idea) return;
		setLoading(true);
		const r = await fetch(`${API}/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ idea }),
		}).then((r) => r.json());
		setCode(r.code);
		setLoading(false);
	};

	const draftDiff = async () => {
		const idea = prompt("Describe change") || "";
		if (!idea) return;
		const { hunks } = await fetch(`${API}/diff`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ idea }),
		}).then((r) => r.json());
		setHunks(hunks);
	};

	const toggleHunk = (id: string) =>
		setHunks((h) =>
			h.map((x) => (x.id === id ? { ...x, selected: !x.selected } : x))
		);

	const apply = async () => {
		await fetch(`${API}/apply`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ hunks }),
		});
		const c = await fetch(`${API}/agent`).then((r) => r.text());
		setCode(c);
		setHunks([]);
	};

	const createWS = () => {
		ws.current = new WebSocket("ws://localhost:3000/ws");
		ws.current.onmessage = (e) =>
			setMsgs((m) => [...m, JSON.parse(e.data)]);
	};

	const sendChat = (txt: string) => {
		setMsgs((m) => [...m, { role: "user", content: txt }]);
		ws.current?.send(txt);
	};

	/* ----- UI ----- */
	return (
		<div className="h-screen grid grid-cols-2 gap-2 p-4 bg-gray-100">
			{/* Controls / Code / Diff */}
			<div className="flex flex-col space-y-2">
				<div className="space-x-2">
					<button className="btn" onClick={gen}>
						Generate .based
					</button>
					<button className="btn bg-yellow-500" onClick={draftDiff}>
						Draft diff
					</button>
					<button className="btn bg-green-600" onClick={createWS}>
						Create Agent
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

			{/* Chat */}
			<div className="border rounded p-2 h-full">
				{ws.current ? (
					<ChatPane messages={msgs} send={sendChat} />
				) : (
					<p className="h-full flex items-center justify-center text-gray-500">
						Create agent to start chatting →
					</p>
				)}
			</div>

			{/* btn utility */}
			<style>{`.btn{@apply bg-blue-600 text-white px-3 py-2 rounded}`}</style>
		</div>
	);
}
