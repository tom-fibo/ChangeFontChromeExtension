if (!window.__fontChangerLoaded) {
  window.__fontChangerLoaded = true;

  (function() {
    // State Variables
    let activeFont = null;
    let isOpen = false;
    let focusedIndex = 0;
    let visibleFonts = [];
    let lastActiveElement = null;
    let lastSelection = null; // Store captured selection details
    let overlayEl = null;
    let shadowRoot = null;
    let isInserting = false;

    // Helper to generate contiguous Unicode character arrays
    function makeRange(startCode, length = 26) {
      const arr = [];
      for (let i = 0; i < length; i++) {
        arr.push(String.fromCodePoint(startCode + i));
      }
      return arr;
    }

    // Font Mappings Configuration
    const FONTS = [
      {
        id: 'math-bold',
        name: 'Math Bold',
        group: 'serif',
        upper: makeRange(0x1D400),
        lower: makeRange(0x1D41A),
        digits: makeRange(0x1D7CE, 10),
        preview: '𝐀𝐁𝐂 𝐚𝐛𝐜 𝟎𝟏𝟐'
      },
      {
        id: 'math-italic',
        name: 'Math Italic',
        group: 'serif',
        upper: makeRange(0x1D434),
        lower: (() => {
          const r = makeRange(0x1D44E);
          r[7] = 'ℎ'; // index 7 is lowercase 'h'
          return r;
        })(),
        preview: '𝐴𝐵𝐶 𝑎𝑏𝑐'
      },
      {
        id: 'math-bold-italic',
        name: 'Math Bold Italic',
        group: 'serif',
        upper: makeRange(0x1D468),
        lower: makeRange(0x1D482),
        preview: '𝑨𝑩𝑿 𝒂𝒃𝒄'
      },
      {
        id: 'math-sans',
        name: 'Math Sans-Serif',
        group: 'sans-serif',
        upper: makeRange(0x1D5A0),
        lower: makeRange(0x1D5BA),
        digits: makeRange(0x1D7E2, 10),
        preview: '𝖠𝖡𝖢 𝖺𝖻𝖼 𝟢𝟣𝟤'
      },
      {
        id: 'math-sans-bold',
        name: 'Math Sans Bold',
        group: 'sans-serif',
        upper: makeRange(0x1D5D4),
        lower: makeRange(0x1D5EE),
        digits: makeRange(0x1D7EC, 10),
        preview: '𝗔𝗕𝗖 𝗮𝗯𝗰 𝟬𝟭𝟮'
      },
      {
        id: 'math-sans-italic',
        name: 'Math Sans Italic',
        group: 'sans-serif',
        upper: makeRange(0x1D608),
        lower: makeRange(0x1D622),
        preview: '𝘈𝘉𝘊 𝘢𝘓𝘤'
      },
      {
        id: 'math-sans-bold-italic',
        name: 'Math Sans Bold Italic',
        group: 'sans-serif',
        upper: makeRange(0x1D63C),
        lower: makeRange(0x1D656),
        preview: '𝘼𝘽𝘾 𝙖𝙗𝙘'
      },
      {
        id: 'math-script-bold',
        name: 'Script Bold',
        group: 'stylized',
        upper: makeRange(0x1D4D0),
        lower: makeRange(0x1D4EA),
        preview: '𝓐𝓑𝓒 𝓪𝓫𝓬'
      },
      {
        id: 'math-fraktur-bold',
        name: 'Gothic Bold',
        group: 'stylized',
        upper: makeRange(0x1D5C0),
        lower: makeRange(0x1D5DA),
        preview: '𝕬𝕭𝕮 𝖆𝖇𝖈'
      },
      {
        id: 'double-struck',
        name: 'Blackboard Bold',
        group: 'stylized',
        upper: (() => {
          const r = makeRange(0x1D538);
          const exc = { 2: '\u2102', 7: '\u210D', 13: '\u2115', 15: '\u2119', 16: '\u211A', 17: '\u211D', 25: '\u2124' };
          for (const [idx, val] of Object.entries(exc)) {
            r[parseInt(idx)] = val;
          }
          return r;
        })(),
        lower: makeRange(0x1D552),
        digits: makeRange(0x1D7D8, 10),
        preview: 'mathbb 𝔸𝔹ℂ 𝕒𝕓𝕔 𝟘𝟙𝟚'
      },
      {
        id: 'monospace',
        name: 'Monospace',
        group: 'stylized',
        upper: makeRange(0x1D670),
        lower: makeRange(0x1D68A),
        digits: makeRange(0x1D7F6, 10),
        preview: '𝙰𝙱𝙲 𝚊𝚋𝚌 𝟶𝟷𝟸'
      },
      {
        id: 'small-caps',
        name: 'Small Caps',
        group: 'special',
        upper: makeRange(65, 26),
        lower: Array.from("ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ"),
        preview: 'ᴀʙᴄᴅᴇꜰɢ ʜɪᴊᴋʟᴍɴ'
      },
      {
        id: 'circled',
        name: 'Circled',
        group: 'enclosed',
        upper: makeRange(0x24B6),
        lower: makeRange(0x24D0),
        digits: ['⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'],
        preview: 'ⒶⒷⒸ ⓐⓑⓒ ①②③'
      },
      {
        id: 'negative-circled',
        name: 'Circled Negative',
        group: 'enclosed',
        upper: makeRange(0x1F150),
        lower: makeRange(0x1F150),
        digits: ['⓿', '❶', '❷', '❸', '❹', '❺', '❻', '❼', '❽', '❾'],
        preview: '🅐🅑🅒 ❶❷❸'
      },
      {
        id: 'parenthesized',
        name: 'Parenthesized',
        group: 'special',
        upper: makeRange(0x249C),
        lower: makeRange(0x249C),
        digits: ['0', '⑴', '⑵', '⑶', '⑷', '⑸', '⑹', '⑺', '⑻', '⑼'],
        preview: '⒜⒝⒞ ⑴⑵⑶'
      },
      {
        id: 'squared',
        name: 'Squared',
        group: 'enclosed',
        upper: makeRange(0x1F130),
        lower: makeRange(0x1F130),
        preview: '🄰🄱🄲 🄳🄴🄵'
      },
      {
        id: 'negative-squared',
        name: 'Squared Negative',
        group: 'enclosed',
        upper: makeRange(0x1F170),
        lower: makeRange(0x1F170),
        preview: '🅰🅱🅲 🅳🅴🅵'
      },
      {
        id: 'math-script',
        name: 'Script',
        group: 'stylized',
        upper: (() => {
          const r = makeRange(0x1D49C);
          const exc = { 1: '\u212C', 4: '\u2130', 5: '\u2131', 7: '\u210B', 8: '\u2110', 11: '\u2112', 12: '\u2133', 17: '\u211B' };
          for (const [idx, val] of Object.entries(exc)) {
            r[parseInt(idx)] = val;
          }
          return r;
        })(),
        lower: (() => {
          const r = makeRange(0x1D4B6);
          const exc = { 4: '\u212F', 6: '\u210A', 11: '\u2113', 14: '\u2134' };
          for (const [idx, val] of Object.entries(exc)) {
            r[parseInt(idx)] = val;
          }
          return r;
        })(),
        preview: '𝒜ℬ𝒞 𝒶𝒷𝒸'
      },
      {
        id: 'math-fraktur',
        name: 'Gothic',
        group: 'stylized',
        upper: (() => {
          const r = makeRange(0x1D504);
          const exc = { 2: '\u212D', 7: '\u210C', 8: '\u2111', 17: '\u211C', 25: '\u2128' };
          for (const [idx, val] of Object.entries(exc)) {
            r[parseInt(idx)] = val;
          }
          return r;
        })(),
        lower: makeRange(0x1D51E),
        preview: '𝔄𝔅ℭ 𝔞𝔟𝔠'
      },
      {
        id: 'fullwidth',
        name: 'Fullwidth',
        group: 'special',
        upper: makeRange(0xFF21),
        lower: makeRange(0xFF41),
        digits: makeRange(0xFF10, 10),
        preview: 'ＡＢＣ ａｂｃ ０１２'
      },
      {
        id: 'superscript',
        name: 'Superscript',
        group: 'special',
        upper: Array.from('ᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾ𐞥ᴿˢᵀᵁⱽᵂˣʸᶻ'),
        lower: Array.from('ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖ𐞥ʳˢᵗᵘᵛʷˣʸᶻ'),
        digits: ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'],
        preview: 'ᴬᴮᶜ ᵃᵇᶜ ⁰¹²'
      },
      {
        id: 'strikethrough',
        name: 'Strikethrough',
        group: 'special',
        isCustom: true,
        preview: 't̶e̶x̶t̶'
      },
      {
        id: 'underline',
        name: 'Underline',
        group: 'special',
        isCustom: true,
        preview: 't̲e̲x̲t̲'
      },
      {
        id: 'slash',
        name: 'Slash-through',
        group: 'special',
        isCustom: true,
        preview: 't̷e̷x̷t̷'
      },
      {
        id: 'upside-down',
        name: 'Upside-Down',
        group: 'special',
        isCustom: true,
        preview: 'ʇxǝʇ uʍop-ǝpᴉsdn'
      }
    ];

    const UPSIDE_DOWN_MAP = {
      'a': 'ɐ', 'b': 'q', 'c': 'ɔ', 'd': 'p', 'e': 'ǝ', 'f': 'ɟ', 'g': 'ƃ', 'h': 'ɥ', 'i': 'ᴉ',
      'j': 'ɾ', 'k': 'ʞ', 'l': 'l', 'm': 'ɯ', 'n': 'u', 'o': 'o', 'p': 'd', 'q': 'b', 'r': 'ɹ',
      's': 's', 't': 'ʇ', 'u': 'n', 'v': 'ʌ', 'w': 'ʍ', 'x': 'x', 'y': 'ʎ', 'z': 'z',
      'A': '∀', 'B': '𐐒', 'C': 'Ɔ', 'D': '◖', 'E': 'Ǝ', 'F': 'Ⅎ', 'G': '⅁', 'H': 'H', 'I': 'I',
      'J': 'ſ', 'K': 'ʞ', 'L': '˥', 'M': 'W', 'N': 'N', 'O': 'O', 'P': 'Ԁ', 'Q': '◌', 'R': 'ᴚ',
      'S': 'S', 'T': '⊥', 'U': '∩', 'V': '𝘅', 'W': 'M', 'X': 'X', 'Y': '⅄', 'Z': 'Z',
      '0': '0', '1': 'Ɩ', '2': 'ᄅ', '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ', '6': '9', '7': 'ㄥ', '8': '8', '9': '6'
    };

    // Set of strict unique upside-down characters (excludes standard ASCII matching letters like 'q', 'p', 'd', 'b')
    const UNIQUE_UPSIDE_DOWN_CHARS = new Set([
      'ɐ', 'ɔ', 'ǝ', 'ɟ', 'ƃ', 'ɥ', 'ᴉ', 'ɾ', 'ʞ', 'ɯ', 'ɹ', 'ʇ', 'ʌ', 'ʍ', 'ʎ',
      '∀', '𐐒', 'Ɔ', '◖', 'Ǝ', 'Ⅎ', '⅁', 'ſ', '˥', 'Ԁ', '◌', 'ᴚ', '⊥', '∩', '⅄',
      'Ɩ', 'ᄅ', 'Ɛ', 'ㄣ', 'ϛ', 'ㄥ'
    ]);

    // Global Reverse Lookup Maps
    const fontReverseMap = new Map();
    const upsideDownReverseMap = new Map();

    function initReverseMap() {
      const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const LOWER = "abcdefghijklmnopqrstuvwxyz";
      const DIGITS = "0123456789";

      FONTS.forEach(font => {
        if (font.isCustom) return;
        
        if (font.upper) {
          font.upper.forEach((styled, idx) => {
            if (styled !== UPPER[idx]) {
              fontReverseMap.set(styled, UPPER[idx]);
            }
          });
        }
        
        if (font.lower) {
          font.lower.forEach((styled, idx) => {
            if (styled !== LOWER[idx]) {
              fontReverseMap.set(styled, LOWER[idx]);
            }
          });
        }
        
        if (font.digits) {
          font.digits.forEach((styled, idx) => {
            if (styled !== DIGITS[idx]) {
              fontReverseMap.set(styled, DIGITS[idx]);
            }
          });
        }
      });

      for (const [normal, styled] of Object.entries(UPSIDE_DOWN_MAP)) {
        if (normal !== styled) {
          upsideDownReverseMap.set(styled, normal);
        }
      }
    }

    function convertText(text, font) {
      if (font.id === 'upside-down') {
        if (text.length > 1) {
          return Array.from(text).reverse().map(char => UPSIDE_DOWN_MAP[char] || char).join('');
        } else {
          return UPSIDE_DOWN_MAP[text] || text;
        }
      }
      if (font.id === 'strikethrough') {
        return Array.from(text).map(c => c + '\u0336').join('');
      }
      if (font.id === 'underline') {
        return Array.from(text).map(c => c + '\u0332').join('');
      }
      if (font.id === 'slash') {
        return Array.from(text).map(c => c + '\u0338').join('');
      }

      return Array.from(text).map(char => {
        if (char >= 'A' && char <= 'Z') {
          const idx = char.charCodeAt(0) - 65;
          return font.upper[idx] || char;
        }
        if (char >= 'a' && char <= 'z') {
          const idx = char.charCodeAt(0) - 97;
          return font.lower[idx] || char;
        }
        if (char >= '0' && char <= '9') {
          const idx = char.charCodeAt(0) - 48;
          return font.digits ? (font.digits[idx] || char) : char;
        }
        return char;
      }).join('');
    }

    function removeFontFromText(text) {
      let upsideDownCount = 0;
      const chars = Array.from(text);
      
      chars.forEach(char => {
        if (UNIQUE_UPSIDE_DOWN_CHARS.has(char)) {
          upsideDownCount++;
        }
      });

      const isUpsideDown = upsideDownCount > chars.length / 3;

      let normalChars = chars.map(char => {
        if (isUpsideDown) {
          return upsideDownReverseMap.get(char) || fontReverseMap.get(char) || char;
        } else {
          return fontReverseMap.get(char) || char;
        }
      });

      if (isUpsideDown) {
        normalChars.reverse();
      }

      return normalChars.join('');
    }

    function getActiveSelection() {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        const start = activeEl.selectionStart;
        const end = activeEl.selectionEnd;
        if (start !== end && start !== null && end !== null) {
          return {
            type: 'input',
            element: activeEl,
            text: activeEl.value.substring(start, end),
            start: start,
            end: end
          };
        }
      }

      const selection = window.getSelection();
      if (selection && selection.toString().length > 0 && selection.rangeCount > 0) {
        return {
          type: 'document',
          range: selection.getRangeAt(0).cloneRange(),
          activeElement: activeEl,
          text: selection.toString()
        };
      }

      return null;
    }

    function isFrameworkEditor(el) {
      if (!el) return false;
      return !!(
        el.closest('[data-slate-editor="true"]') ||
        el.closest('[data-slate-node]') ||
        el.closest('.DraftEditor-root') ||
        el.closest('[data-lexical-editor="true"]') ||
        window.location.hostname.includes('discord.com')
      );
    }

    function insertTextEvent(target, text) {
      const event = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      });
      isInserting = true;
      try {
        target.dispatchEvent(event);
      } finally {
        isInserting = false;
      }
    }

    function replaceSelection(selectionInfo, newText) {
      isInserting = true;
      try {
        if (selectionInfo.type === 'input') {
          const el = selectionInfo.element;
          const start = selectionInfo.start;
          const end = selectionInfo.end;
          
          el.focus();
          el.setSelectionRange(start, end);
          const succeeded = document.execCommand('insertText', false, newText);
          
          if (!succeeded) {
            const val = el.value;
            el.value = val.substring(0, start) + newText + val.substring(end);
            el.selectionStart = el.selectionEnd = start + newText.length;
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } else if (selectionInfo.type === 'document') {
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(selectionInfo.range);
          
          const target = selectionInfo.activeElement || document.activeElement;
          if (target && typeof target.focus === 'function') {
            target.focus();
          }

          if (isFrameworkEditor(target)) {
            insertTextEvent(target, newText);
          } else {
            const succeeded = document.execCommand('insertText', false, newText);
            if (!succeeded) {
              const range = selectionInfo.range;
              range.deleteContents();
              const textNode = document.createTextNode(newText);
              range.insertNode(textNode);
              // Advance selection caret to after the inserted node
              range.setStartAfter(textNode);
              range.setEndAfter(textNode);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }
        }
      } finally {
        isInserting = false;
      }
    }

    const INLINED_CSS = `
      .font-changer-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(10, 10, 14, 0.4);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        z-index: 2147483647;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        box-sizing: border-box;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .font-changer-overlay.active {
        opacity: 1;
      }

      .font-changer-modal {
        margin-top: 12vh;
        width: 680px;
        max-height: 600px;
        background: rgba(24, 24, 33, 0.85);
        backdrop-filter: blur(24px) saturate(190%);
        -webkit-backdrop-filter: blur(24px) saturate(190%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        box-shadow: 
          0 24px 48px -12px rgba(0, 0, 0, 0.5),
          0 0 0 1px rgba(255, 255, 255, 0.05),
          inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: translateY(-20px) scale(0.96);
        opacity: 0;
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
      }

      .font-changer-overlay.active .font-changer-modal {
        transform: translateY(0) scale(1);
        opacity: 1;
      }

      .font-changer-search-container {
        display: flex;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        gap: 12px;
      }

      .font-changer-search-icon {
        width: 18px;
        height: 18px;
        color: rgba(255, 255, 255, 0.4);
        flex-shrink: 0;
      }

      .font-changer-search {
        background: transparent !important;
        border: none !important;
        outline: none !important;
        color: #ffffff !important;
        font-size: 16px !important;
        font-family: inherit !important;
        width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
      }

      .font-changer-search::placeholder {
        color: rgba(255, 255, 255, 0.35);
      }

      .font-changer-list {
        flex: 1;
        overflow-y: visible;
        padding: 12px;
        max-height: none;
      }

      .font-changer-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 8px;
      }

      .font-changer-row:last-child {
        margin-bottom: 0;
      }

      .font-changer-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 10px;
        margin-bottom: 0;
        border-radius: 8px;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
        user-select: none;
      }

      .font-changer-item:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.1);
      }

      .font-changer-item.selected {
        background: rgba(16, 185, 129, 0.1);
        border-color: rgba(16, 185, 129, 0.3);
      }

      .font-changer-item.keyboard-active {
        background: rgba(59, 130, 246, 0.15);
        border-color: rgba(59, 130, 246, 0.4);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      .font-changer-item-details {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
      }

      .font-changer-name-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .font-changer-name {
        color: rgba(255, 255, 255, 0.95);
        font-size: 12px;
        font-weight: 500;
      }

      .font-changer-active-badge {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
        font-size: 8px;
        font-weight: 600;
        padding: 1px 4px;
        border-radius: 9999px;
        border: 1px solid rgba(16, 185, 129, 0.2);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .font-changer-preview {
        color: rgba(255, 255, 255, 0.45);
        font-size: 12px;
        margin-top: 2px;
        word-break: break-all;
      }

      .font-changer-item:hover .font-changer-preview,
      .font-changer-item.selected .font-changer-preview,
      .font-changer-item.keyboard-active .font-changer-preview {
        color: rgba(255, 255, 255, 0.75);
      }

      .font-changer-no-results {
        padding: 32px 16px;
        text-align: center;
        color: rgba(255, 255, 255, 0.4);
        font-size: 14px;
      }

      .font-changer-footer {
        padding: 12px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(18, 18, 24, 0.4);
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
      }

      .font-changer-shortcuts {
        display: flex;
        gap: 12px;
      }

      .font-changer-shortcut-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .font-changer-key {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 4px;
        padding: 1px 4px;
        color: rgba(255, 255, 255, 0.7);
        font-family: inherit;
        font-size: 10px;
        box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
      }

      .font-changer-notification {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: rgba(24, 24, 33, 0.9);
        color: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 10px 18px;
        border-radius: 8px;
        font-size: 13px;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 2147483647;
        opacity: 0;
        transform: translateY(12px) scale(0.95);
        transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
      }

      .font-changer-notification.show {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    `;

    function createUI() {
      if (overlayEl) return;

      overlayEl = document.createElement('div');
      overlayEl.id = 'font-changer-extension-root';
      overlayEl.style.position = 'fixed';
      overlayEl.style.zIndex = '2147483647';
      document.body.appendChild(overlayEl);

      shadowRoot = overlayEl.attachShadow({ mode: 'open' });

      // Inject style tag with inlined CSS
      const style = document.createElement('style');
      style.textContent = INLINED_CSS;
      shadowRoot.appendChild(style);

      const container = document.createElement('div');
      container.className = 'font-changer-overlay';
      container.style.display = 'none';
      container.innerHTML = `
        <div class="font-changer-modal">
          <div class="font-changer-search-container">
            <svg class="font-changer-search-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input type="text" class="font-changer-search" placeholder="Search fonts... (e.g. bold, script)" autofocus />
          </div>
          <div class="font-changer-list"></div>
          <div class="font-changer-footer">
            <div class="font-changer-status">No active font</div>
            <div class="font-changer-shortcuts">
              <div class="font-changer-shortcut-item">
                <span class="font-changer-key">←↑↓→</span> navigate
              </div>
              <div class="font-changer-shortcut-item">
                <span class="font-changer-key">Enter</span> select
              </div>
              <div class="font-changer-shortcut-item">
                <span class="font-changer-key">Esc</span> close
              </div>
            </div>
          </div>
        </div>
      `;
      shadowRoot.appendChild(container);

      const searchInput = container.querySelector('.font-changer-search');
      
      searchInput.addEventListener('input', (e) => {
        renderList(e.target.value);
      });

      container.querySelector('.font-changer-modal').addEventListener('mousedown', (e) => {
        if (e.target !== searchInput) {
          e.preventDefault();
        }
      });

      container.addEventListener('click', (e) => {
        if (e.target === container) {
          closeMenu();
        }
      });

      container.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeMenu();
          e.stopPropagation();
          e.preventDefault();
        } else if (e.key === 'ArrowDown') {
          navigateList(0, 1);
          e.stopPropagation();
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          navigateList(0, -1);
          e.stopPropagation();
          e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
          navigateList(-1, 0);
          e.stopPropagation();
          e.preventDefault();
        } else if (e.key === 'ArrowRight') {
          navigateList(1, 0);
          e.stopPropagation();
          e.preventDefault();
        } else if (e.key === 'Enter') {
          selectFocusedFont();
          e.stopPropagation();
          e.preventDefault();
        }
      });
    }

    function navigateList(dx, dy) {
      const listEl = shadowRoot.querySelector('.font-changer-list');
      const items = listEl.querySelectorAll('.font-changer-item');
      if (items.length === 0) return;

      if (items[focusedIndex]) {
        items[focusedIndex].classList.remove('keyboard-active');
      }

      if (dx !== 0) {
        // Horizontal: simple flat wrap-around navigation
        focusedIndex = (focusedIndex + dx) % items.length;
        if (focusedIndex < 0) {
          focusedIndex += items.length;
        }
      } else if (dy !== 0) {
        // Vertical: search bounding rects of visible elements to find the closest item in row below/above
        const currentEl = items[focusedIndex];
        if (currentEl) {
          const currentRect = currentEl.getBoundingClientRect();
          const centerX = currentRect.left + currentRect.width / 2;

          let bestIndex = -1;

          if (dy > 0) {
            // Move down: find row below
            let minDistanceX = Infinity;
            let nextRowTop = Infinity;

            for (let i = 0; i < items.length; i++) {
              const rect = items[i].getBoundingClientRect();
              if (rect.top >= currentRect.bottom - 2) {
                if (rect.top < nextRowTop) {
                  nextRowTop = rect.top;
                }
              }
            }

            if (nextRowTop !== Infinity) {
              for (let i = 0; i < items.length; i++) {
                const rect = items[i].getBoundingClientRect();
                if (Math.abs(rect.top - nextRowTop) < 5) {
                  const itemCenterX = rect.left + rect.width / 2;
                  const dist = Math.abs(itemCenterX - centerX);
                  if (dist < minDistanceX) {
                    minDistanceX = dist;
                    bestIndex = i;
                  }
                }
              }
            }
          } else {
            // Move up: find row above
            let minDistanceX = Infinity;
            let prevRowBottom = -Infinity;

            for (let i = 0; i < items.length; i++) {
              const rect = items[i].getBoundingClientRect();
              if (rect.bottom <= currentRect.top + 2) {
                if (rect.bottom > prevRowBottom) {
                  prevRowBottom = rect.bottom;
                }
              }
            }

            if (prevRowBottom !== -Infinity) {
              for (let i = 0; i < items.length; i++) {
                const rect = items[i].getBoundingClientRect();
                if (Math.abs(rect.bottom - prevRowBottom) < 5) {
                  const itemCenterX = rect.left + rect.width / 2;
                  const dist = Math.abs(itemCenterX - centerX);
                  if (dist < minDistanceX) {
                    minDistanceX = dist;
                    bestIndex = i;
                  }
                }
              }
            }
          }

          if (bestIndex !== -1) {
            focusedIndex = bestIndex;
          }
        }
      }

      const targetEl = items[focusedIndex];
      if (targetEl) {
        targetEl.classList.add('keyboard-active');
        targetEl.scrollIntoView({ block: 'nearest' });
      }
    }

    function selectFocusedFont() {
      const font = visibleFonts[focusedIndex];
      if (font) {
        applyFont(font);
      }
    }

    function applyFont(font) {
      if (lastSelection) {
        const converted = convertText(lastSelection.text, font);
        replaceSelection(lastSelection, converted);
        closeMenu();
      } else {
        if (activeFont && activeFont.id === font.id) {
          activeFont = null;
          showNotification('Font reset to normal');
        } else {
          activeFont = font;
          showNotification(`Font changed to ${font.name}`);
        }
        updateStatus();
        closeMenu();
      }
    }

    function renderList(query = '') {
      const listEl = shadowRoot.querySelector('.font-changer-list');
      const normalizedQuery = query.toLowerCase().trim();

      visibleFonts = FONTS.filter(font => 
        font.name.toLowerCase().includes(normalizedQuery) ||
        font.preview.toLowerCase().includes(normalizedQuery)
      );

      listEl.innerHTML = '';
      focusedIndex = 0;

      if (visibleFonts.length === 0) {
        listEl.innerHTML = `<div class="font-changer-no-results">No fonts match "${query}"</div>`;
        return;
      }

      // Group visible fonts by their group category to render them in rows
      const groups = {
        'serif': [],
        'sans-serif': [],
        'stylized': [],
        'enclosed': [],
        'special': []
      };

      visibleFonts.forEach(font => {
        if (groups[font.group]) {
          groups[font.group].push(font);
        }
      });

      const orderedVisibleFonts = [];
      const groupKeys = ['serif', 'sans-serif', 'stylized', 'enclosed', 'special'];

      groupKeys.forEach(groupKey => {
        const groupFonts = groups[groupKey];
        if (groupFonts.length > 0) {
          const rowEl = document.createElement('div');
          rowEl.className = 'font-changer-row';
          
          groupFonts.forEach(font => {
            orderedVisibleFonts.push(font);
            const idx = orderedVisibleFonts.length - 1;

            const item = document.createElement('div');
            item.className = 'font-changer-item';
            if (idx === 0) item.classList.add('keyboard-active');
            
            const isActive = activeFont && activeFont.id === font.id;
            if (isActive) {
              item.classList.add('selected');
            }

            item.innerHTML = `
              <div class="font-changer-item-details">
                <div class="font-changer-name-row">
                  <span class="font-changer-name">${font.name}</span>
                  ${isActive ? `<span class="font-changer-active-badge">Active</span>` : ''}
                </div>
                <div class="font-changer-preview">${font.preview}</div>
              </div>
            `;

            item.addEventListener('mousedown', (e) => {
              e.preventDefault();
              applyFont(font);
            });

            rowEl.appendChild(item);
          });

          listEl.appendChild(rowEl);
        }
      });

      visibleFonts = orderedVisibleFonts;
    }

    function updateStatus() {
      if (!shadowRoot) return;
      const statusEl = shadowRoot.querySelector('.font-changer-status');
      if (statusEl) {
        if (activeFont) {
          statusEl.innerHTML = `Active Font: <span style="color: #10B981; font-weight: 600;">${activeFont.name}</span>`;
        } else {
          statusEl.textContent = 'No active font';
        }
      }
    }

    function showNotification(message) {
      createUI();

      let notif = shadowRoot.querySelector('.font-changer-notification');
      if (!notif) {
        notif = document.createElement('div');
        notif.className = 'font-changer-notification';
        shadowRoot.appendChild(notif);
      }

      notif.textContent = message;
      notif.offsetHeight; // trigger repaint
      notif.classList.add('show');

      if (notif.timeoutId) {
        clearTimeout(notif.timeoutId);
      }

      notif.timeoutId = setTimeout(() => {
        notif.classList.remove('show');
      }, 2200);
    }

    function openMenu() {
      // Capture selection details BEFORE stealing focus
      lastSelection = getActiveSelection();

      createUI();
      lastActiveElement = document.activeElement;

      const overlay = shadowRoot.querySelector('.font-changer-overlay');
      overlay.style.display = 'flex';

      const searchInput = shadowRoot.querySelector('.font-changer-search');
      searchInput.value = '';

      updateStatus();
      renderList();

      overlay.offsetHeight;
      overlay.classList.add('active');

      setTimeout(() => {
        searchInput.focus();
      }, 50);

      isOpen = true;
    }

    function closeMenu() {
      if (!isOpen) return;

      const overlay = shadowRoot.querySelector('.font-changer-overlay');
      overlay.classList.remove('active');

      setTimeout(() => {
        overlay.style.display = 'none';
        
        // Restore selection and focus
        if (lastSelection) {
          if (lastSelection.type === 'input') {
            const el = lastSelection.element;
            el.focus();
            el.setSelectionRange(lastSelection.start, lastSelection.end);
          } else if (lastSelection.type === 'document') {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(lastSelection.range);
            if (lastSelection.activeElement && typeof lastSelection.activeElement.focus === 'function') {
              lastSelection.activeElement.focus();
            }
          }
        } else if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
          lastActiveElement.focus();
        }

        // Clear selection details
        lastSelection = null;
      }, 200);

      isOpen = false;
    }

    // Intercept typed characters and convert them in real-time
    window.addEventListener('beforeinput', (e) => {
      if (!activeFont) return;
      if (isInserting) return;

      if (e.inputType === 'insertText' && e.data) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const translated = convertText(e.data, activeFont);

        if (isFrameworkEditor(e.target)) {
          insertTextEvent(e.target, translated);
        } else {
          isInserting = true;
          try {
            const succeeded = document.execCommand('insertText', false, translated);
            if (!succeeded) {
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                const textNode = document.createTextNode(translated);
                range.insertNode(textNode);
                // Collapse range after the inserted text node to keep caret moving forward
                range.setStartAfter(textNode);
                range.setEndAfter(textNode);
                sel.removeAllRanges();
                sel.addRange(range);
              }
            }
          } finally {
            isInserting = false;
          }
        }
      }
    }, true);

    // Listen to Global Shortcut triggers
    window.addEventListener('keydown', (e) => {
      const isM = e.key.toLowerCase() === 'm';

      // Ctrl+M: Open/Close Menu
      if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && isM) {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen) {
          closeMenu();
        } else {
          openMenu();
        }
        return;
      }

      // Ctrl+Shift+M: Clear selection formatting or reset current font
      if (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey && isM) {
        e.preventDefault();
        e.stopPropagation();

        const selInfo = getActiveSelection();
        if (selInfo) {
          const cleared = removeFontFromText(selInfo.text);
          replaceSelection(selInfo, cleared);
          showNotification('Selection formatting cleared');
        } else {
          activeFont = null;
          updateStatus();
          showNotification('Font reset to normal');
        }
        return;
      }
    }, true);

    // Initialize reverse maps
    initReverseMap();
  })();
}
