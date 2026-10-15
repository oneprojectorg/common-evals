# Common Evals

A configuration-first collection of evaluations for LLM tasks related to the
[Common Application](https://github.com/oneprojectorg/common/). Evaluations are
configured in Promptfoo YAML to keep custom code to a minimum.

## Run locally

Requires [Node.js](https://nodejs.org/) and [just](https://github.com/casey/just).
From the repository root, validate the configuration and view previous results with:

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
Start the server on port `8080` and set its model alias to `local-model`:

```sh
llama-server -m /path/to/model.gguf --alias local-model --port 8080
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

Each `just` recipe selects one target provider and uses that provider for
rubric grading. The local recipe uses the same llama-server model as target and
grader, so treat its scores as a smoke test rather than an independent quality
measure. The provider endpoints and model IDs are configured in
[`promptfooconfig.yaml`](promptfooconfig.yaml). Update those YAML entries to use
a different local alias, llama-server URL, or Together AI model. See
[Promptfoo's OpenAI-compatible provider docs](https://www.promptfoo.dev/docs/providers/openai/)
and [Together AI provider docs](https://www.promptfoo.dev/docs/providers/togetherai/)
for configuration details.

The main configuration is [`promptfooconfig.yaml`](promptfooconfig.yaml). It
contains examples for summarization, all four proposal categories, and merge
outcomes for duplicate, related-but-distinct, and vague proposal pairs. The
classification labels and merge decisions have direct output checks; rubrics
also assess rationale and grounding. Add representative cases as evaluation
needs grow. Use `just eval`, `just eval-local`, or `just eval-together` to run a
single provider and its matching grader.

## Open questions

- Which Common Application use cases and proposal categories should we
  prioritize?
- What criteria should govern whether proposals are merged?
- Which metrics best assess quality? Consider combining task-specific checks
  with similarity measures such as BERTScore or ROUGE; similarity alone may not
  measure correctness, tone, or usefulness.
