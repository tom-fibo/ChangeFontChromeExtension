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
- **Typing Interceptor**: A capture-phase listener intercepts `beforeinput` events on the window. When an active font is selected and `e.inputType === 'insertText'`, it calls `e.preventDefault()` and `e.stopImmediatePropagation()` to block standard typing. The translated character is then inserted at the caret position.
- **Framework Editor Compatibility (Slate.js/Discord)**: Rather than raw DOM manipulation (`execCommand`), which desynchronizes the React state of framework-managed editors (like Slate.js on Discord), the extension detects framework editors via `isFrameworkEditor()` and dispatches a synthetic native `InputEvent` of type `beforeinput` with `inputType: 'insertText'` containing the translated text. Framework editors handle this event natively, keeping state, arrow-key navigation, backspace, and placeholder layouts fully functional.
- **Standard Fallback**: For standard contenteditables and inputs, the extension uses `document.execCommand('insertText')` as primary. If it returns `false`, it falls back to native Range/Selection API manipulation (deleting range content, inserting a text node, and shifting selection carets forward).
- **Caret/Selection Restoration**: To prevent cursor focus loss when the search menu closes (especially on `<html contenteditable>` data URIs or standard pages), `closeMenu` restores `lastSelection` (including collapsed cursor carets) and refocuses the active host element.
- **Recursive Interception Guard**: A global `isInserting` flag prevents the extension from intercepting its own synthetic events or replacements. Both `insertTextEvent` and `replaceSelection` manage this flag.

### 5. Strict Upside-Down Reversion
- To prevent normal ASCII alphanumeric strings (like `"bun"`) from being identified as upside-down and reversed, we maintain a strict set of unique non-ASCII flipped characters (`UNIQUE_UPSIDE_DOWN_CHARS`).
- `removeFontFromText` only reverses word order if more than 33% of the characters belong to the unique set.

---

## Development and Testing

There are three ways to apply and test the extension during development:

### 1. Local Test Bench (`test.html`)
The workspace includes a `test.html` page that directly loads `content.js` via a `<script>` tag. This is the fastest way to test changes locally.
- Run Python's built-in HTTP server in the workspace:
  ```bash
  python3 -m http.server 8080
  ```
- Open `http://localhost:8080/test.html` in your browser.
- Type in the input fields, select text, and use `Ctrl+M` to test the styling and behavior.

### 2. Manual Console Injection (On Any Web Page)
You can manually run and test the extension on any active website without installing the extension.
- Copy the entire code of `content.js`.
- Open Chrome DevTools (`F12` or `Ctrl+Shift+I`) on any target website (e.g., `wikipedia.org`, `github.com`).
- Paste the copied code into the **Console** tab and press `Enter` to inject the extension.
- Select text on the page or focus an input field, then press `Ctrl+M` to test.

### 3. Load unpacked Chrome Extension
To test the extension inside the full extension environment:
- Open Google Chrome and go to `chrome://extensions/`.
- Enable **Developer mode** (toggle in the top-right corner).
- Click **Load unpacked** in the top-left corner.
- Select the `ChangeFontChromeExtension` workspace directory.
- The extension will inject `content.js` on every page load. Use `Ctrl+M` to activate.
