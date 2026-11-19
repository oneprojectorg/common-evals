// Turn a Promptfoo results file into model x task score rows for the rubric
// spreadsheet (Category Scores tab).
//
//   node scripts/export-scores.ts                          # reads results/matrix.json
//   node scripts/export-scores.ts --input other.json --out scores.csv
//
// Produce the input with `just eval-matrix`, which writes results/matrix.json.
// Each row is one model on one task: case count, passes, pass rate, and mean
// score. An "all" row per model aggregates its tasks. The task label comes
// from each case's {{task}} instruction, which is stable across the
// hand-written and generated suites.

import { parse, string } from "@thi.ng/args";
import { readFile, writeFile } from "node:fs/promises";

interface ResultRow {
	model: string;
	task: string;
	success: boolean;
	score: number;
}

interface Aggregate {
	cases: number;
	passes: number;
	scoreSum: number;
}

/** Task label from the case's task instruction; see prompts/proposal-assistant.txt. */
const taskLabel = (task: string): string => {
	if (/^classify/i.test(task)) return "classification";
	if (/^summarize/i.test(task)) return "summarization";
	if (/merge/i.test(task)) return "merge";
	return "other";
};

/** Pull the flat result rows out of a Promptfoo results file, across versions. */
const extractRows = (json: Record<string, unknown>): ResultRow[] => {
	const results = (json.results ?? json) as Record<string, unknown>;
	const items = (Array.isArray(results) ? results : results.results) as
		| Record<string, unknown>[]
		| undefined;
	if (!Array.isArray(items)) throw new Error("no results array in input; is this a Promptfoo output file?");
	return items.map((item) => {
		const provider = item.provider as Record<string, unknown> | string | undefined;
		const model =
			typeof provider === "string"
				? provider
				: String(provider?.label ?? provider?.id ?? "unknown");
		const testCase = (item.testCase ?? item.test ?? {}) as Record<string, unknown>;
		const vars = (item.vars ?? testCase.vars ?? {}) as Record<string, unknown>;
		return {
			model,
			task: taskLabel(String(vars.task ?? "")),
			success: Boolean(item.success),
			score: Number(item.score ?? 0),
		};
	});
};

const csvField = (value: string): string => (/[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);

const toCsv = (rows: ResultRow[]): string => {
	const groups = new Map<string, Aggregate>();
	for (const row of rows) {
		for (const task of [row.task, "all"]) {
			const key = `${row.model}\u0000${task}`;
			const group = groups.get(key) ?? { cases: 0, passes: 0, scoreSum: 0 };
			group.cases += 1;
			if (row.success) group.passes += 1;
			group.scoreSum += row.score;
			groups.set(key, group);
		}
	}
	const lines = ["model,task,cases,passes,pass_rate,mean_score"];
	for (const key of [...groups.keys()].sort()) {
		const [model, task] = key.split("\u0000");
		const { cases, passes, scoreSum } = groups.get(key)!;
		lines.push(
			[
				csvField(model),
				task,
				String(cases),
				String(passes),
				(passes / cases).toFixed(3),
				(scoreSum / cases).toFixed(3),
			].join(","),
		);
	}
	return lines.join("\n") + "\n";
};

const specs = {
	input: string({ alias: "i", desc: "Promptfoo results JSON", default: "results/matrix.json" }),
	out: string({ alias: "o", desc: "Write CSV here instead of stdout", default: "" }),
};

const main = async (): Promise<number> => {
	const parsed = parse(specs, process.argv, {
		usageOpts: { color: false, prefix: "Usage: node scripts/export-scores.ts [options]\n\n" },
	});
	if (!parsed) return 0;
	const { result: opts } = parsed;

	const json = JSON.parse(await readFile(opts.input, "utf8")) as Record<string, unknown>;
	const csv = toCsv(extractRows(json));
	if (opts.out) {
		await writeFile(opts.out, csv);
		console.log(`wrote ${opts.out}`);
	} else {
		process.stdout.write(csv);
	}
	return 0;
};

main().then(
	(code) => process.exit(code),
	(error) => {
		console.error((error as Error).message);
		process.exit(1);
	},
);
