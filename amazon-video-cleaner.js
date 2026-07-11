// ==UserScript==
// @name         Amazon Video Cleaner
// @version      1.0.0
// @description  A new userstyle
// @author       Me
// @match        https://www.amazon.co.uk/gp/video*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    GM_addStyle(`
        /* Hide XRay */
        .xrayQuickView {
            display: none !important;
        }

        /* Improve transparency of buttons */
        .atvwebplayersdk-fastseekforward-button,
        .atvwebplayersdk-fastseekback-button,
        .atvwebplayersdk-playpause-button {
            opacity: 0.1 !important;
        }

        /* Improve transparency of title */
        .atvwebplayersdk-title-text,
        .atvwebplayersdk-subtitle-text {
            opacity: 0.1 !important;
        }

        /* Hide the dark overlay */
        .fkpovp9, .f1makowq {
            display: none !important;
        }
    `);
})();
