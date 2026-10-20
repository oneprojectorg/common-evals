// Download the datasets listed in data/catalog.yaml into data/raw/<id>/.
//
//   node scripts/download.ts --list
//   node scripts/download.ts cambridge-pb somerville-pb
//   node scripts/download.ts --all [--force]
//
// Each dataset folder gets a manifest.json with the URL, size, SHA-256, and
// fetch time of every file. Archives marked `unzip: true` in the catalog are
// extracted next to the archive. Existing files are skipped unless --force is
// given. Datasets whose access is not `public` are reported with their access
// note and skipped. Files are fetched with GET: Decidim exports redirect to
// presigned object-storage URLs that reject HEAD.

import { flag, parse } from "@thi.ng/args";
import { unzipSync } from "fflate";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CATALOG = join(ROOT, "data", "catalog.yaml");
const RAW = join(ROOT, "data", "raw");
const USER_AGENT = "common-evals-catalog/0.1 (+https://github.com/oneprojectorg/common)";

interface FileSpec {
	name: string;
	url: string;
	format?: string;
	unzip?: boolean;
}

interface Dataset {
	id: string;
	name: string;
	access: "public" | "blocked" | "internal" | "request" | "unreleased";
	access_note?: string;
	files: FileSpec[];
}

interface ManifestEntry {
	url: string;
	bytes: number;
	sha256: string;
	fetched_at: string;
	extracted?: string[];
}

type Manifest = Record<string, ManifestEntry>;

const loadCatalog = async (): Promise<Dataset[]> =>
	(parseYaml(await readFile(CATALOG, "utf8")) as { datasets: Dataset[] }).datasets;

/** Stream url into dest with a GET request and return its manifest entry. */
const fetchFile = async (url: string, dest: string): Promise<ManifestEntry> => {
	const response = await fetch(url, { headers: { "user-agent": USER_AGENT }, redirect: "follow" });
	if (!response.ok || !response.body) {
		throw new Error(`HTTP ${response.status} ${response.statusText}`);
	}
	const hash = createHash("sha256");
	let bytes = 0;
	const tally = new Transform({
		transform(chunk: Buffer, _encoding, callback) {
			hash.update(chunk);
			bytes += chunk.length;
			callback(null, chunk);
		},
	});
	const partial = `${dest}.part`;
	await pipeline(Readable.fromWeb(response.body), tally, createWriteStream(partial));
	await rename(partial, dest);
	return { url, bytes, sha256: hash.digest("hex"), fetched_at: new Date().toISOString() };
};

/** Extract archive into folder, flattening paths and skipping macOS resource forks. */
const extract = async (archive: string, folder: string): Promise<string[]> => {
	const entries = unzipSync(new Uint8Array(await readFile(archive)));
	const names: string[] = [];
	for (const [path, data] of Object.entries(entries)) {
		if (path.startsWith("__MACOSX/") || path.endsWith("/")) continue;
		const name = basename(path);
		await writeFile(join(folder, name), data);
		names.push(name);
	}
	return names;
};

const download = async (dataset: Dataset, force: boolean): Promise<boolean> => {
	const folder = join(RAW, dataset.id);
	await mkdir(folder, { recursive: true });
	const manifestPath = join(folder, "manifest.json");
	const manifest: Manifest = await readFile(manifestPath, "utf8")
		.then((text) => JSON.parse(text) as Manifest)
		.catch(() => ({}));
	let ok = true;
	for (const spec of dataset.files) {
		const dest = join(folder, spec.name);
		const exists = await readFile(dest).then(() => true, () => false);
		let fetched = false;
		if (exists && !force) {
			console.log(`  skip ${relative(ROOT, dest)} (exists)`);
		} else {
			console.log(`  get  ${spec.url}`);
			try {
				manifest[spec.name] = await fetchFile(spec.url, dest);
			} catch (error) {
				console.error(`  FAIL ${spec.name}: ${(error as Error).message}`);
				ok = false;
				continue;
			}
			fetched = true;
			console.log(`       ${manifest[spec.name].bytes.toLocaleString("en-US")} bytes`);
		}
		// Extract after a fresh download, or when an earlier run never extracted.
		if (spec.unzip && manifest[spec.name] && (fetched || !manifest[spec.name].extracted)) {
			const names = await extract(dest, folder);
			manifest[spec.name].extracted = names;
			console.log(`       extracted ${names.length} files`);
		}
	}
	await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
	return ok;
};

const specs = {
	all: flag({ alias: "a", desc: "Download every public dataset" }),
	force: flag({ alias: "f", desc: "Re-download files that already exist" }),
	list: flag({ alias: "l", desc: "Print the catalog and exit" }),
};

const main = async (): Promise<number> => {
	const parsed = parse(specs, process.argv, {
		usageOpts: {
			color: false,
			prefix: "Usage: node scripts/download.ts [options] [dataset-id ...]\n\nIds come from data/catalog.yaml.\n\n",
		},
	});
	if (!parsed) return 0; // --help printed the usage
	const { result: opts, rest: ids } = parsed;

	const datasets = await loadCatalog();
	const byId = new Map(datasets.map((d) => [d.id, d]));

	if (opts.list || (!ids.length && !opts.all)) {
		const width = Math.max(...datasets.map((d) => d.id.length));
		for (const d of datasets) {
			console.log(`${d.id.padEnd(width)}  ${d.access.padEnd(10)}  ${String(d.files.length).padStart(2)} files  ${d.name}`);
		}
		return 0;
	}

	const unknown = ids.filter((id) => !byId.has(id));
	if (unknown.length) {
		console.error(`unknown dataset id(s): ${unknown.join(", ")}`);
		return 2;
	}

	const chosen = opts.all ? datasets : ids.map((id) => byId.get(id)!);
	const failed: string[] = [];
	for (const dataset of chosen) {
		console.log(`${dataset.id}: ${dataset.name}`);
		if (dataset.access !== "public") {
			console.log(`  access is ${dataset.access}: ${(dataset.access_note ?? "no files to fetch").trim()}`);
			continue;
		}
		if (!(await download(dataset, opts.force))) failed.push(dataset.id);
	}
	if (failed.length) {
		console.error(`failed: ${failed.join(", ")}`);
		return 1;
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
