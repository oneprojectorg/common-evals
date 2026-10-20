# Common Evals

A configuration-first collection of evaluations for LLM tasks related to
[Common](https://github.com/oneprojectorg/common/), One Project's platform for
participatory decision-making. Evaluations are configured in Promptfoo YAML to
keep custom code to a minimum.

On Common, an organization runs a decision process: members submit proposals,
reviewers shortlist them, members vote, and the winners are funded or adopted.
A proposal has a title and summary and may carry a budget, a location, and a
category from a list the decision's admins define. Admins merge duplicate
proposals, and the merge note goes to the authors of the merged-away proposal.
The evaluation cases model those tasks: summarizing a proposal for its card,
classifying it into the decision's categories, and deciding whether two
proposals should be merged.

## Run evaluations

Requires [Node.js](https://nodejs.org/) 22.18 or later and [just](https://github.com/casey/just).
From the repository root, validate the configuration and view the latest results with:

```sh
just validate
just view
```

Run the default OpenAI provider with `OPENAI_API_KEY`:

```sh
export OPENAI_API_KEY=...
just eval
```

Run a local model with [llama-server](https://github.com/ggml-org/llama.cpp/tree/master/examples/server).
Start the server on port `8080`, set its model alias to `local-model`, and leave
it running while the evaluation runs:

```sh
llama-server -m /path/to/model.gguf --alias local-model --port 8080
```

To serve [Apertus 1.5 8B](https://huggingface.co/swiss-ai/Apertus-v1.5-8B) this
way, use the recipe below. It loads a community text-only GGUF conversion, since
the official checkpoint is multimodal and only runs under vLLM or Transformers.
The first run downloads about 8.5 GB:

```sh
just serve-apertus
```

Then run the local eval. llama-server serves both the model under test and the
rubric grader, so no paid grading API is needed:

```sh
just eval-local
```

Run and grade with the configured Together AI model using `TOGETHER_API_KEY`:

```sh
export TOGETHER_API_KEY=...
just eval-together
```

Each `just` recipe selects one target provider and uses the same provider for
rubric grading. The local recipe uses the same llama-server model as target and
grader, so treat its scores as a smoke test rather than an independent quality
measure. The provider endpoints and model IDs are configured in
[`promptfooconfig.yaml`](promptfooconfig.yaml). Update those YAML entries to use
a different local alias, llama-server URL, or Together AI model. See
[Promptfoo's OpenAI-compatible provider docs](https://www.promptfoo.dev/docs/providers/openai/)
and [Together AI provider docs](https://www.promptfoo.dev/docs/providers/togetherai/)
for configuration details.

The main configuration is [`promptfooconfig.yaml`](promptfooconfig.yaml). It
follows the layout from Promptfoo's
[configuration guide](https://www.promptfoo.dev/docs/configuration/guide/):
the prompt template lives in [`prompts/`](prompts/), each task's test cases
live in their own YAML file under [`tests/`](tests/), and `defaultTest` in the
main config holds the category list and grounding rubric shared by every case.

- [`tests/summarization.yaml`](tests/summarization.yaml): one case that
  writes the proposal-card summary.
- [`tests/classification.yaml`](tests/classification.yaml): one case per
  category of an example neighborhood improvement fund.
- [`tests/merge.yaml`](tests/merge.yaml): merge outcomes for duplicate,
  related-but-distinct, and vague proposal pairs.

To add a task, create a new file under `tests/` and list it under `tests:`
in the main config.

## Real datasets

The hand-written cases are invented examples. [`data/catalog.yaml`](data/catalog.yaml)
lists public participatory budgeting and civic-input datasets with real
proposals, staff decisions, and labels, and [`data/readme.md`](data/readme.md)
explains the fields, licenses, and name handling. The scripts need `npm install` once.

```sh
just catalog                       # list datasets and access status
just download cambridge-pb         # fetch into data/raw/<id>/
just build-cases                   # write tests/generated/*.yaml from the data
just eval-generated                # run the generated cases on llama-server
```

The scripts are TypeScript under [`scripts/`](scripts/) and run directly on
Node without a build step.

Categories on Common are
defined per decision, so each case passes the decision's category list in the
input rather than assuming a global taxonomy. The classification labels and
merge decisions have direct output checks; rubrics also assess rationale and
grounding. The proposals are invented examples in the style of a
participatory budgeting decision. Replace them with anonymized proposals from
a real decision as evaluation needs grow. Use `just eval`, `just eval-local`, or `just eval-together` to run a
single provider and its matching grader.

## Open questions

- Which Common use cases should we prioritize? Summaries, categorization, and
  merge suggestions are starting points; drafting the merge note sent to
  merged-away authors and review rubric scoring are candidates.
- Which real decisions should supply category lists and sample proposals?
  The catalog's Cambridge committees and Engaged California topics are the
  first candidates; Columbus data on Common is the target once exportable.
- What criteria should govern whether proposals are merged? Common records a
  merge as an admin action with a note, and does not define the criteria.
- Which metrics best assess quality? Consider combining task-specific checks
  with similarity measures such as BERTScore or ROUGE; similarity alone may not
  measure correctness, tone, or usefulness.
