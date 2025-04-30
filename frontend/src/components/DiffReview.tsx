import { Hunk } from "../types";
import { DiffHunk } from "./DiffHunk";

export const DiffReview = ({
	hunks,
	onToggle,
	onApply,
}: {
	hunks: Hunk[];
	onToggle: (id: string) => void;
	onApply: () => void;
}) => (
	<div className="border rounded p-2 h-80 overflow-y-auto">
		<h2 className="font-semibold mb-1">Diff Review</h2>
		{hunks.map((h) => (
			<DiffHunk key={h.id} hunk={h} onToggle={onToggle} />
		))}
		{hunks.length > 0 && (
			<button
				onClick={onApply}
				className="w-full bg-green-700 text-white py-1 rounded mt-2"
			>
				Apply selected hunks
			</button>
		)}
	</div>
);
