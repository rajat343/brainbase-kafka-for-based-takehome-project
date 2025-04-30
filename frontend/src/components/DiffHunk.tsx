import { Hunk } from "../types";

export const DiffHunk = ({
	hunk,
	onToggle,
}: {
	hunk: Hunk;
	onToggle: (id: string) => void;
}) => {
	// Split into lines and color-code them
	const lines = hunk.text.split("\n");
	return (
		<div className="border rounded mb-2 overflow-auto">
			<pre className="font-mono text-xs p-2">
				{lines.map((line, i) => {
					let cls = "text-gray-700";
					if (line.startsWith("+")) cls = "text-green-600";
					else if (line.startsWith("-")) cls = "text-red-600";
					else if (line.startsWith("@@")) cls = "text-blue-500";
					return (
						<div key={i} className={cls}>
							{line}
						</div>
					);
				})}
			</pre>
			<div className="p-2 flex gap-2">
				<button
					className="px-2 py-1 bg-green-600 text-white rounded"
					onClick={() => onToggle(hunk.id)}
				>
					{hunk.selected ? "✅ keep" : "♻ restore"}
				</button>
				<button
					className="px-2 py-1 bg-red-600 text-white rounded"
					onClick={() => onToggle(hunk.id)}
				>
					{hunk.selected ? "❌ reject" : "🚫 undo"}
				</button>
			</div>
		</div>
	);
};
