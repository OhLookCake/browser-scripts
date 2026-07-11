// ==UserScript==
// @name         Wikipedia → Atkinson Hyperlegible
// @namespace    https://tampermonkey.net/
// @version      1.0
// @description  Force Wikipedia to use Atkinson Hyperlegible
// @match        *://*.wikipedia.org/*
// @run-at       document-start
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    GM_addStyle(`
        body,
        .mw-body,
        .vector-body,
        .mw-parser-output,
        .vector-feature-language-in-header-enabled {
            font-family:
                "Atkinson Hyperlegible",
                "Atkinson Hyperlegible Next",
                sans-serif !important;
        }

        input,
        textarea,
        select,
        button {
            font-family: inherit !important;
        }
    `);
})();
