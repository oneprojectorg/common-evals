# Apertus and Together AI support

**Research question:** What is Apertus, and can it be run through Together AI?

## Summary

Apertus is a family of openly documented multilingual language models developed by the Swiss AI Initiative, a collaboration involving EPFL, ETH Zurich, and CSCS. The official model card describes 8B and 70B parameter versions, 1,811 natively supported languages, and an open training-data and training-methodology focus.

**Together AI's current public serverless model catalog does not list Apertus.** The catalog is the authoritative list for Together-hosted serverless models, and an Apertus model/API ID is not present there. Together's API accepts model IDs from its own catalog; its OpenAI-compatible API does not, by itself, mean arbitrary Hugging Face models can be run on Together's hosted service. Therefore, based on published documentation, there is no evidence that Together currently offers Apertus as a serverless model. This is a catalog-based conclusion, not confirmation from Together support; availability could change or differ for private/dedicated deployments.

Apertus can instead be deployed using supported open-source inference stacks. Its model card specifically names Transformers, vLLM, SGLang, and MLX. A self-hosted compatible inference server could potentially be called from Promptfoo using an OpenAI-compatible provider configuration, but that is separate from Together-hosted inference.

## Apertus details

- The Swiss AI Initiative describes Apertus as a fully open foundation model, with training data, code, weights, methods, and alignment principles documented.
- The Hugging Face model card describes 8B and 70B parameter models, a decoder-only transformer pretrained on 15T tokens, and a context length of up to 65,536 tokens.
- The model card's featured instruct checkpoint is `swiss-ai/Apertus-8B-Instruct-2509`; it says to use Transformers 4.56.0 or later and recommends `temperature=0.8` and `top_p=0.9` for sampling.
- The model card cautions that outputs can be inaccurate, inconsistent, or biased and should be verified.

## Together AI compatibility and implications

Together documents an OpenAI-compatible API at `https://api.together.ai/v1`, including chat completions. Its docs say to substitute a Together model ID from its available-model catalog. This compatibility is an API interface, not a promise to host any model identifier supplied by a customer.

The serverless chat catalog was checked for Apertus and does not show an Apertus listing. So the practical answer is: **not as a publicly listed Together serverless model, based on the current catalog**. If you need hosted Apertus specifically, ask Together whether it can be deployed as a dedicated/private endpoint or whether model availability is planned. If you can self-host, use one of the inference runtimes named by the model card and configure Promptfoo to call that endpoint.

For this repository, do not add a guessed Together ID such as `swiss-ai/Apertus-8B-Instruct-2509` under the `togetherai:` provider until Together confirms it is hosted. If testing a self-hosted endpoint, configure an OpenAI-compatible provider with that server's base URL and actual served model alias, then use it for both target and grader only if that is intentional (same-model grading is not an independent quality assessment).

## Sources

1. Swiss AI Initiative, Apertus overview: <https://www.swiss-ai.org/apertus>
2. Hugging Face, official Apertus 8B Instruct model card: <https://huggingface.co/swiss-ai/Apertus-8B-Instruct-2509>
3. Together AI, available serverless models: <https://docs.together.ai/docs/serverless/models>
4. Together AI, OpenAI compatibility and model-ID behavior: <https://docs.together.ai/docs/inference/openai-compatibility>

## Scope and caveat

This assessment is based on public first-party documentation available at the time of research. It does not establish whether Together offers a non-public, dedicated, or newly added Apertus deployment. The most direct way to resolve that remaining uncertainty is to ask Together support or check the account's model catalog/API model list.
