# Implementation plan: cross-model evals for open models on Together AI

Asana task: [Add basic common-evals for testing our use cases across different
models](https://app.asana.com/1/1108348036672214/project/1213315744811204/task/1219644686336535)
(due 2026-11-18). Branch: `issue-1219644686336535`.

## Goal

Produce comparable eval scores — summarization first — for the top open models
on Together AI (GLM, Qwen, DeepSeek) against frontier anchors (Claude Opus
and Claude Sonnet 5.5),
and export those scores in a shape that feeds the Category Scores tab of the
shared rubric spreadsheet.

## Current state

- Providers configured: Claude Sonnet 5.5, GPT-6 Luna, llama-server local
  model, and Qwen3.8 2.4T on Together AI.
- Missing versus the task: GLM, DeepSeek, and Opus as the frontier anchor.
  Gemini is an open question back to Scott.
- Each `just` recipe grades a model with itself (`eval-together` grades Qwen
  with Qwen), so scores are not comparable across models.
- Nothing exports scores toward the spreadsheet; results live only in
  Promptfoo's viewer.
- `tests/summarization.yaml` is the smallest suite (29 lines) even though
  summarization is the task's primary use case.

## Steps

### 1. Add the missing providers to `promptfooconfig.yaml`

- **Together AI GLM** — two entries: **GLM-5.3** and **GLM-5.3-flash**
  (likely `togetherai:zai-org/GLM-5.3` and `togetherai:zai-org/GLM-5.3-flash`).
  Comparing the full model against its flash tier shows what the cheaper
  variant gives up on our tasks. First query Together's models endpoint with
  `TOGETHER_API_KEY` to confirm the exact current ids for both GLM variants
  and DeepSeek, and whether a newer Qwen has replaced `Qwen3.8-2.4T-A95B`.
- **Together AI DeepSeek** — latest V-series chat model. DeepSeek lacks
  multimodal support, but every case in this suite is text-only, so it does
  not disqualify it here. Record that caveat in the README.
- **Anthropic Claude Opus** (`claude-opus-5-5`) — the frontier anchor the task
  names; the config currently has only Sonnet 5.5.
- **Anthropic Claude Sonnet 5.5** — already configured as the default dev
  provider; include it in the comparison matrix too, so the rubric shows both
  Anthropic tiers next to the open models.
- **Gemini** — added as `google:gemini-3.6-flash`, Google's current GA model
  (the Pro tier is still preview-only as of 2026-11). GPT-6 Luna stays in the
  matrix too, so both candidate "second frontier" models are covered.

### 2. Use one fixed grader for all models

Grading each model with itself confounds the comparison: a score difference
can come from the judge instead of the model. Switch every comparison recipe
to a single fixed grader so scores mean the same thing across models.

Decision: Opus is the grader, set once as the `grader` variable at the top of
the justfile so switching to Sonnet 5.5 (cheaper, weaker judge) is one line.

### 3. Add `just` recipes

- `eval-glm`, `eval-glm-flash`, `eval-deepseek`, `eval-opus` — one recipe per
  new provider.
- `eval-matrix` — run all comparison providers in a single Promptfoo run
  (the side-by-side table), with `--output results/matrix.json` so results
  land somewhere scriptable.

### 4. Expand the summarization suite

- Add more summarization cases; `scripts/build-cases.ts` can generate them
  from real data.
- Add summarization-specific asserts (length bound, no invented facts,
  captures budget and location when present) instead of relying only on the
  generic rubric.

### 5. Export scores for the spreadsheet

- New `scripts/export-scores.ts` (run as `node scripts/export-scores.ts`,
  args via `@thi.ng/args`, matching the existing scripts).
- Reads `results/matrix.json` and emits a CSV of model × task
  pass-rate/score rows shaped to match the Category Scores tab, ready to
  paste in.
- `just scores` recipe wraps it.
- Open question: the exact column layout of the Category Scores tab.

### 6. Run the matrix and record results

- Needs `TOGETHER_API_KEY` and `ANTHROPIC_API_KEY`.
- Commit the exported scores, not the raw Promptfoo cache.
- Update the README with the new recipes and the grader rationale.

## Sizing

Steps 1–3 are small config and justfile edits. Steps 4–5 are the real work.
Step 6 is API spend and babysitting.

## Open questions

1. ~~Grader choice~~ — resolved: Opus, switchable via the justfile `grader`
   variable.
2. Exact column layout of the spreadsheet's Category Scores tab.
3. ~~Second frontier model~~ — resolved: both Gemini 3.6 Flash and GPT-6 Luna
   are in the matrix.
