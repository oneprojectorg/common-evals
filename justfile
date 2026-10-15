# Run from the repository root. Requires Node.js and an OpenAI API key.
set shell := ["bash", "-cu"]

# Run the configured evaluations.
eval:
    npx --yes promptfoo@latest eval -c promptfooconfig.yaml

# Open the latest evaluation results in Promptfoo's web viewer.
view:
    npx --yes promptfoo@latest view

# Validate the YAML configuration without making model calls.
validate:
    npx --yes promptfoo@latest validate -c promptfooconfig.yaml
