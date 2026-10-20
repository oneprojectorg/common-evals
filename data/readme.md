# Dataset catalog

`catalog.yaml` lists the participatory budgeting (PB) and civic-input datasets
we can use to ground evaluations in real proposals. The list comes from the
dataset review of 2026-10-08 and was re-checked against the live sources on
2026-10-20. `scripts/download.ts` reads the catalog and saves files under
`data/raw/<id>/`, which git ignores.

## Download

Install the script dependencies once, then download by catalog id:

```sh
npm install
just catalog                      # list ids, access status, file counts
just download cambridge-pb        # one or more ids
just download-all                 # every public dataset, about 600 MB
```

Each dataset folder receives a `manifest.json` with the URL, byte count,
SHA-256, and fetch time of every file. Archives are extracted into the same
folder. A second run skips files that exist. Add `--force` to fetch again.

Three access values need a person:

- `blocked`: Barcelona and Helsinki answer scripts with an nginx 403. Open the
  homepage in a browser, click Download, and save the zip under the path the
  access note gives. Unzip it there.
- `request`: Aarau and the large U.S. cities have no export. Ask the publisher.
- `internal`: Columbus runs on Common. Export anonymized proposals through the
  service layer.

The script fetches with GET only. Decidim exports redirect to presigned
object-storage URLs, and those URLs reject HEAD.

## Catalog fields

| Field | Meaning |
| --- | --- |
| `id` | Folder name under `data/raw/` and the argument to `just download` |
| `access` | `public`, `blocked`, `internal`, `request`, or `unreleased` |
| `resident_text` | The free text residents wrote, if the files contain any |
| `compressed` | The shorter form that text was reduced to, and who wrote it |
| `chain` | The stages a submission can be traced through |
| `names_present` | `true` when author names are in the files |
| `license` | The stated terms. "none stated" means we found none |
| `eval_uses` | Common tasks the data can ground: summarization, classification, merge, screening |
| `files` | `name` is the local file name, `url` the download, `unzip: true` extracts the archive |

## Which datasets answer which question

Six datasets hold both resident text and a traceable chain: the two Engaged
California consultations, Cambridge, Barcelona, Toulouse, and Helsinki. Only
Engaged California and Habermas Machine contain machine compression. Every
other chain was compressed by staff.

| Need | Use |
| --- | --- |
| Summarization with a reference | `engaged-ca-state-employees`: each `IDEA_TEXT` was extracted from one `COMMENT` |
| Classification with a real label set | `cambridge-pb` (`Committee`), `engaged-ca-la-fires` (`TOPIC`), `somerville-pb` (`Category`, `Theme`) |
| Screening decisions with reasons | `cambridge-pb` (`Project Status`), `toulouse-decidim` (`state`, `answer/fr`) |
| Merge candidates | `toulouse-decidim` and `barcelona-decidim` list related proposals |
| Ballots and winners only | `pabulib`, `stanford-pb-preferences`, `nyc-pb`, `paris-budget-participatif` |

## Names and licenses

Cambridge, Barcelona, Toulouse, and Helsinki include author names. The case
builder never copies a name into a test case. Strip the name columns before
any other use.

Helsinki text is CC BY-NC-SA and Barcelona is CC BY-SA. Both are fine for
research. Check them before derived data feeds a commercial product. The
Engaged California files state no license; confirmation from the California
Office of Data and Innovation is pending.

## Build test cases

`scripts/build-cases.ts` turns downloaded data into Promptfoo test files under
`tests/generated/`, which git ignores:

```sh
just build-cases                  # every builder whose data is present
just build-cases --per-label 3 --seed 7 cambridge-classification
just eval-generated               # run the generated cases on llama-server
```

`build-cases` also writes `promptfooconfig.generated.yaml`, a copy of the main
config whose tests are the generated files. Promptfoo merges the prompts of
two configs passed together and runs every case twice, so the generated cases
get a config of their own. `eval-generated` uses the local llama-server for
both target and grader, like `eval-local`, so start it with `just serve-apertus`
first. Pass the config to any other `promptfoo eval` command with `-c`.

| Builder | Dataset | Task | Check |
| --- | --- | --- | --- |
| `cambridge-classification` | `cambridge-pb` | Pick the committee for an idea from the latest cycle | `contains` the committee, plus a rubric |
| `la-fires-classification` | `engaged-ca-la-fires` | Pick the AI-assigned topic for a comment | `contains` the topic, plus a rubric |
| `state-employees-summarization` | `engaged-ca-state-employees` | State the idea in a comment | Rubric against the published `IDEA_TEXT` |

The builders sample a fixed number of rows per label with a seeded generator,
so the same seed produces the same cases. Generated cases use the `task`,
`input`, and `categories` variables of the hand-written tests and run through
the same prompt.

## Add a dataset

1. Add an entry to `catalog.yaml` with every field in the table above.
2. Run `just download <id>` and check the files and `manifest.json`.
3. Record the columns you verified under `files[].columns`.
4. If the data grounds a task, add a builder to `scripts/build-cases.ts`.
