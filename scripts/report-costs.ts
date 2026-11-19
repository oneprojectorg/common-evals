// Print what a Promptfoo results file cost, per model and in total.
//
//   node scripts/report-costs.ts                                # reads results/matrix.json
//   node scripts/report-costs.ts --input other.json --grader-in 1.4 --grader-out 4.4
//
// Promptfoo computes each result's provider cost from the inputCost and
// outputCost set on the provider in promptfooconfig.yaml, but it never costs
// the grading calls and never prints a dollar total. This script sums both:
// provider cost from each result, and grading cost from each rubric call's
// tokens times the grader's price per million tokens. The defaults are the
// GLM-5.3 prices on Together AI; pass --grader-in/--grader-out when grading
// with another model.

import { float, parse, string } from "@thi.ng/args";
import { readFile } from "node:fs/promises";

interface ModelCost {
	cases: number;
	provider: number;
	graderPrompt: number;
	graderCompletion: number;
	unpriced: number;
}

const specs = {
	input: string({ alias: "i", desc: "Promptfoo results JSON", default: "results/matrix.json" }),
	graderIn: float({ desc: "Grader price per 1M prompt tokens", default: 1.4 }),
	graderOut: float({ desc: "Grader price per 1M completion tokens", default: 4.4 }),
};

const main = async (): Promise<number> => {
	const parsed = parse(specs, process.argv, {
		usageOpts: { color: false, prefix: "Usage: node scripts/report-costs.ts [options]\n\n" },
	});
	if (!parsed) return 0;
	const { result: opts } = parsed;

	const json = JSON.parse(await readFile(opts.input, "utf8")) as Record<string, unknown>;
	const results = (json.results ?? json) as Record<string, unknown>;
	const items = (Array.isArray(results) ? results : results.results) as
		| Record<string, unknown>[]
		| undefined;
	if (!Array.isArray(items)) throw new Error("no results array in input; is this a Promptfoo output file?");

	const models = new Map<string, ModelCost>();
	for (const item of items) {
		const provider = item.provider as Record<string, unknown> | string | undefined;
		const model =
			typeof provider === "string"
				? provider
				: String(provider?.label ?? provider?.id ?? "unknown");
		const entry = models.get(model) ?? { cases: 0, provider: 0, graderPrompt: 0, graderCompletion: 0, unpriced: 0 };
		entry.cases += 1;
		if (typeof item.cost === "number" && Number.isFinite(item.cost)) entry.provider += item.cost;
		else entry.unpriced += 1;
		const grading = (item.gradingResult ?? {}) as Record<string, unknown>;
		for (const comp of (grading.componentResults ?? []) as Record<string, unknown>[]) {
			const tokens = comp.tokensUsed as Record<string, number> | undefined;
			entry.graderPrompt += tokens?.prompt ?? 0;
			entry.graderCompletion += tokens?.completion ?? 0;
		}
		models.set(model, entry);
	}

	const usd = (value: number): string => `$${value.toFixed(4)}`;
	const graderCost = (entry: ModelCost): number =>
		(entry.graderPrompt * opts.graderIn + entry.graderCompletion * opts.graderOut) / 1e6;

	const rows = [...models.entries()].sort(
		(a, b) => b[1].provider + graderCost(b[1]) - (a[1].provider + graderCost(a[1])),
	);
	let providerTotal = 0;
	let gradingTotal = 0;
	let unpriced = 0;
	console.log("model | cases | provider | grading | total");
	for (const [model, entry] of rows) {
		const grading = graderCost(entry);
		providerTotal += entry.provider;
		gradingTotal += grading;
		unpriced += entry.unpriced;
		console.log(`${model} | ${entry.cases} | ${usd(entry.provider)} | ${usd(grading)} | ${usd(entry.provider + grading)}`);
	}
	console.log(`total | | ${usd(providerTotal)} | ${usd(gradingTotal)} | ${usd(providerTotal + gradingTotal)}`);
	if (unpriced) {
		console.log(`${unpriced} result(s) carry no cost; their provider lacks inputCost/outputCost in promptfooconfig.yaml.`);
	}
	console.log(`Grading priced at $${opts.graderIn}/$${opts.graderOut} per 1M tokens; cached results cost nothing new.`);
	return 0;
};

main().then(
	(code) => process.exit(code),
	(error) => {
		console.error((error as Error).message);
		process.exit(1);
	},
);
