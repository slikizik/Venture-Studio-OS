# Git for Project Owners

## Plain-language definitions

- **Repository:** the whole version-controlled project and its history.
- **main:** the latest verified official version.
- **Branch:** a separate line of proposed work.
- **Worktree:** a separate physical folder containing one checked-out branch.
- **File tree:** the visible files and folders inside a project folder.
- **Commit:** a recorded progress point.
- **Merge:** adding an approved branch into the official line.
- **Tag:** a permanent release label such as `v1.0.0`.

## VSO-friendly labels

| VSO label | Git meaning |
|---|---|
| Official Version | `main` |
| Development Version | branch/worktree |
| Save Progress Point | commit |
| Compare With Official | diff |
| Add to Official Version | merge |
| Publish Version | tag/release |


## Two-computer workflow

For the exact Windows/Linux handoff procedure, use `docs/SMART_GIT_SYNC_GUIDE.md`. The normal cycle is `resume → work → handoff`; do not manually copy dependencies or overwrite one project folder with another as the regular sync method.
