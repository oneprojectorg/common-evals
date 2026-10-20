# Toolchain for Common Evals.
#   just install    -> brew bundle install --file=Brewfile, then npm install
#
# Promptfoo itself is not here: every recipe runs it through `npx`, which node
# provides. The scripts' npm dependencies come from `npm install`.

# Task runner. Every command in the readme is a recipe in the justfile.
brew "just"

# node runs Promptfoo through npx and runs the TypeScript scripts in scripts/
# directly, stripping the types itself. Needs 22.18 or later.
brew "node"

# Local LLM inference. `llama-server` serves an OpenAI-compatible API on
# 127.0.0.1:8080 for `just eval-local` and `just eval-generated`; see
# `just serve-apertus`.
brew "llama.cpp"

# Builds the Slidy deck in presentations/ with `just presentation`. The Slidy
# script and theme are vendored in templates/, so the Homebrew bottle's lack
# of HTTP support does not matter.
brew "pandoc"

# The One Project typefaces the deck theme uses. Without them the slides fall
# back to a system sans and serif.
cask "font-roboto"
cask "font-roboto-serif"
