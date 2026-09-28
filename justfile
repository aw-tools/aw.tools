# The one place the Zola and Pagefind versions live; CI runs these recipes too.
zola_version := "0.23.6"
pagefind_version := "1.5.2"

# SHA-256 of each release archive, per platform. Pagefind's match its own
# published .sha256 files; Zola publishes none, so its were taken on first
# download.
zola_sha256_macos_aarch64 := "cbffbd29b3f59c3f52633507c8cb945a7a02d8b1399b43b235f5932912297aa3"
zola_sha256_linux_x86_64 := "8f5132b3522412d04e395e0b25f6d68613ad272a873e54a2b3ebf664873024a4"
pagefind_sha256_macos_aarch64 := "7286f394a349bd37677d44a65a20078a02b1747da0b0814d83403bf86be17abe"
pagefind_sha256_linux_x86_64 := "afb824a9e7f64905a934900481cea5be679c03975e527329e0e5e6cc70f5feda"

bin := justfile_directory() / ".tools"

# The agentic-workspace checkout the guide comes from; CI checks it out itself.
source := env("AW_SOURCE", justfile_directory() / ".." / "agentic-workspace")

# List available recipes
default:
    @just --list

# Check formatting
fmt:
    dprint check

# Fix formatting
fmt-fix:
    dprint fmt

# Build the site into public/ and index it for search. Every page renders as
# <path>/index.html, so the glob keeps 404.html out of the search results.
build: tools import
    {{ bin }}/zola build --force
    {{ bin }}/pagefind --site public --glob "**/index.html"

# Lint the GitHub Actions workflows
actionlint:
    actionlint

# Run the full CI pipeline
ci: fmt build actionlint

# Configure git hooks (run once after clone)
setup:
    git config core.hooksPath .githooks

# Serve a live-reloading preview; search needs `just build`.
serve: tools import
    {{ bin }}/zola serve

# Convert the guide into content/guide/, checked against the live sitemap
import:
    node scripts/import-guide.mjs "{{ source }}/guide" https://aw.tools/sitemap.xml

# Download the pinned release binaries into .tools/, unless already there.
tools:
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{ os() }}-{{ arch() }}" in
      macos-aarch64)
        zola_target=aarch64-apple-darwin zola_sha={{ zola_sha256_macos_aarch64 }}
        pagefind_target=aarch64-apple-darwin pagefind_sha={{ pagefind_sha256_macos_aarch64 }} ;;
      linux-x86_64)
        zola_target=x86_64-unknown-linux-gnu zola_sha={{ zola_sha256_linux_x86_64 }}
        pagefind_target=x86_64-unknown-linux-musl pagefind_sha={{ pagefind_sha256_linux_x86_64 }} ;;
      *) echo "no pinned binaries for {{ os() }}-{{ arch() }}" >&2; exit 1 ;;
    esac
    mkdir -p "{{ bin }}"
    fetch() { # name version url sha
      if [ "$("{{ bin }}/$1" --version 2>/dev/null)" = "$1 $2" ]; then return; fi
      tmp=$(mktemp -d)
      curl -fsSLo "$tmp/archive.tar.gz" "$3"
      echo "$4  $tmp/archive.tar.gz" | shasum -a 256 -c --quiet -
      tar -xzf "$tmp/archive.tar.gz" -C "$tmp" "$1"
      mv "$tmp/$1" "{{ bin }}/$1"
      rm -rf "$tmp"
      echo "installed $1 $2"
    }
    fetch zola {{ zola_version }} \
      "https://github.com/getzola/zola/releases/download/v{{ zola_version }}/zola-v{{ zola_version }}-$zola_target.tar.gz" \
      "$zola_sha"
    fetch pagefind {{ pagefind_version }} \
      "https://github.com/Pagefind/pagefind/releases/download/v{{ pagefind_version }}/pagefind-v{{ pagefind_version }}-$pagefind_target.tar.gz" \
      "$pagefind_sha"
