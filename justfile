# Run from the repository root. Requires Node.js, just, and llama-server for local grading.
set shell := ["bash", "-cu"]

# Run the default OpenAI evaluation.
eval:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml

# Run with a local llama-server model. Start llama-server on port 8080 first.
eval-local:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "local-model" -j 1

# Run and grade with Together AI. Set TOGETHER_API_KEY.
eval-together:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "Llama-3.3" --grader "togetherai:meta-llama/Llama-3.3-70B-Instruct-Turbo"

# Open the latest evaluation results in Promptfoo's web viewer.
view:
    npx --yes promptfoo@latest view

# Validate the YAML configuration without making model calls.
validate:
    npx --yes promptfoo@latest validate -c promptfooconfig.yaml
