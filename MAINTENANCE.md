# Extension Maintenance Guide

This document describes the design decisions, codebase architecture, and implementation details for maintaining and updating the Unicode Font Changer extension.

---

## File Structure

```
ChangeFontChromeExtension/
├── manifest.json   - Manifest V3 configuration (Content Script injector)
├── content.js      - Core logic, translation engine, UI rendering, event interception
├── content.css     - Custom styled layout of the modal UI (also inlined inside content.js)
├── test.html       - Local test bench with mock extension hooks
├── MAINTENANCE.md  - This maintenance guide
└── TODO.md         - Project checklist and bug-tracking log
```

---

## Technical Architecture

### 1. Injected Script Isolations
To prevent styling from colliding with host website layouts, the extension UI is isolated using a **Shadow DOM**.
- The script appends `#font-changer-extension-root` to the document body.
- It attaches an open shadow root to this element.
- Since strict Content Security Policies (CSPs) on sites like GitHub or Wikipedia block style injection from external schemes (`chrome-extension://`), the CSS code is directly **inlined** inside `content.js` as a string (`INLINED_CSS`) and injected via a `<style>` block in the shadow root.

### 2. Multi-Injection Prevention
When developing locally or reloading the extension, content scripts can be injected multiple times on the same page.
- At the top of `content.js`, we define a deduplication guard:
  ```javascript
  if (!window.__fontChangerLoaded) {
    window.__fontChangerLoaded = true;
    (function() { ... })();
  }
  ```
- This ensures only one instance of the extension runs, preventing duplicate `beforeinput` and `keydown` event listeners which lead to character-doubling and multiple menu layers.

### 3. Font Translation Engine
- Contiguous font alphabets (like math symbols starting at specific code points) are programmatically generated during load using `makeRange(startCode, length)`.
- Exceptions (like lowercase `'h'` in Math Italic, or BMP code points in Blackboard Bold) are overridden using custom dictionary definitions.
- Special fonts like Small Caps, Parenthesized, and Circled Digits utilize explicit mappings or offsets.
- Translating text checks alphabetical case indexes (e.g., `'a'` to `'z'`) and shifts character array mappings.

### 4. Text Interception & Injection
- **Typing Interceptor**: A capture-phase listener intercepts `beforeinput` events. When an active font is selected and `e.inputType === 'insertText'`, it calls `e.preventDefault()` to block the normal typing, translates the incoming character, and inserts it at the caret position using `document.execCommand('insertText', false, translated)`. This preserves the browser's undo/redo history.
- **Selection Handling**: When `Ctrl+M` is pressed, `lastSelection` immediately captures selection offsets and elements *before* focus shifts to the extension's search input. This prevents focus stealing or selection loss.

### 5. Strict Upside-Down Reversion
- To prevent normal ASCII alphanumeric strings (like `"bun"`) from being identified as upside-down and reversed, we maintain a strict set of unique non-ASCII flipped characters (`UNIQUE_UPSIDE_DOWN_CHARS`).
- `removeFontFromText` only reverses word order if more than 33% of the characters belong to the unique set.

---

## Development and Testing
- Run Python's built-in HTTP server: `python3 -m http.server 8080` in the workspace.
- Load `/home/toms1/ChangeFontChromeExtension` into Chrome via `chrome://extensions/` using **Load unpacked**.
- Navigate to `http://localhost:8080/test.html` to test text inputs, textareas, and contenteditable containers.
