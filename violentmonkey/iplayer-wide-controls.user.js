// ==UserScript==
// @name         BBC iPlayer Wide Player
// @namespace    github.com/ohlookcake/browser-scripts
// @version      1.1.0
// @description  Widen the video to 95% of the viewport and match its playback controls
// @match        https://www.bbc.co.uk/iplayer/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
    'use strict';

    const pageStyle = document.createElement('style');
    pageStyle.textContent = `
        #tviplayer .hero-player__theatre > .gel-wrap {
            box-sizing: border-box !important;
            width: 95vw !important;
            max-width: none !important;
            margin-inline: auto !important;
            padding-inline: 0 !important;
        }
        #tviplayer .hero-player__player,
        #tviplayer .hero-player__smp,
        #tviplayer .player,
        #tviplayer .player__container {
            width: 100% !important;
            max-width: none !important;
            margin-inline: auto !important;
        }
    `;
    (document.head || document.documentElement).append(pageStyle);

    // BBC's controls live in an open shadow root. Page CSS cannot reach them.
    const controlsCSS = `
        :host(.smp_B4) smp-seek-group {
            max-width: none !important;
        }
        :host(.smp_seek_bar_stopped_growing:not(.rightBottom)) smp-secondary-controls {
            right: 3px !important;
        }
        :host(.smp_seek_bar_stopped_growing:not(.rightBottom)) smp-volume-controller {
            left: 2px !important;
        }
    `;
    const watched = new WeakSet();

    function inspect(element) {
        if (!(element instanceof Element)) return;
        if (element.shadowRoot) watchRoot(element.shadowRoot);
        for (const child of element.querySelectorAll('*')) {
            if (child.shadowRoot) watchRoot(child.shadowRoot);
        }
    }

    function watchRoot(root) {
        if (watched.has(root)) return;
        watched.add(root);

        if (root.host.matches('[part~="controls"]')) {
            const style = document.createElement('style');
            style.textContent = controlsCSS;
            root.append(style);
        }

        new MutationObserver(records => {
            for (const record of records) {
                for (const node of record.addedNodes) inspect(node);
            }
        }).observe(root, { childList: true, subtree: true });
        for (const element of root.querySelectorAll('*')) {
            if (element.shadowRoot) watchRoot(element.shadowRoot);
        }
    }

    function findPlayers(node) {
        if (!(node instanceof Element) && node !== document) return;
        if (node instanceof Element && node.matches('smp-toucan-player')) inspect(node);
        for (const player of node.querySelectorAll('smp-toucan-player')) inspect(player);
    }

    findPlayers(document);
    // Also handle a player element that upgrades after this script starts.
    customElements.whenDefined('smp-toucan-player').then(() => findPlayers(document));
    new MutationObserver(records => {
        for (const record of records) {
            for (const node of record.addedNodes) findPlayers(node);
        }
    }).observe(document, { childList: true, subtree: true });
})();
