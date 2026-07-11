// ==UserScript==
// @name         Decathlon Slot Finding
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Auto-redirect from activity list to dates page, apply filters, and offer off-peak switch
// @author       Eeshan
// @match        https://activities.decathlon.co.uk/en-GB/c/pickleball-canada-water*
// @match        https://activities.decathlon.co.uk/en-GB/sport-activities/dates/*
// @match        https://activities.decathlon.co.uk/en-GB/sport-activities/details/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const NORMAL_KEY = 'decathlonNormalDatesUrl';
    const OFF_PEAK_KEY = 'decathlonOffPeakDatesUrl';

    // Check which page we're on
    const isDatesPage = window.location.pathname.includes('/sport-activities/dates/');
    const isDetailsPage = window.location.pathname.includes('/sport-activities/details/');

    if (isDatesPage) {
        // Run the filter code on the dates page
        runFilterLogic();
    } else if (isDetailsPage) {
        // Redirect from details page to dates page
        redirectDetailsToDates();
    } else {
        // Run the redirect logic on the list page
        runRedirectLogic();
    }

    /**
     * Redirect from details page to dates page
     */
    function redirectDetailsToDates() {
        const pattern = /\/sport-activities\/details\/(\d+)/;
        const match = window.location.pathname.match(pattern);

        if (match) {
            const activityId = match[1];
            const datesUrl = `https://activities.decathlon.co.uk/en-GB/sport-activities/dates/${activityId}`;
            console.log(`Redirecting from details page to: ${datesUrl}`);
            window.location.href = datesUrl;
        }
    }

    /**
     * Redirect logic for the activity list page
     */
    function runRedirectLogic() {
        function findLinks() {
            // Pattern to match activity details URLs
            const pattern = /^https:\/\/activities\.decathlon\.co\.uk\/en-GB\/sport-activities\/details\/(\d+)$/;

            // Find all links on the page
            const links = document.querySelectorAll('a[href]');

            let normalId = null;
            let offPeakId = null;

            for (const link of links) {
                const href = link.href;
                const linkText = link.textContent || link.innerText || '';
                const match = href.match(pattern);

                if (match && linkText.includes('Play PICKLEBALL')) {
                    if (linkText.includes('OFF PEAK')) {
                        if (!offPeakId) {
                            offPeakId = match[1];
                            console.log(`Found OFF PEAK link: ${linkText.trim()} (ID: ${offPeakId})`);
                        }
                    } else {
                        if (!normalId) {
                            normalId = match[1];
                            console.log(`Found normal link: ${linkText.trim()} (ID: ${normalId})`);
                        }
                    }
                }
            }

            return { normalId, offPeakId };
        }

        function findAndRedirect() {
            const { normalId, offPeakId } = findLinks();

            if (normalId) {
                const datesUrl = `https://activities.decathlon.co.uk/en-GB/sport-activities/dates/${normalId}`;
                localStorage.setItem(NORMAL_KEY, datesUrl);

                if (offPeakId) {
                    const offPeakUrl = `https://activities.decathlon.co.uk/en-GB/sport-activities/dates/${offPeakId}`;
                    localStorage.setItem(OFF_PEAK_KEY, offPeakUrl);
                    console.log(`Saved OFF PEAK dates URL: ${offPeakUrl}`);
                } else {
                    localStorage.removeItem(OFF_PEAK_KEY);
                }

                console.log(`Redirecting to: ${datesUrl}`);
                window.location.href = datesUrl;
                return true; // Indicate we found and redirected
            }

            console.log('No link found containing "Play PICKLEBALL"');
            return false; // No matching link found
        }

        // Function to wait for content to load with retries
        function waitForContentAndRedirect() {
            let attempts = 0;
            const maxAttempts = 20; // Try for up to 10 seconds (20 * 500ms)

            const checkInterval = setInterval(() => {
                attempts++;

                // Try to find and redirect
                if (findAndRedirect()) {
                    clearInterval(checkInterval);
                    console.log('Successfully found link and redirecting');
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.log('No matching activity link found after maximum attempts');
                } else {
                    console.log(`Attempt ${attempts}: Waiting for content to load...`);
                }
            }, 500); // Check every 500ms
        }

        // Wait for page load to complete, then start checking for content
        window.addEventListener('load', waitForContentAndRedirect);
    }

    /**
     * Filter logic for the dates page
     */
    function runFilterLogic() {
        let clickCount = 0;
        const maxClicks = 15;

        /**
         * Logic for paginating through availability pages
         */
        function clickAndWait() {
            const btn = document.querySelector('.pagination-buttons__button');
            if (!btn || clickCount >= maxClicks) {
                console.log(`Stopped after ${clickCount} clicks. ${!btn ? 'Button not found.' : 'Max clicks reached.'}`);
                update();
                return;
            }
            clickCount++;
            console.log(`Click ${clickCount} of ${maxClicks}`);
            btn.click();
            update();
            setTimeout(() => {
                if (document.readyState === 'complete') {
                    clickAndWait();
                } else {
                    document.addEventListener('readystatechange', function onReady() {
                        if (document.readyState === 'complete') {
                            document.removeEventListener('readystatechange', onReady);
                            setTimeout(clickAndWait, 500);
                        }
                    });
                }
            }, 1000);
        }

        /**
         * Generates the filtering interface on the top right
         */
        function createFilterUI() {
            if (document.getElementById('filter-overlay')) return;
            const style = document.createElement('style');
            style.innerHTML = `
                #filter-overlay {
                    position: fixed; top: 180px; left: 20px; z-index: 9999;
                    background: white; padding: 10px; border: 2px solid #007dbc;
                    border-radius: 6px; font-family: sans-serif; font-size: 11px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: auto;
                    display: flex; gap: 15px;
                }
                .filter-column { display: flex; flex-direction: column; }
                .filter-group { display: flex; flex-direction: column; gap: 1px; }
                .filter-group label {
                    display: flex; align-items: center; cursor: pointer;
                    white-space: nowrap; line-height: 1.2;
                }
                .filter-group input { margin: 0 4px 0 0; padding: 0; }
                .filter-title { font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
            `;
            document.head.appendChild(style);
            const container = document.createElement('div');
            container.id = 'filter-overlay';
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const hours = Array.from({length: 6}, (_, i) => (i + 16).toString().padStart(2, '0'));
            container.innerHTML = `
                <div class="filter-column">
                    <div class="filter-title">Day</div>
                    <div class="filter-group">
                        ${days.map(d => `<label><input type="checkbox" class="day-filter" value="${d}">${d}</label>`).join('')}
                    </div>
                </div>
                <div class="filter-column">
                    <div class="filter-title">Hour</div>
                    <div class="filter-group">
                        ${hours.map(h => `<label><input type="checkbox" class="hour-filter" value="${h}">${h}</label>`).join('')}
                    </div>
                </div>`;
            document.body.appendChild(container);
            container.addEventListener('change', update);
        }

        /**
         * Shows a button top-right that jumps to the counterpart dates page
         * (peak <-> off-peak), based on which one the current page matches.
         */
        function createSwitchButton() {
            if (document.getElementById('peak-switch')) return;

            const normalUrl = localStorage.getItem(NORMAL_KEY);
            const offPeakUrl = localStorage.getItem(OFF_PEAK_KEY);
            const currentUrl = window.location.href;

            let targetUrl = null;
            let label = null;

            if (currentUrl === offPeakUrl && normalUrl) {
                targetUrl = normalUrl;
                label = 'Switch to PEAK';
            } else if (currentUrl === normalUrl && offPeakUrl) {
                targetUrl = offPeakUrl;
                label = 'Switch to OFF PEAK';
            }

            if (!targetUrl) {
                console.log('No counterpart URL stored/matched, skipping button.');
                return;
            }

            const btn = document.createElement('button');
            btn.id = 'peak-switch';
            btn.textContent = label;
            btn.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 9999;
                background: #007dbc; color: white; border: none;
                padding: 8px 14px; border-radius: 6px; font-family: sans-serif;
                font-size: 12px; font-weight: bold; cursor: pointer;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            `;
            btn.addEventListener('click', () => {
                window.location.href = targetUrl;
            });
            document.body.appendChild(btn);
        }

        /**
         * Filters visibility of app-timeslot elements based on UI selection
         */
        function update() {
            const selectedDays = Array.from(document.querySelectorAll('.day-filter:checked')).map(el => el.value);
            const selectedHours = Array.from(document.querySelectorAll('.hour-filter:checked')).map(el => el.value);
            const slots = document.querySelectorAll('app-timeslot');
            slots.forEach(slot => {
                const isUnavailable = !slot.querySelector('p.text-vtmn-play-status-positive') && !slot.querySelector('p.text-vtmn-play-status-warning');
                if (isUnavailable) {
                    slot.style.display = 'none';
                    return;
                }
                const dayEl = slot.querySelector('.timeslot__start-date');
                const timeEl = slot.querySelector('.timeslot__start-time');
                if (!dayEl || !timeEl) return;
                const slotDay = dayEl.innerText.trim().substring(0, 3);
                const slotHour = timeEl.innerText.trim().substring(0, 2);
                const dayPass = selectedDays.length === 0 || selectedDays.includes(slotDay);
                const hourPass = selectedHours.length === 0 || selectedHours.includes(slotHour);
                slot.style.display = (dayPass && hourPass) ? 'block' : 'none';
            });
        }

        /* Execution sequence - wait for page to be ready */
        window.addEventListener('load', () => {
            // Give Angular time to render
            createFilterUI();
            createSwitchButton();
            setTimeout(clickAndWait, 1000);
        });
    }
})();
