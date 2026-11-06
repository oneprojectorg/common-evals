# Run from the repository root. `just install` brings in the toolchain; see Brewfile.
set shell := ["bash", "-cu"]

# Load the provider API keys from .env.local (gitignored; copy .env.example).
# A key already exported in the shell wins over the file, so per-run overrides
# still work. The file is optional; recipes behave as before without it.
set dotenv-filename := ".env.local"

# One fixed grader for every comparison recipe, so a score difference means the
# model differed, not the judge. Needs TOGETHER_API_KEY. Override it per run,
# for example to grade with Claude Opus 5.5 (needs ANTHROPIC_API_KEY):
#   just grader=anthropic:messages:claude-opus-5-5 eval-matrix
grader := "togetherai:zai-org/GLM-5.3"

# Which test suite the eval recipes run. The default is the hand-written
# starter cases. To run the cases built from the catalog datasets instead
# (run `just build-cases` first):
#   just config=promptfooconfig.generated.yaml eval-matrix
config := "promptfooconfig.yaml"

# Install the Homebrew toolchain (Brewfile) and the scripts' npm dependencies.
install:
    brew bundle install --file=Brewfile
    npm install

# Run Anthropic Claude Sonnet 5.5, the default. Set ANTHROPIC_API_KEY and TOGETHER_API_KEY (grader).
eval:
    npx --yes promptfoo@latest eval -c {{config}} --filter-providers "claude-sonnet-5-5" --grader "{{grader}}"

# Run Anthropic Claude Opus 5.5. Set ANTHROPIC_API_KEY and TOGETHER_API_KEY (grader).
eval-opus:
    npx --yes promptfoo@latest eval -c {{config}} --filter-providers "claude-opus-5-5" --grader "{{grader}}"

# Run Google Gemini 3.6 Flash only. Set GOOGLE_API_KEY and TOGETHER_API_KEY (grader).
eval-gemini:
    npx --yes promptfoo@latest eval -c {{config}} --filter-providers "gemini-3.6-flash" --grader "{{grader}}"

# Run OpenAI GPT-6 Luna only. Set OPENAI_API_KEY and TOGETHER_API_KEY (grader).
eval-openai:
    npx --yes promptfoo@latest eval -c {{config}} --filter-providers "gpt-6-luna" --grader "{{grader}}"

# Run Together AI GLM-5.3 only. Set TOGETHER_API_KEY; the grader uses it too.
# GLM judges its own answers here, so compare its rubric scores with care.
eval-glm:
    npx --yes promptfoo@latest eval -c {{config}} --filter-providers "togetherai:zai-org/GLM-5.3$" --grader "{{grader}}"

# Run Together AI GLM-5.3 Flash only. Set TOGETHER_API_KEY; the grader is its larger sibling GLM-5.3.
eval-glm-flash:
    npx --yes promptfoo@latest eval -c {{config}} --filter-providers "togetherai:.*GLM-5.3-Flash" --grader "{{grader}}"

# Run Together AI DeepSeek V4 Pro only. Set TOGETHER_API_KEY; the grader uses it too.
eval-deepseek:
    npx --yes promptfoo@latest eval -c {{config}} --filter-providers "DeepSeek-V4" --grader "{{grader}}"

# Run Together AI Kimi K3 only. Set TOGETHER_API_KEY; the grader uses it too.
eval-kimi:
    npx --yes promptfoo@latest eval -c {{config}} --filter-providers "Kimi-K3" --grader "{{grader}}"

# Run and grade GLM-5.3 on Hugging Face's router. Set HF_TOKEN; no other key needed.
# GLM judges its own answers here, so compare its rubric scores with care.
eval-hf-glm:
    npx --yes promptfoo@latest eval -c {{config}} --filter-providers "huggingface:.*GLM-5.3" --grader "huggingface:chat:zai-org/GLM-5.3"

# Run Qwen3.8 2.4T on Hugging Face's router only. Set HF_TOKEN and TOGETHER_API_KEY (grader).
eval-hf-qwen:
    npx --yes promptfoo@latest eval -c {{config}} --filter-providers "huggingface:.*Qwen3.8-2.4T" --grader "{{grader}}"

# Run Qwen3.8 27B on Hugging Face's router only. Set HF_TOKEN and TOGETHER_API_KEY (grader).
eval-hf-qwen-27b:
    npx --yes promptfoo@latest eval -c {{config}} --filter-providers "huggingface:.*Qwen3.8-27B" --grader "{{grader}}"

# Run Qwen3.6 35B A3B on Hugging Face's router only. Set HF_TOKEN and TOGETHER_API_KEY (grader).
eval-hf-qwen36:
    npx --yes promptfoo@latest eval -c {{config}} --filter-providers "huggingface:.*Qwen3.6-35B" --grader "{{grader}}"

# Run Apertus v1.5 70B on Hugging Face's router only. Set HF_TOKEN and TOGETHER_API_KEY (grader).
eval-hf-apertus:
    npx --yes promptfoo@latest eval -c {{config}} --filter-providers "huggingface:.*Apertus" --grader "{{grader}}"

# Run the comparison providers whose API keys are set and write results/matrix.json. The grader's key is required; ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, TOGETHER_API_KEY, and HF_TOKEN each add their models.
eval-matrix:
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{grader}}" in
        anthropic:*) grader_key="${ANTHROPIC_API_KEY:-}"; grader_key_name="ANTHROPIC_API_KEY" ;;
        huggingface:*) grader_key="${HF_TOKEN:-}${HF_API_TOKEN:-}"; grader_key_name="HF_TOKEN or HF_API_TOKEN" ;;
        openai:*) grader_key="${OPENAI_API_KEY:-}"; grader_key_name="OPENAI_API_KEY" ;;
        google:*) grader_key="${GOOGLE_API_KEY:-}"; grader_key_name="GOOGLE_API_KEY" ;;
        togetherai:*) grader_key="${TOGETHER_API_KEY:-}"; grader_key_name="TOGETHER_API_KEY" ;;
        *) grader_key="unchecked"; grader_key_name="" ;;
    esac
    if [ -z "$grader_key" ]; then
        echo "$grader_key_name is not set; the grader {{grader}} needs it" >&2
        exit 1
    fi
    providers=()
    [ -n "${ANTHROPIC_API_KEY:-}" ] && providers+=("anthropic:") || echo "ANTHROPIC_API_KEY not set; skipping the Claude models"
    [ -n "${OPENAI_API_KEY:-}" ] && providers+=("gpt-6-luna") || echo "OPENAI_API_KEY not set; skipping GPT-6 Luna"
    [ -n "${GOOGLE_API_KEY:-}" ] && providers+=("google:") || echo "GOOGLE_API_KEY not set; skipping Gemini 3.6 Flash"
    [ -n "${TOGETHER_API_KEY:-}" ] && providers+=("togetherai:") || echo "TOGETHER_API_KEY not set; skipping the Together AI models"
    [ -n "${HF_TOKEN:-}${HF_API_TOKEN:-}" ] && providers+=("huggingface:") || echo "HF_TOKEN not set; skipping the Hugging Face models"
    if [ ${#providers[@]} -eq 0 ]; then
        echo "no provider API keys are set; nothing to run" >&2
        exit 1
    fi
    filter=$(IFS='|'; echo "${providers[*]}")
    echo "running the providers matching: $filter"
    mkdir -p results
    npx --yes promptfoo@latest eval -c {{config}} --filter-providers "$filter" --grader "{{grader}}" --output results/matrix.json

# Run every suite (the starter cases plus the generated catalog cases) across
# every model whose API key is set, in one matrix run. Rebuilds the generated
# cases and configs first; the datasets come from `just download`.
eval-all: build-cases
    just config=promptfooconfig.all.yaml grader="{{grader}}" eval-matrix

# Turn results/matrix.json into model x task CSV rows for the rubric spreadsheet.
scores:
    node scripts/export-scores.ts --input results/matrix.json

# Serve Apertus 1.5 8B (text-only GGUF) on port 8080 for eval-local. First run downloads ~8.5 GB.
serve-apertus:
    llama-server --hf-repo andreasmartin/apertus-v1.5-8b-text-Q8_0-GGUF --hf-file apertus-v1.5-8b-text-q8_0.gguf --alias local-model --port 8080 -c 8192 --jinja

# Caching is off because the local-model alias can point at any model, so cached answers would be stale.
# Run and grade with llama-server only. Start it on port 8080 first, for example with `just serve-apertus`.
eval-local:
    npx --yes promptfoo@latest eval -c {{config}} --filter-providers "local-model" --grader "openai:chat:local-model" -j 1 --no-cache

# Open the latest evaluation results in Promptfoo's web viewer.
view:
    npx --yes promptfoo@latest view

# Validate the YAML configuration without making model calls.
validate:
    npx --yes promptfoo@latest validate -c {{config}}

# Print the dataset catalog (data/catalog.yaml) with access status and file counts.
catalog:
    node scripts/download.ts --list

# Download one or more catalog datasets into data/raw/<id>/, for example `just download cambridge-pb`.
download +ids:
    node scripts/download.ts {{ids}}

# Download every public dataset in the catalog (about 600 MB; Habermas Machine is most of it).
download-all:
    node scripts/download.ts --all

# Build Promptfoo test files under tests/generated/ from the downloaded datasets.
build-cases *args:
    node scripts/build-cases.ts {{args}}

# Run the generated cases with llama-server, like eval-local. Run `just build-cases` and start the server first.
eval-generated:
    npx --yes promptfoo@latest eval -c promptfooconfig.generated.yaml --filter-providers "local-model" --grader "openai:chat:local-model" -j 1 --no-cache

# templates/slidy/ holds the W3C Slidy script, stylesheet, and icons, so the build needs no network and no pandoc
# HTTP support; --embed-resources inlines them. The theme is copied from oneproject-knowledge-base/templates/.
# Build a self-contained Slidy deck from a Markdown file, for example `just build-presentation presentations/common-evals.md`.
build-presentation FILE:
    pandoc -t slidy --embed-resources --standalone --variable slidy-url=templates/slidy --css templates/ef-cherie-slidy.css {{FILE}} -o {{replace(FILE, ".md", ".html")}}

# Rebuild the deck on how this repository works: presentations/common-evals.html.
presentation: (build-presentation "presentations/common-evals.md")
