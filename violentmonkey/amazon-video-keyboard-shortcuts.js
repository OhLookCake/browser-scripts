// ==UserScript==
// @name         Amazon Video JKLP Shortcuts
// @namespace    violentmonkey.github.io
// @version      1.3.0
// @author       ohlookcake
// @description  j/k/l/p shortcuts for skip back, pause, skip forward, skip recap on Amazon Video
// @match        https://www.amazon.co.uk/gp/video*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

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

    function sendKey(key, keyCode) {
        const target = document.activeElement;
        if (!target) return;

        const eventOptions = {
            key: key,
            code: key === ' ' ? 'Space' : key,
            keyCode: keyCode,
            which: keyCode,
            charCode: key === ' ' ? 32 : 0,
            bubbles: true,
            cancelable: true,
            composed: true,
            repeat: false
        };

        target.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
        target.dispatchEvent(new KeyboardEvent('keypress', eventOptions));
        target.dispatchEvent(new KeyboardEvent('keyup', eventOptions));
    }

    document.addEventListener(
        'keydown',
        (e) => {
            if (isTypingContext(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

            switch (e.key.toLowerCase()) {
                case 'j':
                    e.preventDefault();
                    sendKey('ArrowLeft', 37);
                    break;

                case 'k':
                    e.preventDefault();
                    sendKey(' ', 32);
                    break;

                case 'l':
                    e.preventDefault();
                    sendKey('ArrowRight', 39);
                    break;

                case 'p':
                    e.preventDefault();
                    clickSkipPrompt();
                    break;
            }
        },
        true
    );
})();
