// ==UserScript==
// @name         YouTube 3s Seek with U / O
// @namespace    violentmonkey.github.io
// @version      1.0
// @author       ohlookcake
// @description  Rewind/forward YouTube video by 3 seconds using U and O
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const SEEK_TIME = 3;

    document.addEventListener('keydown', function (e) {

        // Ignore typing in inputs/textareas
        const tag = document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement.isContentEditable) return;

        const video = document.querySelector('video');
        if (!video) return;

        if (e.key === 'u' || e.key === 'U') {
            video.currentTime = Math.max(0, video.currentTime - SEEK_TIME);
        }

        if (e.key === 'o' || e.key === 'O') {
            video.currentTime = Math.min(video.duration, video.currentTime + SEEK_TIME);
        }
    });
})();


// **** WITH TEXT OVERLAY ***

// (function () {
//     'use strict';

//     const SEEK = 3;
//     let overlay;
//     let overlayTimeout;

//     function getVideo() {
//         return document.querySelector('video');
//     }

//     function ensureOverlay() {
//         if (overlay) return;

//         overlay = document.createElement('div');
//         overlay.style.position = 'fixed';
//         overlay.style.left = '50%';
//         overlay.style.top = '50%';
//         overlay.style.transform = 'translate(-50%, -50%)';
//         overlay.style.fontSize = '48px';
//         overlay.style.fontWeight = 'bold';
//         overlay.style.color = '#fff';
//         overlay.style.background = 'rgba(0,0,0,0.6)';
//         overlay.style.padding = '12px 24px';
//         overlay.style.borderRadius = '10px';
//         overlay.style.zIndex = '999999';
//         overlay.style.pointerEvents = 'none';
//         overlay.style.opacity = '0';
//         overlay.style.transition = 'opacity 0.15s';

//         document.body.appendChild(overlay);
//     }

//     function showOverlay(text) {
//         ensureOverlay();
//         overlay.textContent = text;
//         overlay.style.opacity = '1';

//         clearTimeout(overlayTimeout);
//         overlayTimeout = setTimeout(() => {
//             overlay.style.opacity = '0';
//         }, 500);
//     }

//     window.addEventListener('keydown', function (e) {

//         const el = document.activeElement;
//         if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;

//         const video = getVideo();
//         if (!video) return;

//         if (e.code === 'KeyU') {
//             video.currentTime = Math.max(0, video.currentTime - SEEK);
//             showOverlay(`-${SEEK}s`);
//             e.stopPropagation();
//         }

//         if (e.code === 'KeyO') {
//             video.currentTime = Math.min(video.duration, video.currentTime + SEEK);
//             showOverlay(`+${SEEK}s`);
//             e.stopPropagation();
//         }

//     }, true);

// })();
