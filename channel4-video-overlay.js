// ==UserScript==
// @name         Channel 4 - Disable Video Overlay
// @namespace    http://violentmonkey.net/
// @version      1.0
// @description  Removes the dark overlay on the Channel 4 video player while keeping media controls visible
// @author       You
// @match        https://www.channel4.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
        .html5-player-wrapper [class*="overlay"]:not([class*="control"]):not([class*="Control"]):not([class*="button"]):not([class*="Button"]):not([class*="toolbar"]):not([class*="Toolbar"]):not([class*="bar"]):not([class*="Bar"]),
        .html5-player-wrapper [class*="Overlay"]:not([class*="control"]):not([class*="Control"]):not([class*="button"]):not([class*="Button"]):not([class*="toolbar"]):not([class*="Toolbar"]):not([class*="bar"]):not([class*="Bar"]) {
            opacity: 0 !important;
            pointer-events: none !important;
        }
    `;
    document.head.appendChild(style);

    const observer = new MutationObserver(() => {
        document.querySelectorAll('[class*="overlay"], [class*="Overlay"]').forEach(el => {
            if (!el.closest('#html5-player-wrapper, #html5-player-parent, #html5-player')) return;
            const cls = el.className.toLowerCase();
            if (cls.includes('control') || cls.includes('button') || cls.includes('bar') || cls.includes('toolbar')) return;
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
        });
    });

    const target = document.getElementById('html5-player') || document.body;
    observer.observe(target, { childList: true, subtree: true });
})();

