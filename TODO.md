# Extension Todo List

This file tracks active development tasks, completed features, and bug fixes for the Unicode Font Changer extension.

## Completed Tasks

- [x] Initial design and architecture setup
- [x] Contiguous and custom character map generation (18 fonts)
- [x] Keydown capture phase shortcuts (`Ctrl+M` to open menu, `Ctrl+Shift+M` to clear format)
- [x] In-page typing interceptor (`beforeinput` listener) for active fonts
- [x] Selection text capture and replacement (`document.execCommand('insertText')` integration)
- [x] Shadow DOM isolation setup with custom glassmorphic styling
- [x] Search filter input and keyboard navigation (Arrows, Enter, Escape)
- [x] Test bench development (`test.html`) with fallback runtime mock API for non-extension environments

## Bug Patches

- [x] **Bug**: Selecting text, then running `Ctrl+M` should change the selected text (but leave the font for newly typed characters unchanged).
  - *Fix*: Captured selection details into `lastSelection` state variable immediately on key down, prior to menu open and search focus. Selection replacements now apply to the stored target, keeping the active typography font untouched.
- [x] **Bug**: Running `Ctrl+Shift+M` on regular text when not upside down still tries to upside-down it.
  - *Fix*: Integrated a set of strict unique non-ASCII flipped symbols (`UNIQUE_UPSIDE_DOWN_CHARS`). Standard alphanumeric words containing letters like `'q', 'p', 'b', 'n', 'u'` are no longer mistakenly detected as upside-down or reversed in order.
- [x] **Bug**: Selecting a font in the menu (click or enter) sometimes doesn't close the menu (then clicking another font doubles all typed characters, e.g. a to 𝐚𝐚).
  - *Fix*: Enforced a single script execution guard (`window.__fontChangerLoaded`) around the content script block. Multiple evaluations (such as standard Chrome injections overlaying manual script loads) no longer instantiate redundant DOM menus or duplicate keyboard listeners.
- [x] **Bug**: Some pages, such as `discord.com` or `data:text/html,<html contenteditable>` do not function at (typing text with a font active does not change the typed text). 

## Future Enhancements & Maintenance

- [x] Change the font selection menu to use a grid layout, so all fonts are viewable without scrolling.
- [X] Add more Unicode stylized scripts (e.g. bold-fraktur, italic cursive).
- [ ] Add options page to customize keyboard shortcut combinations.
- [ ] Add toggle to choose between light and dark glassmorphic themes.
- [ ] Research replacements for `document.execCommand` if deprecated in future Chrome releases.
