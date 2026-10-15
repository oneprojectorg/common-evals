# Common Evals

A configuration-first collection of evaluations for LLM tasks related to the
[Common Application](https://github.com/oneprojectorg/common/). Evaluations are
configured in Promptfoo YAML to keep custom code to a minimum.

## Run locally

Requires [Node.js](https://nodejs.org/), [just](https://github.com/casey/just),
and an `OPENAI_API_KEY` for the configured OpenAI provider. From the repository
root:

```sh
export OPENAI_API_KEY=...
just validate # Check configuration without making model calls
just eval     # Run evaluations
just view     # View the latest results
```

The main configuration is [`promptfooconfig.yaml`](promptfooconfig.yaml). It
currently contains starter examples for summarization, proposal classification,
and deciding whether related proposals should be merged. Edit its prompts,
providers, test inputs, and assertions to evolve the eval set. The default
provider is `openai:gpt-4o-mini`; change it in the YAML to compare another
Promptfoo-supported provider.

## Open questions

- Which Common Application use cases and proposal categories should we
  prioritize?
- What criteria should govern whether proposals are merged?
- Which metrics best assess quality? Consider combining task-specific checks
  with similarity measures such as BERTScore or ROUGE; similarity alone may not
  measure correctness, tone, or usefulness.
