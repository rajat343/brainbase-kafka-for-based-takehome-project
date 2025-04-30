import { Bubble } from "./MessageBubble";
import { useRef } from "react";
import { Message } from "../types";

export const ChatPane = ({
	messages,
	send,
}: {
	messages: Message[];
	send: (txt: string) => void;
}) => {
	const inp = useRef<HTMLInputElement>(null);
	return (
		<div className="flex flex-col h-full">
			<div className="flex-1 overflow-y-auto space-y-1">
				{messages.map((m, i) => (
					<Bubble key={i} me={m.role === "user"} text={m.content} />
				))}
			</div>
			<input
				ref={inp}
				className="border rounded p-2 mt-2"
				placeholder="Say something…"
				onKeyDown={(e) => {
					if (e.key === "Enter" && inp.current!.value.trim()) {
						send(inp.current!.value);
						inp.current!.value = "";
					}
				}}
			/>
		</div>
	);
};
