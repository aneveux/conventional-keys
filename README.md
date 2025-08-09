# 🐢 Conventional Keys

**Conventional Keys** is a small Firefox extension that enhances the GitHub Pull Request review experience.
It shows a centered, rofi-like menu when you type `/` inside a PR comment box so you can quickly insert conventional comment prefixes.

## Installation (dev)

1. Clone the repo.
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click *Load Temporary Add-on* and pick `manifest.json` from the project root.

## Packaging

The repository includes a `package.json` with convenience scripts:

- `npm run lint` — run ESLint (dev dependency)
- `npm run package` — create `dist/conventional-keys.zip` containing the extension files

## Contributing

Contributions welcome. Please open issues or PRs with small, focused changes.

## License

MIT
