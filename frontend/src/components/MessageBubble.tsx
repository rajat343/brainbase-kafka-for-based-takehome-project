export const Bubble = ({ me, text }: { me: boolean; text: string }) => (
	<div
		className={`p-2 rounded-lg text-sm max-w-xs ${
			me ? "bg-blue-100 ml-auto" : "bg-gray-200"
		}`}
	>
		{text}
	</div>
);
