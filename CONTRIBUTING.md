# Contributing

The site is in active early development and is **not accepting external
contributions** at this time.

This may change once the project reaches a stable release.

**Security vulnerabilities** in the tooling should be reported to the
[aw-cli](https://github.com/aw-tools/aw-cli/blob/main/SECURITY.md) repository,
not through public channels.

## Content

The guide and the specification are written in
[agentic-workspace](https://github.com/aw-tools/agentic-workspace) and rendered
here. Change their text there, never in this repository.

The build converts the guide into `content/guide/` and the spec into
`content/spec/`, and never commits the result: `content/guide/_index.md` is the
only tracked file in either directory. It reads a checkout of
`agentic-workspace` beside this one, or the path in `AW_SOURCE`. The guide
import checks the live sitemap, so it needs the network; the spec import does
not. A push to that repository's `main` that touches the guide, the spec or its
errata starts a rebuild here. When a chapter is renamed, add its old and new
names to `guide-renames.txt`, so the old address keeps working.

Every revision of `SPEC.md` gets its own page, at `/spec/r<N>/`. The current
revision comes from the working tree; a superseded one comes from that
repository's `spec-r<N>` tag, which freezes revision N's text as it stood at the
commit that revision was replaced. `/spec/` redirects to the current revision.
Corrections to a superseded revision come from `SPEC-ERRATA.md` beside
`SPEC.md`.

## Development

Run `just setup` once per clone: it points git at `.githooks`, whose pre-commit
hook checks formatting with dprint. Run `just ci` before pushing: it is the same
pipeline the `Site` workflow runs, so a green run here is the check passing
there. The Zola and Pagefind versions are pinned in the `justfile`, which
downloads them into `.tools/`; `just serve` previews the site locally. Throwaway
files go under `tmp/`, which is ignored.

## Commits

Commit subjects and pull request titles take the form `type(scope): subject`,
where the type is one of `feat`, `fix`, `refactor`, `chore`, `doc`, `deps`,
`test` or `ci`. The scope is optional and a trailing `!` marks a breaking
change. Branch names take one of six prefixes: `feat`, `fix`, `refactor`, `doc`,
`ci` or `deps`.

Pull requests are squash merged, so the title becomes the only commit subject
that reaches `main`. The `Pull request health` workflow reports a
`PR health check` status, and that check fails when the title does not match.
Fixing the title in place turns it green; no push is needed.

Commits are signed.

## Delivery

Every change reaches `main` through a pull request: a signed commit on a
prefixed branch, pushed, then opened as a draft. A merge to `main` deploys the
site.

The body says what the change does, then why, in short paragraphs of plain
language. Write about the change, not about the person making it. No em dashes,
and no test plan, validation or monitoring section: the checks report
themselves.
