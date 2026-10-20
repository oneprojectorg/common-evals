# Run from the repository root. Requires Node.js, just, and llama-server for local grading.
set shell := ["bash", "-cu"]

# Run and grade with OpenAI only. Set OPENAI_API_KEY.
eval:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "gpt-4o-mini" --grader "openai:gpt-4o-mini"

# Serve Apertus 1.5 8B (text-only GGUF) on port 8080 for eval-local. First run downloads ~8.5 GB.
serve-apertus:
    llama-server --hf-repo andreasmartin/apertus-v1.5-8b-text-Q8_0-GGUF --hf-file apertus-v1.5-8b-text-q8_0.gguf --alias local-model --port 8080 -c 8192 --jinja

# Caching is off because the local-model alias can point at any model, so cached answers would be stale.
# Run and grade with llama-server only. Start it on port 8080 first, for example with `just serve-apertus`.
eval-local:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "local-model" --grader "openai:chat:local-model" -j 1 --no-cache

# Run and grade with Together AI only. Set TOGETHER_API_KEY.
eval-together:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "Llama-3.3" --grader "togetherai:meta-llama/Llama-3.3-70B-Instruct-Turbo"

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
