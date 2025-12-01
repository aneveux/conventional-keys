# Conventional Keys - Project Context for Claude

## Project Overview

Conventional Keys is a lightweight Firefox extension that enhances the GitHub Pull Request review experience by providing keyboard-triggered autocomplete for conventional comment prefixes. When a reviewer types `/` in any GitHub comment box, a rofi-like centered menu appears, allowing them to quickly select and insert formatted conventional comment prefixes like `**praise:**`, `**suggestion (blocking):**`, etc.

## Core Functionality

The extension solves a specific problem: making PR reviews more consistent and efficient by standardizing comment prefixes. It enables reviewers to:
- Type `/` to trigger the autocomplete menu
- Filter keywords by typing (e.g., "sug" matches "suggestion")
- Navigate with arrow keys (up/down)
- Select with Enter or mouse click
- Cancel with Escape or clicking outside
- For keywords that support decorators, proceed to a second selection step for modifiers like "blocking" or "non-blocking"
- Insert formatted text at cursor position in both textarea and contentEditable elements

## Architecture

### Entry Point and Initialization

The extension uses a content script model (Manifest V3):
- `content.js` runs on all GitHub pages (except login) at `document_idle`
- `style.css` is injected alongside the script
- The script initializes on load by creating the popup DOM and attaching global event listeners

### State Management

Simple, minimal state with three key variables:
- `currentTarget` - The editable element (textarea or contentEditable) that triggered the popup
- `popupState` - Either 'keywords' or 'decorators', tracking which selection step the user is on
- `selectedKeyword` - The keyword chosen in step 1, used when proceeding to decorator selection

### Data Model

Two arrays define the available options:

**KEYWORDS** (11 items):
- Each has: `key`, `desc`, `decorators` (boolean)
- Examples: praise, nitpick, suggestion, issue, todo, question, thought, chore, note, typo, polish
- Keywords with `decorators: true` trigger a second selection step

**DECORATORS** (3 items):
- Each has: `key`, `desc`
- Options: blocking, non-blocking, if-minor
- Only shown for keywords that support decorators

### Two-Step Selection Flow

1. **Keyword Step**: User sees all keywords, filters by typing, selects one
   - If keyword has `decorators: false` -> insert immediately and close
   - If keyword has `decorators: true` -> proceed to decorator step

2. **Decorator Step**: User sees all decorators, filters by typing, selects one
   - Insert formatted prefix with decorator -> close

### Popup UI

Single reusable DOM structure:
- Fixed position overlay covering entire viewport
- Centered card with:
  - Input field for filtering
  - Scrollable list of options
  - Hint text at bottom
- Rendered once, then shown/hidden as needed
- Same DOM reused for both keyword and decorator steps

### Text Insertion

Handles two types of editable elements:
- **Textarea**: Uses selectionStart/selectionEnd and value manipulation
- **contentEditable**: Uses Selection API and Range manipulation
- Both dispatch 'input' events to trigger GitHub's change detection

### Keyboard Controls

Global keydown listener on document:
- `/` on any editable element -> open popup
- Input field handles: Escape (cancel), Enter (select), Arrow Up/Down (navigate)
- Escape anywhere -> close popup

## File Structure

```
conventional-keys/
├── manifest.json          # Extension manifest (Manifest V3)
├── content.js            # Main logic (310 lines, vanilla JS)
├── style.css            # Popup styling (66 lines)
├── package.js           # Build script for creating zip
├── package.json         # npm metadata and scripts
├── icons/               # Extension icons (16, 48, 128)
├── .github/
│   └── workflows/
│       └── auto-release.yml  # Automated release on push to master
├── LICENSE              # MIT License
└── README.md            # User-facing documentation
```

## Code Style and Conventions

### General Patterns
- Pure vanilla JavaScript, no frameworks or libraries
- Modern ES6+ syntax (const, arrow functions, template literals)
- No build step, no transpilation, no bundler
- Short, focused functions with clear single responsibilities
- Comments only where logic needs clarification

### Naming Conventions
- Constants: UPPER_SNAKE_CASE (e.g., `TRIGGER_KEY`, `POPUP_ID`)
- Functions: camelCase, descriptive verbs (e.g., `showPopup`, `insertPrefix`)
- Variables: camelCase (e.g., `currentTarget`, `popupState`)
- CSS classes: kebab-case with 'ck-' prefix (e.g., `ck-item`, `ck-highlight`)

### DOM Manipulation
- Prefer `querySelector`/`getElementById` over jQuery-style selectors
- Build HTML with template literals for readability
- Use `createElement` and `appendChild` when security matters (avoid innerHTML for user content)
- Clean separation: DOM creation, event binding, and rendering are separate functions

### Event Handling
- Event listeners use arrow functions for context binding
- Always use `addEventListener`, never inline handlers
- Careful event propagation control: `preventDefault()`, `stopPropagation()` only when necessary
- Global listeners attached once in `init()`

## Key Functions Reference

### Popup Management
- `createPopup()` - Creates the popup DOM structure (idempotent)
- `showPopup(target)` - Displays popup for a specific editable element
- `hidePopup()` - Hides popup and restores focus to target
- `cancelAndHide()` - Aborts the entire flow without inserting

### Rendering
- `renderKeywordList(filter)` - Renders filtered keyword options
- `renderDecoratorList(filter)` - Renders filtered decorator options
- `setKeywordListItemContent(li, key, desc, decoratorFormat)` - Builds list item DOM with proper text formatting

### Selection Handlers
- `onKeywordChosen(key)` - Handles keyword selection, either inserts or advances to decorators
- `onDecoratorChosen(decorator)` - Handles decorator selection and inserts combined prefix
- `chooseHighlighted()` - Selects the currently highlighted item
- `moveHighlight(delta)` - Moves highlight up/down with wraparound

### Insertion Logic
- `insertPrefix(key, decorator)` - Formats and inserts the prefix based on element type
- `insertAtTextarea(textarea, text)` - Handles textarea insertion with cursor positioning
- `insertAtContentEditable(el, text)` - Handles contentEditable insertion using Selection API

### Utilities
- `isEditable(elem)` - Checks if element is textarea or contentEditable
- `setHint(txt)` - Updates the hint text at bottom of popup
- `escapeHtml(s)` - Basic HTML escaping (currently unused but available)

## Development Workflow

### Local Development
1. Clone the repository
2. Open `about:debugging#/runtime/this-firefox` in Firefox
3. Click "Load Temporary Add-on" and select `manifest.json`
4. Changes to `content.js` or `style.css` require reloading the extension
5. Test on any GitHub PR page

### Linting
```bash
npm run lint  # Runs ESLint with no warnings allowed
```

### Building
```bash
npm run package  # Creates dist/conventional-keys.zip
```

The package script:
- Includes only: manifest.json, content.js, style.css, icons/
- Excludes hidden files (.git, .DS_Store, etc.)
- Requires `zip` command (Linux, macOS, WSL)

### Release Process (Automated)

On push to master:
1. Release Drafter generates release notes from PRs and commits
2. Version is extracted from the generated tag
3. `package.json` and `manifest.json` are updated with new version
4. Changes are committed with `[skip ci]` to avoid loops
5. Git tag is created
6. Zip artifact is built
7. GitHub release is published with the zip attached

This is fully automated via `.github/workflows/auto-release.yml`.

## Extension Permissions

Declared in `manifest.json`:
- `activeTab` - Access to the currently active tab
- `scripting` - Required for Manifest V3 content scripts
- Host permissions for `*://github.com/*` and `*://*.github.com/*`

## Design Decisions

### Why Manifest V3?
Firefox supports both V2 and V3, but V3 is the future standard. This codebase uses V3 for compatibility and longevity.

### Why No Framework?
- Tiny scope (single popup, simple state)
- Fewer bytes to load
- No build step complexity
- Faster initialization
- Easier to audit and maintain

### Why Content Script Instead of Popup?
The extension needs to:
- Respond to keypresses in GitHub's editable elements
- Insert text at cursor position
- React immediately without user invoking a browser action

This requires a content script that runs in the page context, not a browser popup.

### Why Reuse DOM Instead of Creating/Destroying?
- Faster show/hide (no re-parsing, no re-layout)
- Simpler state management (DOM persists)
- Single source of truth for popup structure

### Why Two-Step Flow for Decorators?
- Not all keywords need decorators (praise, nitpick, todo never use them)
- Forcing decorator selection every time would slow down common cases
- Two-step flow keeps it fast for simple keywords while supporting advanced cases

## Common Modification Scenarios

### Adding a New Keyword
1. Add entry to `KEYWORDS` array in content.js:14
   ```javascript
   { key: 'security', desc: 'Security-related concern', decorators: true }
   ```
2. Test by typing `/` in a GitHub comment and filtering for your keyword

### Adding a New Decorator
1. Add entry to `DECORATORS` array in content.js:29
   ```javascript
   { key: 'nice-to-have', desc: 'Optional improvement' }
   ```
2. Test with a keyword that has `decorators: true`

### Changing the Trigger Key
1. Modify `TRIGGER_KEY` constant in content.js:8
2. Update documentation to reflect new trigger

### Modifying Inserted Format
1. Edit `insertPrefix()` function in content.js:205
2. Current format: `**key (decorator):** ` (bold with colon)
3. Could change to: `[key]`, `// key:`, etc.

### Styling Changes
1. All styles in style.css
2. Dark theme by default (#0b1220 background, #e6eef6 text)
3. Popup uses fixed positioning with centered flexbox
4. Card has rounded corners, shadow, glassmorphism-inspired semi-transparency

### Supporting Non-GitHub Sites
1. Add host_permissions in manifest.json:10
2. Add matches in content_scripts in manifest.json:21
3. Test insertion logic on target site (GitHub's DOM may differ)

## Security Considerations

### XSS Prevention
- User never enters free text that gets rendered as HTML
- All keyword/decorator text is hardcoded in the extension
- When building DOM, use `createElement` + `textContent` instead of `innerHTML` where possible
- The `escapeHtml()` utility exists but isn't currently needed

### Content Script Isolation
- Content scripts run in isolated world (can access DOM but not page JavaScript)
- No message passing to background scripts (none exist in this extension)
- No eval, no dynamic code generation

### Permissions Minimalism
- Only requests permissions needed: activeTab, scripting, github.com
- No broad host permissions like `<all_urls>`
- No storage permission (nothing persisted)

## Testing Checklist

When making changes, verify:
- [ ] Popup appears when typing `/` in GitHub PR comment box
- [ ] Filtering works (typing "sug" shows "suggestion")
- [ ] Arrow keys navigate correctly with wraparound
- [ ] Enter selects the highlighted item
- [ ] Escape closes popup without inserting
- [ ] Clicking outside popup cancels
- [ ] Keywords without decorators insert immediately
- [ ] Keywords with decorators advance to decorator step
- [ ] Text inserts at correct cursor position in textareas
- [ ] Text inserts at correct cursor position in contentEditable (GitHub's new comment editor)
- [ ] Extension works on both PR conversation comments and PR review comments
- [ ] No console errors
- [ ] `npm run lint` passes

## Known Limitations

- Requires `zip` command for packaging (not pure Node.js)
- GitHub-only, not generic for all sites
- No configuration UI (keywords/decorators are hardcoded)
- No persistence or user customization
- Decorator format is fixed (no user-defined templates)

## Future Enhancement Ideas (Not Implemented)

These are explicitly NOT in scope but documented for context:
- Custom keyword definitions via options page
- Sync settings across devices
- Site-specific keyword sets
- Markdown preview of inserted text
- Recent keywords list
- Statistics on keyword usage
- Support for Gitlab, Bitbucket, etc.

## Dependencies

### Runtime
- None (pure vanilla JavaScript)

### Development
- `eslint` (v9.33.0) - Linting only, not required for building

### Build/Release
- Node.js 20 (for package.js script)
- `zip` command-line tool (for creating extension archive)
- GitHub Actions (for automated releases)

## Browser Compatibility

Tested and designed for:
- Firefox (primary target)
- Manifest V3 APIs
- Modern ES6+ JavaScript (const, arrow functions, template literals, array methods)

Not tested/supported:
- Chrome/Edge (though Manifest V3 is compatible, installation differs)
- Safari
- Older Firefox versions (pre-ES6 support)

## Repository Metadata

- License: MIT
- Author: Antoine Neveux
- Repository: https://github.com/aneveux/conventional-keys
- Current Version: 0.1.3 (as of last commit)

## When Working on This Codebase

1. **Read the code first**: It's only 310 lines of JavaScript. Read content.js in full before making changes.
2. **Maintain simplicity**: Resist adding dependencies, frameworks, or build complexity.
3. **Test on real GitHub PRs**: Local testing isn't enough; GitHub's DOM structure matters.
4. **Preserve keyboard-first UX**: Every operation should be possible without the mouse.
5. **Keep it fast**: Extension should load and show popup in <100ms.
6. **Update version properly**: Let the automated release workflow handle versioning, or manually update both package.json and manifest.json together.
7. **Document breaking changes**: If you change keyword format, trigger key, or insertion behavior, update README.md.

## Questions to Ask Before Making Changes

- Does this change align with the "simple, keyboard-driven" philosophy?
- Will this require a build step or dependency?
- Does this work in both textarea and contentEditable contexts?
- Have I tested on an actual GitHub PR page?
- Does the change maintain backward compatibility with existing keywords?
- Is the change documented in the commit message?

## Additional Context

The name "Conventional Keys" is a play on:
1. "Conventional Commits" (the concept of standardized commit prefixes)
2. "Keys" (keyboard-driven interface)
3. "Keys" (the keyword prefixes themselves)

The rofi-like UI is inspired by rofi (a Linux application launcher), characterized by:
- Centered overlay
- Fuzzy/substring filtering
- Keyboard-first navigation
- Minimal, focused design
