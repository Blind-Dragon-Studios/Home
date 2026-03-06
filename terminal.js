/* ============================================================
   Browser Terminal Emulator for Island Mystery
   Converts ANSI escape codes to HTML, manages I/O
   ============================================================ */

(() => {
  'use strict';

  const output = document.getElementById('terminal-output');
  const inputLine = document.getElementById('terminal-input');
  const inputForm = document.getElementById('input-form');
  const promptLabel = document.getElementById('prompt-label');

  // ANSI code → CSS class mapping
  const ANSI_MAP = {
    '0':  '',           // reset
    '1':  'ansi-bold',
    '2':  'ansi-dim',
    '3':  'ansi-italic',
    '4':  'ansi-under',
    '30': 'ansi-black',
    '31': 'ansi-red',
    '32': 'ansi-green',
    '33': 'ansi-yellow',
    '34': 'ansi-blue',
    '35': 'ansi-magenta',
    '36': 'ansi-cyan',
    '37': 'ansi-white',
    '91': 'ansi-bred',
    '92': 'ansi-bgreen',
    '93': 'ansi-byellow',
    '94': 'ansi-bblue',
    '95': 'ansi-bmagenta',
    '96': 'ansi-bcyan',
    '97': 'ansi-bwhite',
    '40': 'ansi-bg-black',
    '41': 'ansi-bg-red',
    '42': 'ansi-bg-green',
    '43': 'ansi-bg-yellow',
    '44': 'ansi-bg-blue',
    '45': 'ansi-bg-magenta',
    '46': 'ansi-bg-cyan',
    '47': 'ansi-bg-white',
  };

  /**
   * Parse a string containing ANSI escape codes and return an HTML string.
   */
  function ansiToHtml(text) {
    // Regex matches \x1b[...m sequences
    const regex = /\x1b\[([\d;]*)m/g;
    let result = '';
    let lastIndex = 0;
    let openSpans = 0;

    let match;
    while ((match = regex.exec(text)) !== null) {
      // Add text before this match (escaped)
      if (match.index > lastIndex) {
        result += escapeHtml(text.slice(lastIndex, match.index));
      }
      lastIndex = regex.lastIndex;

      const codes = match[1].split(';').filter(Boolean);

      if (codes.length === 0 || (codes.length === 1 && codes[0] === '0')) {
        // Reset — close all open spans
        while (openSpans > 0) {
          result += '</span>';
          openSpans--;
        }
      } else {
        const classes = codes.map(c => ANSI_MAP[c] || '').filter(Boolean).join(' ');
        if (classes) {
          result += `<span class="${classes}">`;
          openSpans++;
        }
      }
    }

    // Remaining text
    if (lastIndex < text.length) {
      result += escapeHtml(text.slice(lastIndex));
    }

    // Close any remaining open spans
    while (openSpans > 0) {
      result += '</span>';
      openSpans--;
    }

    return result;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function scrollToBottom() {
    const container = document.getElementById('terminal-container');
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }

  // --- Terminal write functions ---

  /** Write text to terminal (appends to current line) */
  function termWrite(text) {
    const span = document.createElement('span');
    span.innerHTML = ansiToHtml(text);
    output.appendChild(span);
    scrollToBottom();
  }

  /** Write a line to terminal */
  function termWriteLine(text) {
    const div = document.createElement('div');
    div.classList.add('term-line');
    div.innerHTML = ansiToHtml(text) || '&nbsp;';
    output.appendChild(div);
    scrollToBottom();
  }

  /** Clear the terminal */
  function termClear() {
    output.innerHTML = '';
  }

  // --- Input system ---
  let inputResolve = null;
  let inputActive = false;

  function showInput(promptText) {
    promptLabel.textContent = promptText || '> ';
    inputLine.value = '';
    inputForm.style.display = 'flex';
    inputLine.focus();
    inputActive = true;
  }

  function hideInput() {
    inputForm.style.display = 'none';
    inputActive = false;
  }

  function waitForInput(promptText) {
    return new Promise((resolve) => {
      inputResolve = resolve;
      showInput(promptText);
    });
  }

  inputForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!inputResolve) return;
    const value = inputLine.value.trim();
    // Echo the input
    termWriteLine(`  > ${value}`);
    hideInput();
    const resolver = inputResolve;
    inputResolve = null;
    resolver(value);
  });

  // Keep focus on input when clicking terminal
  document.getElementById('terminal-container').addEventListener('click', () => {
    if (inputActive) inputLine.focus();
  });

  // --- Typing effect ---
  function typeTextBrowser(text, speed) {
    return new Promise((resolve) => {
      const span = document.createElement('span');
      output.appendChild(span);
      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          // Handle ANSI codes by finding next sequence
          if (text[i] === '\x1b') {
            // Find end of ANSI sequence
            const remaining = text.slice(i);
            const ansiMatch = remaining.match(/^\x1b\[[\d;]*m/);
            if (ansiMatch) {
              // Add the full ANSI sequence at once
              i += ansiMatch[0].length;
              return; // skip to next char
            }
          }
          span.textContent += text[i];
          i++;
          scrollToBottom();
        } else {
          clearInterval(interval);
          resolve();
        }
      }, speed);
    });
  }

  function typeLineBrowser(text, speed) {
    return new Promise((resolve) => {
      const div = document.createElement('div');
      div.classList.add('term-line');
      output.appendChild(div);

      // Parse out ANSI codes and build segments
      const segments = parseAnsiSegments(text);
      let segIdx = 0;
      let charIdx = 0;
      let currentSpan = null;

      function createSpanForSegment(seg) {
        const s = document.createElement('span');
        if (seg.classes) s.className = seg.classes;
        div.appendChild(s);
        return s;
      }

      if (segments.length > 0) {
        currentSpan = createSpanForSegment(segments[0]);
      }

      const interval = setInterval(() => {
        if (segIdx >= segments.length) {
          clearInterval(interval);
          resolve();
          return;
        }

        const seg = segments[segIdx];
        if (charIdx < seg.text.length) {
          currentSpan.textContent += seg.text[charIdx];
          charIdx++;
          scrollToBottom();
        } else {
          segIdx++;
          charIdx = 0;
          if (segIdx < segments.length) {
            currentSpan = createSpanForSegment(segments[segIdx]);
          } else {
            clearInterval(interval);
            resolve();
          }
        }
      }, speed);
    });
  }

  function parseAnsiSegments(text) {
    const regex = /\x1b\[([\d;]*)m/g;
    const segments = [];
    let lastIndex = 0;
    let currentClasses = [];

    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          text: text.slice(lastIndex, match.index),
          classes: currentClasses.join(' ')
        });
      }
      lastIndex = regex.lastIndex;

      const codes = match[1].split(';').filter(Boolean);
      if (codes.length === 0 || (codes.length === 1 && codes[0] === '0')) {
        currentClasses = [];
      } else {
        const newClasses = codes.map(c => ANSI_MAP[c] || '').filter(Boolean);
        currentClasses = [...currentClasses, ...newClasses];
      }
    }

    if (lastIndex < text.length) {
      segments.push({
        text: text.slice(lastIndex),
        classes: currentClasses.join(' ')
      });
    }

    return segments;
  }

  // --- Expose the terminal API globally for the game ---
  window.Terminal = {
    write: termWrite,
    writeLine: termWriteLine,
    clear: termClear,
    waitForInput,
    typeText: typeTextBrowser,
    typeLine: typeLineBrowser,
    scrollToBottom,
    ansiToHtml
  };
})();
