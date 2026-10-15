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

The provider endpoints and model IDs are configured in
[`promptfooconfig.yaml`](promptfooconfig.yaml). Update those YAML entries to use
a different local alias, llama-server URL, or Together AI model. See
[Promptfoo's OpenAI-compatible provider docs](https://www.promptfoo.dev/docs/providers/openai/)
and [Together AI provider docs](https://www.promptfoo.dev/docs/providers/togetherai/)
for configuration details.

The main configuration is [`promptfooconfig.yaml`](promptfooconfig.yaml). It
currently contains starter examples for summarization, proposal classification,
and deciding whether related proposals should be merged, including a case where
there is not enough information to make a decision. Add test cases and update
assertions as evaluation needs grow. The default provider is `openai:gpt-4o-mini`;
`just eval-local` and `just eval-together` select local llama-server or Together AI providers.

## Open questions

- Which Common Application use cases and proposal categories should we
  prioritize?
- What criteria should govern whether proposals are merged?
- Which metrics best assess quality? Consider combining task-specific checks
  with similarity measures such as BERTScore or ROUGE; similarity alone may not
  measure correctness, tone, or usefulness.
