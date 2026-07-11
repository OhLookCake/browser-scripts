// ==UserScript==
// @name         Hide Archived Events - LondonSocialClub
// @namespace    eeshan.pages.dev
// @version      1.0
// @description  Hides posts flaired "Archived" (past events) on r/LondonSocialClub old-reddit-style view
// @match        https://www.reddit.com/r/LondonSocialClub
// @match        https://www.reddit.com/r/LondonSocialClub/
// @match        https://old.reddit.com/r/LondonSocialClub
// @match        https://old.reddit.com/r/LondonSocialClub/
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const SELECTOR = '.thing.linkflair-archived';
  let hidden = true; // current state: archived posts hidden

  function applyState(root = document) {
    root.querySelectorAll(SELECTOR).forEach(el => {
      el.style.display = hidden ? 'none' : '';
    });
  }

  function makeButton() {
    const btn = document.createElement('button');
    btn.textContent = 'Hide past: ON';
    btn.style.position = 'fixed';
    btn.style.top = '75px';
    btn.style.right = '380px';
    btn.style.zIndex = '9999';
    btn.style.padding = '8px 12px';
    btn.style.background = '#0079d3';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.fontSize = '13px';
    btn.style.fontFamily = 'sans-serif';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

    btn.addEventListener('click', () => {
      hidden = !hidden;
      btn.textContent = hidden ? 'Hide past: ON' : 'Hide past: OFF';
      applyState();
    });

    document.body.appendChild(btn);
  }

  // Initial pass
  applyState();
  makeButton();

  // Reddit loads more posts on scroll / after ajax nav - watch for new .thing nodes
  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.matches?.(SELECTOR)) {
          node.style.display = hidden ? 'none' : '';
        } else {
          applyState(node);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();

