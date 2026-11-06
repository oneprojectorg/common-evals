---
title: Common Evals
author: Ivan Willig
date: 2026-10-20
description: Promptfoo cases for Common's proposal tasks, and the real datasets behind them.
---

# The problem

We want to use LLM to summarize and process information for Common.

We want to understand

- Understand the costs for running these systems
- Failure cases for LLM's.
  - Bad LLM Tool calls
  - Reproduce existing power structures.
- Understand how to maximize smaller and open models
- Compare open and closed models
- Help craft system prompt/tools for agent in common

# How Common Evals works {.dark}

# What it is

Private Repo

[https://github.com/oneprojectorg/common-evals](https://github.com/oneprojectorg/common-evals)

A repository of evaluation cases for Common's proposal tasks, run by
[Promptfoo](https://www.promptfoo.dev/) from YAML. Support for running
these models locally via [llama.cpp](https://github.com/ggml-org/llama.cpp)

```sh
## blocks
just serve-apertus

## In new terminal
just eval-local
```

### [http://localhost:15500/eval](http://localhost:15500/eval)

# Install

Use homebrew. Assumes that just is installed globally for the install.

```sh
brew install just     # once, so the recipe below can run
just install          # brew bundle install, then npm install
just validate         # check the configuration, no model calls
```

Promptfoo is not installed. Every recipe runs it through `npx`.

# Three tasks from the product

On Common, members submit proposals, reviewers shortlist them, members vote,
and admins merge duplicates. The cases cover the three LLM tasks on that
path.

| Task | Input | Checked by |
|---|---|---|
| Summarize | a proposal, for its card | rubric: what changes, who benefits, the budget |
| Classify | a proposal plus the decision's category list | exact label, plus a rubric for the reason |
| Merge | two proposals an admin may merge | exact yes, no, or insufficient information |

Categories are defined per decision by its admins, so every case carries its
own category list.

# How a run works

```
prompts/proposal-assistant.txt     one prompt template: {{task}} and {{input}}
tests/*.yaml                       one file per task, cases with vars and asserts
promptfooconfig.yaml               providers, shared rubric, the list of test files
```

1. Promptfoo fills the prompt with each case's task and input
2. It sends the prompt to the chosen provider
3. It checks the answer: a `contains` on the label or decision, then an
   LLM rubric for grounding and rationale
4. `just view` opens the results in the browser

# Eleven providers, one fixed grader

| Recipe | Target | Needs |
|---|---|---|
| `just eval` | Claude Sonnet 5.5, the default | `ANTHROPIC_API_KEY` |
| `just eval-opus` | Claude Opus 5.5, also the grader | `ANTHROPIC_API_KEY` |
| `just eval-openai` | GPT-6 Luna | `OPENAI_API_KEY` |
| `just eval-gemini` | Gemini 3.6 Flash | `GOOGLE_API_KEY` |
| `just eval-together` | Qwen3.8 2.4T on Together AI | `TOGETHER_API_KEY` |
| `just eval-glm`, `eval-glm-flash` | GLM-5.3, GLM-5.3 Flash | `TOGETHER_API_KEY` |
| `just eval-deepseek` | DeepSeek V4 Pro | `TOGETHER_API_KEY` |
| `just eval-hf-glm`, `eval-hf-qwen` | GLM-5.3, Qwen3.8 on Hugging Face | `HF_TOKEN` |
| `just eval-local` | llama-server, alias `local-model` | `just serve-apertus` running, no key |
| `just eval-matrix` | all hosted models with a key set, in one run | `ANTHROPIC_API_KEY`; other keys optional |

Claude Opus 5.5 grades every hosted recipe, so each hosted recipe also needs
`ANTHROPIC_API_KEY`. The fixed judge makes scores comparable across models.
The local recipes grade themselves; treat their rubric scores as a smoke
test. `just scores` turns the matrix results into CSV rows for the rubric
spreadsheet.

# Running it against another model

Each change is configuration, not code.

1. **A different hosted model.** Add a provider entry in `promptfooconfig.yaml`
   and filter to it. Promptfoo supports `openai:`, `anthropic:messages:`,
   `togetherai:`, `google:`, and other prefixes.
2. **A different local model.** Serve any GGUF under the alias `local-model`.
   The local recipes use it unchanged:

   ```sh
   llama-server -m /path/to/model.gguf --alias local-model --port 8080
   ```

3. **A different grader.** Change the `grader` variable at the top of the
   justfile to change the judge for every recipe, or override it for one
   run. For example, grade with GLM-5.3 on Hugging Face (`HF_TOKEN`):

   ```sh
   just grader=huggingface:chat:zai-org/GLM-5.3 eval-matrix
   ```

Claude Sonnet 5.5 runs at high effort by default. For short classification
cases, `config: { effort: low }` on its provider entry cuts the cost.

# Dataset {.dark}

[https://claude.ai/artifact/JCoCtbMhRTSdd55CpLiNd1?sk=ThpAG1eLa0Q-GDpssOgqqQ#d860b891-eb01](https://claude.ai/artifact/JCoCtbMhRTSdd55CpLiNd1?sk=ThpAG1eLa0Q-GDpssOgqqQ#d860b891-eb01)

# The dataset catalog

Thanks Sasha for the list. This is data/catalog.yaml is just Sasha's
list translated into YAML. We can then use that to download the
information.


```sh
just download cambridge-pb       # data/raw/cambridge-pb/, with a manifest
just build-cases                 # tests/generated/*.yaml, seeded sample per label
just eval-generated              # same prompt and providers, generated cases only
```

| Dataset | Resident text | Compressed by | Chain |
|---|---|---|---|
| Cambridge PB | idea title and description | staff eligibility decision | idea to ballot to winner |
| Engaged California, state employees | comment | AI-extracted idea and themes | comment to idea to theme |
| Engaged California, LA Fires | comment | AI topic clusters | comment to cluster to plan |
| Toulouse Je Participe | proposal | city's written answer | proposal to ballot to vote |

Each entry records access, license, and whether author names are present.

- The builder samples a fixed number of rows per label with a seed, so a rerun
  gives the same cases
- It never copies an author name into a case
- Downloads and generated cases stay out of git

# Thanks!
