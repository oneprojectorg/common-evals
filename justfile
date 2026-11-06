# Run from the repository root. `just install` brings in the toolchain; see Brewfile.
set shell := ["bash", "-cu"]

# One fixed grader for every comparison recipe, so a score difference means the
# model differed, not the judge. Needs ANTHROPIC_API_KEY.
grader := "anthropic:messages:claude-opus-5-5"

# Install the Homebrew toolchain (Brewfile) and the scripts' npm dependencies.
install:
    brew bundle install --file=Brewfile
    npm install

# Run Anthropic Claude Sonnet 5.5, the default. Set ANTHROPIC_API_KEY.
eval:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "claude-sonnet-5-5" --grader "{{grader}}"

# Run Anthropic Claude Opus 5.5, also the grader. Set ANTHROPIC_API_KEY.
eval-opus:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "claude-opus-5-5" --grader "{{grader}}"

# Run Google Gemini 3.6 Flash only. Set GOOGLE_API_KEY and ANTHROPIC_API_KEY (grader).
eval-gemini:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "gemini-3.6-flash" --grader "{{grader}}"

# Run OpenAI GPT-6 Luna only. Set OPENAI_API_KEY and ANTHROPIC_API_KEY (grader).
eval-openai:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "gpt-6-luna" --grader "{{grader}}"

# Run Together AI's Qwen3.8 2.4T only. Set TOGETHER_API_KEY and ANTHROPIC_API_KEY (grader).
eval-together:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "Qwen3.8" --grader "{{grader}}"

# Run Together AI GLM-5.3 only. Set TOGETHER_API_KEY and ANTHROPIC_API_KEY (grader).
eval-glm:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "GLM-5.3$" --grader "{{grader}}"

# Run Together AI GLM-5.3 Flash only. Set TOGETHER_API_KEY and ANTHROPIC_API_KEY (grader).
eval-glm-flash:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "GLM-5.3-Flash" --grader "{{grader}}"

# Run Together AI DeepSeek V4 Pro only. Set TOGETHER_API_KEY and ANTHROPIC_API_KEY (grader).
eval-deepseek:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "DeepSeek-V4" --grader "{{grader}}"

# Run every comparison provider in one side-by-side eval and write results/matrix.json. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, and TOGETHER_API_KEY.
eval-matrix:
    mkdir -p results
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "claude-sonnet-5-5|claude-opus-5-5|gpt-6-luna|gemini-3.6-flash|GLM-5.3|DeepSeek-V4|Qwen3.8" --grader "{{grader}}" --output results/matrix.json

# Turn results/matrix.json into model x task CSV rows for the rubric spreadsheet.
scores:
    node scripts/export-scores.ts --input results/matrix.json

# Serve Apertus 1.5 8B (text-only GGUF) on port 8080 for eval-local. First run downloads ~8.5 GB.
serve-apertus:
    llama-server --hf-repo andreasmartin/apertus-v1.5-8b-text-Q8_0-GGUF --hf-file apertus-v1.5-8b-text-q8_0.gguf --alias local-model --port 8080 -c 8192 --jinja

# Caching is off because the local-model alias can point at any model, so cached answers would be stale.
# Run and grade with llama-server only. Start it on port 8080 first, for example with `just serve-apertus`.
eval-local:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "local-model" --grader "openai:chat:local-model" -j 1 --no-cache

# Open the latest evaluation results in Promptfoo's web viewer.
view:
    npx --yes promptfoo@latest view

# Validate the YAML configuration without making model calls.
validate:
    npx --yes promptfoo@latest validate -c promptfooconfig.yaml

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
