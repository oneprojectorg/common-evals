# Run from the repository root. Requires Node.js, just, and llama-server for local grading.
set shell := ["bash", "-cu"]

# Run and grade with OpenAI only. Set OPENAI_API_KEY.
eval:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "gpt-4o-mini" --grader "openai:gpt-4o-mini"

# Run and grade with llama-server only. Start it on port 8080 first.
eval-local:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "local-model" --grader "openai:chat:local-model" -j 1

# Run and grade with Together AI only. Set TOGETHER_API_KEY.
eval-together:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml --filter-providers "Llama-3.3" --grader "togetherai:meta-llama/Llama-3.3-70B-Instruct-Turbo"

# Open the latest evaluation results in Promptfoo's web viewer.
view:
    npx --yes promptfoo@latest view

# Validate the YAML configuration without making model calls.
validate:
    npx --yes promptfoo@latest validate -c promptfooconfig.yaml
