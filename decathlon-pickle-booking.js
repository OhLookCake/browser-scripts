// ==UserScript==
// @name         Decathlon Slot Finding
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Auto-redirect from activity list to dates page and apply filters
// @author       Eeshan
// @match        https://activities.decathlon.co.uk/en-GB/c/pickleball-canada-water*
// @match        https://activities.decathlon.co.uk/en-GB/sport-activities/dates/*
// @match        https://activities.decathlon.co.uk/en-GB/sport-activities/details/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

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
        function findAndRedirect() {
            // Pattern to match activity details URLs
            const pattern = /^https:\/\/activities\.decathlon\.co\.uk\/en-GB\/sport-activities\/details\/(\d+)$/;

            // Find all links on the page
            const links = document.querySelectorAll('a[href]');

            // Search for the first link with "Play PICKLEBALL" in its text
            for (const link of links) {
                const href = link.href;
                const linkText = link.textContent || link.innerText || '';

                // Check if this link matches the URL pattern AND contains "Play PICKLEBALL" and not "OFF PEAK"
                const match = href.match(pattern);
                if (match && linkText.includes('Play PICKLEBALL') && !linkText.includes('OFF PEAK')) {
                    const activityId = match[1];
                    const datesUrl = `https://activities.decathlon.co.uk/en-GB/sport-activities/dates/${activityId}`;
                    console.log(`Found link with "Play PICKLEBALL": ${linkText.trim()}`);
                    console.log(`Activity ID: ${activityId}`);
                    console.log(`Redirecting to: ${datesUrl}`);

                    // Redirect to the dates page
                    window.location.href = datesUrl;
                    return true; // Indicate we found and redirected
                }
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
            setTimeout(clickAndWait, 1000);
        });
    }
})();
