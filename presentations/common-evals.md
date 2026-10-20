---
title: How Common Evals works
author: Ivan Willig
date: 2026-10-20
description: Promptfoo cases for Common's proposal tasks, and the real datasets behind them.
---

# The problem

Common asks a model to summarize, classify, and merge community proposals.
We have no shared way to say whether a model does that well.

- A prompt change looks fine on three examples and breaks on the fourth
- Each model is tried by hand, by one person, once
- Nothing records which proposals were tested or what the right answer was

::: handout
Open on the room's problem: anyone who has tuned a prompt by eye has lived
this. The deck is about replacing that with a repeatable run.
:::

# How Common Evals works {.dark}

# What it is

A repository of evaluation cases for Common's proposal tasks, run by
[Promptfoo](https://www.promptfoo.dev/) from YAML, against any model, with one
command.

```sh
just eval-local
```

::: handout
One sentence to repeat tomorrow: "it is a set of proposal tasks with known
answers that any model can be scored on."
:::

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

# Three providers, one at a time

| Recipe | Target and grader | Needs |
|---|---|---|
| `just eval` | GPT-4o mini | `OPENAI_API_KEY` |
| `just eval-local` | llama-server, alias `local-model` | `just serve-apertus` running |
| `just eval-together` | Llama 3.3 70B | `TOGETHER_API_KEY` |

Each recipe grades with the same model it tests. The local run is therefore a
smoke test for rubric scores. The exact-match checks stay reliable.

::: handout
Say why grading with the same model is a caveat: a model agrees with itself.
Point out that the classification and merge labels do not depend on it.
:::

# Real proposals, not invented ones {.dark}

# The dataset catalog

The hand-written cases are invented. `data/catalog.yaml` lists 19 public
participatory budgeting and civic-input datasets with what residents wrote and
what staff or an AI made of it.

| Dataset | Resident text | Compressed by | Chain |
|---|---|---|---|
| Cambridge PB | idea title and description | staff eligibility decision | idea to ballot to winner |
| Engaged California, state employees | comment | AI-extracted idea and themes | comment to idea to theme |
| Engaged California, LA Fires | comment | AI topic clusters | comment to cluster to plan |
| Toulouse Je Participe | proposal | city's written answer | proposal to ballot to vote |

Each entry records access, license, and whether author names are present.

# From download to score

```sh
just download cambridge-pb       # data/raw/cambridge-pb/, with a manifest
just build-cases                 # tests/generated/*.yaml, seeded sample per label
just eval-generated              # same prompt and providers, generated cases only
```

- The builder samples a fixed number of rows per label with a seed, so a rerun
  gives the same cases
- It never copies an author name into a case
- Downloads and generated cases stay out of git

# What it costs

|  | Needs |
|---|---|
| Hardware | a laptop; the local model is an 8B GGUF, about 8.5 GB |
| Tooling | Node 22.18 or later, just, `npm install` once |
| Money | nothing for the local run; cents per run on GPT-4o mini |
| Data | about 600 MB for every public dataset, 10 MB for the three that build cases |

# What to do next

Pick the first real decision to ground the cases.

- Cambridge committees and Engaged California topics are ready today
- Columbus on Common is the target once proposals can be exported anonymized
- Merge criteria still need a definition before merge cases can use real pairs

::: handout
The ask: one decision owner to confirm the category list and a sample of
proposals we may use. Everything else is a `just` recipe.
:::
