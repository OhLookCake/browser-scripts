// ==UserScript==
// @name         Amazon Video JKLP Shortcuts
// @namespace    github.com/openstyles/stylus
// @version      1.1.0
// @description  j/k/l/p shortcuts for skip back, pause, skip forward, skip recap on Amazon Video
// @match        https://www.amazon.co.uk/gp/video*
// @grant        none
// @run-at       document-idle
// ==/UserScript==


(function () {
    'use strict';

    const KEY_MAP = {
        j: 'atvwebplayersdk-skip-backward-button',
        k: 'atvwebplayersdk-play-pause-button',
        l: 'atvwebplayersdk-skip-forward-button',
    };

    function isTypingContext(target) {
        if (!target) return false;
        const tag = target.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    }

    function clickSkipPrompt() {
        const btn =
            document.querySelector('[aria-label="Skip Recap"]') ||
            document.querySelector('[aria-label="Skip Intro"]');
        if (btn) btn.click();
    }

    document.addEventListener(
        'keydown',
        (e) => {
            if (isTypingContext(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

            const key = e.key.toLowerCase();

            if (key === 'p') {
                e.preventDefault();
                clickSkipPrompt();
                return;
            }

            const buttonId = KEY_MAP[key];
            if (!buttonId) return;
            const button = document.getElementById(buttonId);
            if (button) {
                e.preventDefault();
                button.click();
            }
        },
        true
    );
})();
