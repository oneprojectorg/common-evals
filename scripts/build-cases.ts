// Turn downloaded datasets into Promptfoo test files under tests/generated/.
//
//   node scripts/build-cases.ts                       # every builder whose data is present
//   node scripts/build-cases.ts --per-label 3 --seed 7 cambridge-classification
//
// Builders (each needs its dataset in data/raw/, see `just download`):
//   cambridge-classification        committee label for a Cambridge PB idea
//   la-fires-classification         AI-assigned topic for an LA Fires comment
//   state-employees-summarization   one-sentence idea extracted from a comment
//
// Author names are never copied into a case. Cases use the same {{task}} and
// {{input}} variables as the hand-written tests, so prompts/proposal-assistant.txt
// serves them unchanged. The script also writes promptfooconfig.generated.yaml,
// a copy of promptfooconfig.yaml whose tests are the generated files, because
// passing two configs to promptfoo merges their prompts and doubles every run.

import { flag, int, parse } from "@thi.ng/args";
import { parse as parseCsv } from "csv-parse/sync";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml, stringify } from "yaml";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const RAW = join(ROOT, "data", "raw");
const OUT = join(ROOT, "tests", "generated");
const MAIN_CONFIG = join(ROOT, "promptfooconfig.yaml");
const GENERATED_CONFIG = join(ROOT, "promptfooconfig.generated.yaml");

const CLASSIFY_TASK =
	"Classify the proposal into exactly one of the decision's categories: {{categories}}. Give one short reason.";

type Row = Record<string, string>;

interface TestCase {
	description: string;
	vars: Record<string, string>;
	assert: { type: string; value: string }[];
}

type Builder = (perLabel: number, rng: () => number) => Promise<TestCase[] | undefined>;

/** Read a CSV with a header row; undefined when the file is missing. */
const readCsv = async (path: string): Promise<Row[] | undefined> => {
	const text = await readFile(path, "utf8").catch(() => undefined);
	if (text === undefined) return undefined;
	return parseCsv(text, { columns: true, bom: true, relax_column_count: true }) as Row[];
};

/** mulberry32: a small seeded generator so a seed always yields the same sample. */
const seeded = (seed: number): (() => number) => {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

/** Up to perLabel rows for each distinct label value, in label order. */
const samplePerLabel = (rows: Row[], label: string, perLabel: number, rng: () => number): Row[] => {
	const groups = new Map<string, Row[]>();
	for (const row of rows) {
		const value = (row[label] ?? "").trim();
		if (value) groups.set(value, [...(groups.get(value) ?? []), row]);
	}
	const chosen: Row[] = [];
	for (const value of [...groups.keys()].sort()) {
		const pool = [...groups.get(value)!];
		for (let i = pool.length - 1; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1));
			[pool[i], pool[j]] = [pool[j], pool[i]];
		}
		chosen.push(...pool.slice(0, perLabel));
	}
	return chosen;
};

const classificationCase = (description: string, text: string, categories: string[], label: string): TestCase => ({
	description,
	vars: { task: CLASSIFY_TASK, categories: categories.join("; "), input: text },
	assert: [
		{ type: "contains", value: `CLASSIFICATION: ${label}` },
		{ type: "llm-rubric", value: `Classifies the proposal as ${label} and gives a reason grounded in the text.` },
	],
});

const cambridgeClassification: Builder = async (perLabel, rng) => {
	// The Socrata CSV export uses display names ("PB Cycle"), not API field names.
	const all = await readCsv(join(RAW, "cambridge-pb", "ideas.csv"));
	if (!all) return undefined;
	// Committees changed across cycles; use the latest cycle's set so the
	// label list is one a single decision would actually configure.
	const latest = Math.max(...all.map((r) => Number(r["PB Cycle"])));
	const rows = all.filter((r) => Number(r["PB Cycle"]) === latest && r["Project Description"]?.trim());
	const categories = [...new Set(rows.map((r) => r.Committee.trim()).filter(Boolean))].sort();
	return samplePerLabel(rows, "Committee", perLabel, rng).map((row) => {
		const label = row.Committee.trim();
		const text = `Title: ${row["Project Title"].trim()}\n\nSummary: ${row["Project Description"].trim()}`;
		return classificationCase(`Cambridge PB${latest} idea ${row["Idea #"]} is ${label}`, text, categories, label);
	});
};

const laFiresClassification: Builder = async (perLabel, rng) => {
	const rows = await readCsv(join(RAW, "engaged-ca-la-fires", "wildfire_agenda_setting_comments.csv"));
	if (!rows) return undefined;
	const categories = [...new Set(rows.map((r) => r.TOPIC.trim()).filter(Boolean))].sort();
	return samplePerLabel(rows, "TOPIC", perLabel, rng).map((row) => {
		const label = row.TOPIC.trim();
		return classificationCase(
			`LA Fires comment ${row.COMMENT_ID} is ${label}`,
			`Comment: ${row.COMMENT.trim()}`,
			categories,
			label,
		);
	});
};

const stateEmployeesSummarization: Builder = async (perLabel, rng) => {
	const rows = await readCsv(join(RAW, "engaged-ca-state-employees", "State_employees_all_ideas.csv"));
	if (!rows) return undefined;
	// One idea per comment keeps the reference unambiguous.
	const byComment = new Map<string, Row[]>();
	for (const row of rows) {
		if (!row.COMMENT?.trim() || !row.IDEA_TEXT?.trim()) continue;
		byComment.set(row.IDEA_COMMENT_ID, [...(byComment.get(row.IDEA_COMMENT_ID) ?? []), row]);
	}
	// Themes are a "; "-separated list; sample per first (primary) theme.
	const single = [...byComment.values()]
		.filter((group) => group.length === 1)
		.map(([row]) => ({ ...row, PRIMARY_THEME: row.IDEA_MAIN_THEMES_LIST.split(";")[0].trim() }));
	return samplePerLabel(single, "PRIMARY_THEME", perLabel, rng).map((row) => ({
		description: `State employee comment ${row.IDEA_COMMENT_ID}: extract the idea`,
		vars: {
			task: "Summarize the comment as one or two sentences stating the concrete idea it proposes.",
			input: `Comment: ${row.COMMENT.trim()}`,
		},
		assert: [
			{
				type: "llm-rubric",
				value: `States the same idea as this reference, with no added proposals and no dropped essential detail: "${row.IDEA_TEXT.trim()}"`,
			},
		],
	}));
};

const BUILDERS: Record<string, Builder> = {
	"cambridge-classification": cambridgeClassification,
	"la-fires-classification": laFiresClassification,
	"state-employees-summarization": stateEmployeesSummarization,
};

const specs = {
	perLabel: int({ alias: "n", desc: "Cases per label value", default: 2 }),
	seed: int({ alias: "s", desc: "Sampling seed", default: 1 }),
	list: flag({ alias: "l", desc: "Print the builders and exit" }),
};

const main = async (): Promise<number> => {
	const parsed = parse(specs, process.argv, {
		usageOpts: {
			color: false,
			prefix: "Usage: node scripts/build-cases.ts [options] [builder ...]\n\nWith no builder named, every builder whose data is present runs.\n\n",
		},
	});
	if (!parsed) return 0;
	const { result: opts, rest: names } = parsed;

	if (opts.list) {
		for (const name of Object.keys(BUILDERS)) console.log(name);
		return 0;
	}
	const unknown = names.filter((name) => !(name in BUILDERS));
	if (unknown.length) {
		console.error(`unknown builder(s): ${unknown.join(", ")}; choose from ${Object.keys(BUILDERS).join(", ")}`);
		return 2;
	}

	await mkdir(OUT, { recursive: true });
	const built: string[] = [];
	for (const name of names.length ? names : Object.keys(BUILDERS)) {
		const cases = await BUILDERS[name](opts.perLabel, seeded(opts.seed));
		if (!cases) {
			console.log(`${name}: data not downloaded, skipped`);
			continue;
		}
		const out = join(OUT, `${name}.yaml`);
		const header = `# Generated by scripts/build-cases.ts from data/raw; do not edit. Seed ${opts.seed}, ${opts.perLabel} per label.\n`;
		await writeFile(out, header + stringify(cases, { lineWidth: 100 }));
		console.log(`${name}: ${cases.length} cases -> ${relative(ROOT, out)}`);
		built.push(out);
	}
	if (!built.length) return 1;
	await writeGeneratedConfig(built);
	return 0;
};

/** Copy the main config with its tests replaced by the generated files. */
const writeGeneratedConfig = async (files: string[]): Promise<void> => {
	const config = parseYaml(await readFile(MAIN_CONFIG, "utf8")) as Record<string, unknown>;
	config.description = "Common proposal evaluation on catalog datasets";
	config.tests = files.map((file) => `file://${relative(ROOT, file)}`);
	const header =
		"# Generated by scripts/build-cases.ts from promptfooconfig.yaml; do not edit.\n" +
		"# Same prompt, providers, and defaultTest as the main config; only the tests differ.\n";
	await writeFile(GENERATED_CONFIG, header + stringify(config, { lineWidth: 100 }));
	console.log(`config: ${relative(ROOT, GENERATED_CONFIG)}`);
};

main().then(
	(code) => process.exit(code),
	(error) => {
		console.error((error as Error).message);
		process.exit(1);
	},
);
