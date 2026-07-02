// ==UserScript==
// @name         Force Atkinson Hyperlegible + Larger Text on ChatGPT
// @namespace    custom-font
// @version      1.1
// @description  Replace UI fonts and increase font size slightly
// @match        https://chatgpt.com/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    GM_addStyle(`
        :root {
            --font-sans: "Atkinson Hyperlegible" !important;
        }

        html {
            font-size: calc(100% + 1px);
        }

        html,
        body,
        *:not(code):not(pre):not(kbd):not(samp) {
            font-family:
                "Atkinson Hyperlegible",
                system-ui,
                sans-serif !important;
        }

        code,
        pre,
        kbd,
        samp {
            font-family:
                ui-monospace,
                SFMono-Regular,
                Menlo,
                Consolas,
                monospace !important;
            font-size: calc(100% - 1px);
        }

        textarea,
        input,
        button {
            font-family:
                "Atkinson Hyperlegible",
                system-ui,
                sans-serif !important;
        }


        /* Keep code readable and proportional */
        pre,
        code {
            font-size: inherit !important;
        }
    `);


})();
