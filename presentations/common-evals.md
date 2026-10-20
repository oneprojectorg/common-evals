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

Promptfoo itself is not installed. Every recipe runs it through `npx`, so
there is nothing to upgrade by hand.

# Three tasks from the product

On Common, members submit proposals, reviewers shortlist them, members vote,
and admins merge duplicates. The cases model what the model is asked to do
along that path.

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

# Four providers, one at a time

| Recipe | Target and grader | Needs |
|---|---|---|
| `just eval` | Claude Sonnet 5.5, the default | `ANTHROPIC_API_KEY` |
| `just eval-openai` | GPT-6 Luna | `OPENAI_API_KEY` |
| `just eval-together` | Qwen3.8 2.4T on Together AI | `TOGETHER_API_KEY` |
| `just eval-local` | llama-server, alias `local-model` | `just serve-apertus` running, no key |

By default the model is its own grader! We need to iterate on this.

# Running it against another model

Three places to change, none of them code.

1. **A different hosted model.** Add a provider entry in `promptfooconfig.yaml`
   and filter to it. Promptfoo knows `openai:`, `anthropic:messages:`,
   `togetherai:` and many more.
2. **A different local model.** Serve any GGUF under the same alias and the
   local recipes pick it up unchanged:

   ```sh
   llama-server -m /path/to/model.gguf --alias local-model --port 8080
   ```

3. **A different grader.** Pass `--grader` to score one model's answers with
   another, for example the local model graded by Sonnet 5.5:

   ```sh
   npx promptfoo@latest eval -c promptfooconfig.yaml \
     --filter-providers local-model --grader anthropic:messages:claude-sonnet-5-5
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
