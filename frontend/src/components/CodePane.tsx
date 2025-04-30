import { Prism as Syntax } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/cjs/styles/prism";
export const CodePane = ({ code }: { code: string }) => (
	<Syntax language="python" style={dracula} customStyle={{ height: "100%" }}>
		{code || "# (waiting for code…)"}
	</Syntax>
);
