// ==UserScript==
// @name         Channel 4 JKL Shortcuts
// @namespace    violentmonkey.github.io
// @version      1.0.0
// @author       ohlookcake
// @description  J rewinds 10 seconds, K toggles play/pause, and L skips forward 10 seconds on Channel 4
// @match        https://www.channel4.com/*
// @match        https://channel4.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const SEEK_SECONDS = 10;

    function isTypingContext(event) {
        return [...event.composedPath(), document.activeElement].some(element =>
            element instanceof Element && (
                element.matches('input, textarea, select, [role="textbox"]') ||
                element.isContentEditable
            )
        );
    }

    function getVideo() {
        // Resolve on each keypress: Channel 4 can replace the player between episodes.
        const videos = document.querySelectorAll(
            '#html5-player-wrapper video, #html5-player video, video.vod-player'
        );
        let selected = null;
        let largestArea = 0;
        for (const video of videos) {
            if (video.readyState === 0) continue;
            const box = video.getBoundingClientRect();
            const area = box.width * box.height;
            const style = getComputedStyle(video);
            if (style.visibility === 'hidden' || style.display === 'none') continue;
            if (area > largestArea) {
                selected = video;
                largestArea = area;
            }
        }
        return selected;
    }

    function seek(video, offset) {
        // Respect the available timeline, including a live stream's DVR window.
        const ranges = video.seekable;
        const start = ranges.length ? ranges.start(0) : 0;
        const end = ranges.length ? ranges.end(ranges.length - 1) : video.duration;
        if (!Number.isFinite(end)) return;
        video.currentTime = Math.max(start, Math.min(end, video.currentTime + offset));
    }

    window.addEventListener('keydown', event => {
        if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
        const key = event.key.toLowerCase();
        if (!['j', 'k', 'l'].includes(key) || isTypingContext(event)) return;

        const video = getVideo();
        if (!video) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        if (key === 'k') {
            // Holding K should not rapidly alternate between playing and paused.
            if (event.repeat) return;
            if (video.paused) {
                // A site/browser playback restriction can reject play().
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        } else {
            seek(video, key === 'j' ? -SEEK_SECONDS : SEEK_SECONDS);
        }
    }, true);
})();
