# Common Evals

A configuration-first collection of evaluations for LLM tasks related to
[Common](https://github.com/oneprojectorg/common/), One Project's platform for
participatory decision-making. Evaluations are configured in Promptfoo YAML.
The only code is two small TypeScript scripts that fetch real datasets and turn
them into test cases.

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
[just](https://github.com/casey/just). Promptfoo runs through `npx`, so only the
dataset scripts need an install:

```sh
npm install
just validate      # check the configuration without model calls
```

## Run evaluations

Each `just` recipe selects one target provider and uses the same provider for
rubric grading. Run the OpenAI provider with `OPENAI_API_KEY`:

```sh
export OPENAI_API_KEY=...
just eval
just view          # open the latest results in Promptfoo's web viewer
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

Then run the local eval. llama-server serves both the model under test and the
rubric grader, so no paid grading API is needed. Treat its rubric scores as a
smoke test, since the same model grades its own output; the direct output checks
on classification and merge cases remain reliable:

```sh
just eval-local
```

Run and grade with the configured Together AI model using `TOGETHER_API_KEY`:

```sh
export TOGETHER_API_KEY=...
just eval-together
```

Provider endpoints and model IDs live in
[`promptfooconfig.yaml`](promptfooconfig.yaml). Edit those entries to change
the local alias, llama-server URL, or Together AI model. See Promptfoo's
[OpenAI-compatible provider docs](https://www.promptfoo.dev/docs/providers/openai/)
and [Together AI provider docs](https://www.promptfoo.dev/docs/providers/togetherai/)
for details.

## Hand-written cases

[`promptfooconfig.yaml`](promptfooconfig.yaml) follows Promptfoo's
[configuration guide](https://www.promptfoo.dev/docs/configuration/guide/):
the prompt template lives in [`prompts/`](prompts/), each task's test cases
live in their own YAML file under [`tests/`](tests/), and `defaultTest` holds
the category list and grounding rubric shared by every case.

- [`tests/summarization.yaml`](tests/summarization.yaml): one case that
  writes the proposal-card summary.
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
```

`build-cases` samples a fixed number of rows per label with a seed, so the same
seed reproduces the same cases, and it never copies an author name into a case.
It also writes `promptfooconfig.generated.yaml`, a copy of the main config whose
tests are the generated files, because Promptfoo merges the prompts of two
configs passed together and runs every case twice. Downloads, generated cases,
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
