# Common Evals

A configuration-first collection of evaluations for LLM tasks related to
[Common](https://github.com/oneprojectorg/common/), One Project's platform for
participatory decision-making. Evaluations are configured in Promptfoo YAML.
The only code is three small TypeScript scripts: two fetch real datasets and
turn them into test cases, and one exports scores for the rubric spreadsheet.

On Common, an organization runs a decision process: members submit proposals,
reviewers shortlist them, members vote, and the winners are funded or adopted.
A proposal has a title and summary and may carry a budget, a location, and a
category from a list the decision's admins define. Admins merge duplicate
proposals, and the merge note goes to the authors of the merged-away proposal.
The evaluation cases model those tasks: summarizing a proposal for its card,
classifying it into the decision's categories, and deciding whether two
proposals should be merged.

## Setup

Requires [Node.js](https://nodejs.org/) 22.18 or later and
[just](https://github.com/casey/just), plus llama-server for the local model and
pandoc for the deck. On a Mac with [Homebrew](https://brew.sh/), the
[`Brewfile`](Brewfile) installs all of them and one recipe does the rest:

```sh
brew install just  # once, so the recipe below can run
just install       # brew bundle install, then npm install
just validate      # check the configuration without model calls
```

Promptfoo runs through `npx`, so `npm install` only covers the dataset scripts.

## Run evaluations

API keys can live in `.env.local` at the repository root: copy
[`.env.example`](.env.example) and fill in the keys you have. Every `just`
recipe loads the file, so the `export` lines below are only needed when a key
is not in it. A key exported in the shell wins over the file, which keeps
one-off overrides working.

Each `just` recipe selects one target provider. Every API-backed recipe grades
with one fixed judge — GLM-5.3 on Together AI, set by the `grader` variable at
the top of the [`justfile`](justfile) — so rubric scores are comparable across
models: a score difference means the model differed, not the judge. All of
these recipes therefore need `TOGETHER_API_KEY` in addition to the tested
provider's key. An open-model judge keeps grading independent of the lab APIs
under comparison; the trade-off is that GLM judges its own answers in the GLM
rows, so prefer the exact-match columns there.

The variable can also be overridden for one run. For example, grade with
Claude Opus 5.5, which needs `ANTHROPIC_API_KEY` instead of
`TOGETHER_API_KEY`:

```sh
just grader=anthropic:messages:claude-opus-5-5 eval-matrix
```

A Claude judge mirrors the GLM caveat: the two Claude rows are then judged by
the grader itself or a sibling model, so prefer the exact-match columns for
those rows instead.

The default recipe runs Claude Sonnet 5.5:

```sh
export ANTHROPIC_API_KEY=...
just eval
just view          # open the latest results in Promptfoo's web viewer
```

Sonnet 5.5 runs at high effort by default, which is more thinking than a
short classification or merge case needs. To spend less on a large run, add an
effort setting to the provider entry in `promptfooconfig.yaml`:

```yaml
  - id: anthropic:messages:claude-sonnet-5-5
    label: Anthropic Claude Sonnet 5.5
    config:
      effort: low
```

Run Claude Opus 5.5, the frontier anchor for the model comparison:

```sh
just eval-opus
```

Run OpenAI's GPT-6 Luna using `OPENAI_API_KEY`:

```sh
export OPENAI_API_KEY=...
just eval-openai
```

Run Google's Gemini 3.6 Flash using `GOOGLE_API_KEY` (the Pro tier is still
preview-only; its id is noted in the config):

```sh
export GOOGLE_API_KEY=...
just eval-gemini
```

Run a local model with
[llama-server](https://github.com/ggml-org/llama.cpp/tree/master/examples/server).
The recipe below serves [Apertus 1.5 8B](https://huggingface.co/swiss-ai/Apertus-v1.5-8B)
as a community text-only GGUF conversion, since the official checkpoint is
multimodal and only runs under vLLM or Transformers. The first run downloads
about 8.5 GB. Leave it running in its own terminal:

```sh
just serve-apertus
```

Any other GGUF works the same way if it is served on port `8080` with the alias
`local-model`:

```sh
llama-server -m /path/to/model.gguf --alias local-model --port 8080
```

Then run the local eval:

```sh
just eval-local
```

Run the open models on Together AI using `TOGETHER_API_KEY`:

```sh
export TOGETHER_API_KEY=...
just eval-glm          # GLM-5.3
just eval-glm-flash    # GLM-5.3 Flash
just eval-deepseek     # DeepSeek V4 Pro
just eval-kimi         # Kimi K3
```

There is no Together AI Qwen row: Together's current Qwens are either
dedicated-endpoint-only (the 2.4T flagship, the 3.5 line) or streaming-only
(3.8 Flash, the 3.6 and 3.7 Plus tiers), and Promptfoo can call neither. The
Qwen rows run through Hugging Face's router below.

DeepSeek has no multimodal support. That does not affect this suite — every
case is text-only — but it matters if Common later needs image input, so it
stays on the record here.

GLM-5.3 and the Qwens also run through Hugging Face's
[inference router](https://huggingface.co/docs/inference-providers/index),
using `HF_TOKEN`. GLM-5.3 is the same checkpoint as on Together AI, so a
difference between its Together row and its Hugging Face row reflects the
hosting (quantization, serving stack), not the model:

```sh
export HF_TOKEN=...
just eval-hf-glm       # GLM-5.3 on Hugging Face, graded by GLM-5.3 itself
just eval-hf-qwen      # Qwen3.8 2.4T on Hugging Face
just eval-hf-qwen-27b  # Qwen3.8 27B
just eval-hf-qwen36    # Qwen3.6 35B A3B
just eval-hf-apertus   # Apertus v1.5 70B
```


Apertus v1.5 70B, the Swiss AI Initiative's open model, runs only through the
router — Together AI does not host the Apertus family. It is the hosted
sibling of the 8B model the local recipes serve with llama-server.

`eval-hf-glm` grades with the Hugging Face-served GLM-5.3 rather than the
fixed grader, so it runs on `HF_TOKEN` alone with no Together AI key. The cost
of that convenience is self-grading: its rubric scores reflect GLM's agreement
with its own answers and are not comparable with the other recipes' scores.
Use the matrix for comparable rows.

The exceptions to the fixed grader are the two local recipes (`eval-local`,
`eval-generated`), where llama-server grades its own answers so no paid API is
needed; treat those rubric scores as a smoke test. The exact-match checks on
classification labels and merge decisions never depend on the grader.

## Compare models

`eval-matrix` runs the comparison providers — both Claude tiers, GPT-6 Luna,
Gemini 3.6 Flash, and the Together AI open models — over the same cases in one
run and writes `results/matrix.json`. The grader's key is required
(`TOGETHER_API_KEY` by default). Every provider key is optional: the recipe
skips any model whose key (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
`GOOGLE_API_KEY`, `TOGETHER_API_KEY`, `HF_TOKEN`) is not set and says so:

```sh
just eval-matrix
just view             # inspect the side-by-side results
just scores           # model x task CSV rows for the rubric spreadsheet
```

The matrix runs the hand-written starter cases by default. `eval-all` runs
everything — the starter cases plus the cases built from the catalog datasets
(Cambridge PB, LA Fires, state employees) — rebuilding the generated cases
first:

```sh
just eval-all
```

To run only the dataset cases, point the `config` variable at the generated
config:

```sh
just build-cases
just config=promptfooconfig.generated.yaml eval-matrix
```

`just scores` runs [`scripts/export-scores.ts`](scripts/export-scores.ts),
which aggregates `results/matrix.json` into one CSV row per model per task
(cases, passes, pass rate, mean score) plus an `all` row per model, shaped for
pasting into the Category Scores tab of the rubric spreadsheet. Raw results
under `results/` are git-ignored; commit the exported CSV instead.

One caveat on the scores: with the default grader GLM-5.3 judges the matrix,
so the GLM rows are judged by themselves or a sibling model; prefer the
exact-match columns when comparing those rows against the rest. The same
applies to the Claude rows when a Claude model is the grader.

Provider endpoints and model IDs live in
[`promptfooconfig.yaml`](promptfooconfig.yaml). Edit those entries to change
the local alias, llama-server URL, or any hosted model id. See
Promptfoo's [OpenAI-compatible provider docs](https://www.promptfoo.dev/docs/providers/openai/),
[Together AI provider docs](https://www.promptfoo.dev/docs/providers/togetherai/),
[Anthropic provider docs](https://www.promptfoo.dev/docs/providers/anthropic/),
and [Google provider docs](https://www.promptfoo.dev/docs/providers/google/)
for details.

## Hand-written cases

[`promptfooconfig.yaml`](promptfooconfig.yaml) follows Promptfoo's
[configuration guide](https://www.promptfoo.dev/docs/configuration/guide/):
the prompt template lives in [`prompts/`](prompts/), each task's test cases
live in their own YAML file under [`tests/`](tests/), and `defaultTest` holds
the category list and grounding rubric shared by every case.

- [`tests/summarization.yaml`](tests/summarization.yaml): proposal-card
  summaries, the primary use case — a straightforward card, a proposal with
  no budget (the summary must not invent one), a rambling proposal to
  condense, and an arts case. Every case also has a hard word-count check.
- [`tests/classification.yaml`](tests/classification.yaml): one case per
  category of an example neighborhood improvement fund.
- [`tests/merge.yaml`](tests/merge.yaml): merge outcomes for duplicate,
  related-but-distinct, and vague proposal pairs.

The proposals in these files are invented examples in the style of a
participatory budgeting decision. Categories on Common are defined per
decision, so each case passes the decision's category list in the input rather
than assuming a global taxonomy. Classification labels and merge decisions have
direct output checks; rubrics also assess rationale and grounding.

To add a task, create a new file under `tests/` and list it under `tests:` in
the main config.

## Real datasets

[`data/catalog.yaml`](data/catalog.yaml) lists 19 public participatory
budgeting and civic-input datasets with resident proposals, the staff or AI
summaries and labels made from them, and the decisions that followed.
[`data/readme.md`](data/readme.md) explains the catalog fields, which datasets
answer which question, licenses, and how author names are handled.

```sh
just catalog                       # list datasets, access status, file counts
just download cambridge-pb         # fetch one or more ids into data/raw/<id>/
just download-all                  # every public dataset, about 600 MB
just build-cases                   # write tests/generated/*.yaml from the data
just eval-generated                # run the generated cases on llama-server
just config=promptfooconfig.generated.yaml eval-matrix   # on the hosted models
```

`build-cases` samples a fixed number of rows per label with a seed, so the same
seed reproduces the same cases, and it never copies an author name into a case.
It also writes `promptfooconfig.generated.yaml`, a copy of the main config whose
tests are the generated files, because Promptfoo merges the prompts of two
configs passed together and runs every case twice. The copy snapshots the main
config's providers, so re-run `just build-cases` after changing them. Downloads, generated cases,
and the generated config are ignored by git.

The scripts under [`scripts/`](scripts/) are TypeScript and run directly on
Node without a build step. Run `npm run typecheck` after editing them.

## Presentation

[`presentations/common-evals.md`](presentations/common-evals.md) is a short
deck on how this repository works, in the format of the decks in
`oneproject-knowledge-base/presentations/`. One `#` heading is one slide and
`::: handout` blocks are speaker notes. Build it with
[pandoc](https://pandoc.org/) into a single offline HTML file:

```sh
just build-presentation presentations/common-evals.md
open presentations/common-evals.html
```

The theme in `templates/ef-cherie-slidy.css` is a copy of the knowledge base
theme, and `templates/slidy/` holds the W3C Slidy script, stylesheet, and icons
so the build needs no network access.

## Open questions

- Which Common use cases should we prioritize? Summaries, categorization, and
  merge suggestions are starting points; drafting the merge note sent to
  merged-away authors and review rubric scoring are candidates.
- Which real decisions should ground the cases? Cambridge committees,
  Engaged California topics, and the state-employee idea extractions are the
  first builders; Columbus data on Common is the target once it can be exported
  anonymized.
- What criteria should govern whether proposals are merged? Common records a
  merge as an admin action with a note, and does not define the criteria.
  Toulouse and Barcelona list related proposals and could supply merge cases.
- Which metrics best assess quality? Consider combining task-specific checks
  with similarity measures such as BERTScore or ROUGE; similarity alone may not
  measure correctness, tone, or usefulness.
