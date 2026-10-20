# Run from the repository root. `just install` brings in the toolchain; see Brewfile.
set shell := ["bash", "-cu"]

# Install the Homebrew toolchain (Brewfile) and the scripts' npm dependencies.
install:
    brew bundle install --file=Brewfile
    npm install

# Run and grade with Anthropic Claude Sonnet 5.5, the default. Set ANTHROPIC_API_KEY.
eval:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "claude-sonnet-5-5" --grader "anthropic:messages:claude-sonnet-5-5"

# Run and grade with OpenAI GPT-4o mini only. Set OPENAI_API_KEY.
eval-openai:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "gpt-4o-mini" --grader "openai:gpt-4o-mini"

# Serve Apertus 1.5 8B (text-only GGUF) on port 8080 for eval-local. First run downloads ~8.5 GB.
serve-apertus:
    llama-server --hf-repo andreasmartin/apertus-v1.5-8b-text-Q8_0-GGUF --hf-file apertus-v1.5-8b-text-q8_0.gguf --alias local-model --port 8080 -c 8192 --jinja

# Caching is off because the local-model alias can point at any model, so cached answers would be stale.
# Run and grade with llama-server only. Start it on port 8080 first, for example with `just serve-apertus`.
eval-local:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "local-model" --grader "openai:chat:local-model" -j 1 --no-cache

# Run and grade with Together AI's Qwen3.8 2.4T only. Set TOGETHER_API_KEY.
eval-together:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "Qwen3.8" --grader "togetherai:Qwen/Qwen3.8-2.4T-A95B"

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
