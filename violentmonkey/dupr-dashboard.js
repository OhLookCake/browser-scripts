// ==UserScript==
// @name         DUPR Dashboard Performance Summary
// @namespace    violentmonkey.github.io
// @version      2.5
// @author       ohlookcake
// @description  Loads every DUPR result and presents separate singles and doubles performance reports
// @match        https://dashboard.dupr.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const CHECK_DELAY_MS = 700;
  const REQUIRED_STABLE_CHECKS = 5;
  const MIN_SCROLL_RANGE = 100;
  const MATCH_SELECTOR = '[match-id]';

  function getScrollContainer() {
    const root = document.scrollingElement || document.documentElement;
    let best = root;
    let bestRange = root.scrollHeight - root.clientHeight;

    for (const element of document.querySelectorAll('main, [role="main"], div, section')) {
      const style = getComputedStyle(element);
      const range = element.scrollHeight - element.clientHeight;
      const canScroll = /auto|scroll/.test(style.overflowY);

      if (canScroll && range > bestRange && range >= MIN_SCROLL_RANGE) {
        best = element;
        bestRange = range;
      }
    }

    return best;
  }

  function scrollHeight(element) {
    return element === document.scrollingElement
      ? Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
      : element.scrollHeight;
  }

  async function loadEverything() {
    let stableChecks = 0;
    let previousHeight = 0;
    let previousContainer = null;
    let lastScrollAt = 0;
    let queuedScroll = null;

    const performScroll = () => {
      queuedScroll = null;
      lastScrollAt = Date.now();
      const container = getScrollContainer();
      const bottom = scrollHeight(container);
      if (container === document.scrollingElement) window.scrollTo(0, bottom);
      else container.scrollTop = bottom;
    };

    const scrollToBottom = (immediate = false) => {
      const wait = immediate ? 0 : Math.max(0, CHECK_DELAY_MS - (Date.now() - lastScrollAt));
      if (wait === 0) {
        if (queuedScroll) clearTimeout(queuedScroll);
        performScroll();
      } else if (!queuedScroll) {
        queuedScroll = setTimeout(performScroll, wait);
      }
    };

    // Mutation callbacks continue to react to network-loaded DOM updates when
    // background tabs have their normal JavaScript timers throttled.
    const contentObserver = new MutationObserver(() => {
      scrollToBottom();
    });
    const onVisibilityChange = () => {
      if (!document.hidden) scrollToBottom(true);
    };
    contentObserver.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    while (stableChecks < REQUIRED_STABLE_CHECKS) {
      scrollToBottom();

      await new Promise(resolve => setTimeout(resolve, CHECK_DELAY_MS));

      const currentContainer = getScrollContainer();
      const currentHeight = scrollHeight(currentContainer);
      const unchanged = currentContainer === previousContainer && currentHeight === previousHeight;

      stableChecks = unchanged ? stableChecks + 1 : 0;
      previousContainer = currentContainer;
      previousHeight = currentHeight;
    }

    contentObserver.disconnect();
    if (queuedScroll) clearTimeout(queuedScroll);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    console.info('[DUPR Auto Scroll] No more content detected.');
    showSummary(parseMatches());
  }

  function numberFrom(text) {
    const value = Number.parseFloat((text || '').replace(/[^\d.+-]/g, ''));
    return Number.isFinite(value) ? value : null;
  }

  function playerId(link) {
    return link.getAttribute('href')?.match(/\/dashboard\/player\/(\d+)/)?.[1] || null;
  }

  function findCurrentPlayerId(cards) {
    const counts = new Map();

    for (const card of cards) {
      const ids = new Set([...card.querySelectorAll('a[href*="/dashboard/player/"]')].map(playerId).filter(Boolean));
      for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);
    }

    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }

  function scoreForLink(link) {
    // Walk outward until the player block first includes an integer score.
    // Rating values contain a decimal, so they cannot be mistaken for scores.
    let element = link;
    for (let depth = 0; element && depth < 7; depth++, element = element.parentElement) {
      const score = [...element.querySelectorAll('span')].find(span => {
        const text = span.textContent.trim();
        return /^\d{1,2}$/.test(text) && Number(text) <= 21;
      });
      if (score) return Number(score.textContent.trim());
    }
    return null;
  }

  function nameForLink(link) {
    return [...link.querySelectorAll('span')]
      .filter(span => !span.querySelector('span'))
      .map(span => span.textContent.trim())
      .find(text => /[a-z]/i.test(text) && !/^\d\.\d{3}$/.test(text)) || 'Unknown player';
  }

  function ratingForLink(link) {
    const node = [...link.querySelectorAll('span')].find(span => /^\d\.\d{3}$/.test(span.textContent.trim()));
    return numberFrom(node?.textContent);
  }

  function mean(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  function parseMatches() {
    const cards = [...document.querySelectorAll(MATCH_SELECTOR)];
    const currentPlayerId = findCurrentPlayerId(cards);

    return cards.map((card, sourceIndex) => {
      const links = [...card.querySelectorAll('a[href*="/dashboard/player/"]')];
      const ownLink = links.find(link => playerId(link) === currentPlayerId);
      const participants = links.map(link => ({
        id: playerId(link),
        name: nameForLink(link),
        score: scoreForLink(link),
        rating: ratingForLink(link)
      }));
      let ownScore = ownLink ? scoreForLink(ownLink) : null;
      const scores = links.map(scoreForLink).filter(Number.isFinite);
      let opponentScore = scores.find(score => score !== ownScore) ?? null;
      const eventName = card.querySelector('span.text-sm.font-semibold')?.textContent.trim() || 'DUPR match';
      const details = [...card.querySelectorAll('p')].map(node => node.textContent.trim())
        .find(text => /^\d{2}\/\d{2}\/\d{4}/.test(text)) || '';
      const dateText = details.match(/^\d{2}\/\d{2}\/\d{4}/)?.[0] || '';
      const result = [...card.querySelectorAll('p')].map(node => node.textContent.trim())
        .find(text => text === 'Win' || text === 'Loss');
      const deltaNode = card.firstElementChild?.querySelector('span.font-semibold.text-xs');
      const rating = ownLink ? ratingForLink(ownLink) : null;
      const participantCount = new Set(links.map(playerId).filter(Boolean)).size;
      const won = result === 'Win';

      // Guard against site markup changes selecting the other team's score.
      if (Number.isFinite(ownScore) && Number.isFinite(opponentScore)) {
        const scoreMatchesResult = won ? ownScore > opponentScore : ownScore < opponentScore;
        if (!scoreMatchesResult) [ownScore, opponentScore] = [opponentScore, ownScore];
      }

      // Teammates share our score; opponents carry the other team's score.
      const partners = participants.filter(player => player.id !== currentPlayerId && player.score === ownScore);
      const opponents = participants.filter(player => player.score === opponentScore);
      const myTeamRatings = [rating, ...partners.map(player => player.rating)].filter(Number.isFinite);
      const oppTeamRatings = opponents.map(player => player.rating).filter(Number.isFinite);
      const myTeamAvg = mean(myTeamRatings);
      const oppTeamAvg = mean(oppTeamRatings);

      return {
        id: card.getAttribute('match-id'),
        sourceIndex,
        type: participantCount === 2 ? 'Singles' : participantCount === 4 ? 'Doubles'
          : /singles/i.test(eventName) ? 'Singles' : /doubles/i.test(eventName) ? 'Doubles' : null,
        won,
        date: dateText ? new Date(`${dateText} 12:00:00`) : null,
        eventName,
        rating,
        delta: numberFrom(deltaNode?.textContent),
        ownScore,
        opponentScore,
        partners,
        opponents,
        partnerNames: partners.map(player => player.name),
        opponentNames: opponents.map(player => player.name),
        myTeamAvg,
        oppTeamAvg,
        ratingGap: Number.isFinite(myTeamAvg) && Number.isFinite(oppTeamAvg) ? oppTeamAvg - myTeamAvg : null
      };
    }).filter(match => match.type && match.date && !Number.isNaN(match.date.getTime()));
  }

  function reliabilityFor(discipline) {
    // The sidebar rating card for each discipline pairs the rating with a 0-100 reliability gauge.
    for (const label of document.querySelectorAll('span')) {
      if (label.textContent.trim() !== discipline) continue;
      let node = label.parentElement;
      for (let depth = 0; node && depth < 5; depth++, node = node.parentElement) {
        const hasRating = [...node.querySelectorAll('p')].some(p => /^\d\.\d{3}$/.test(p.textContent.trim()));
        const gauge = [...node.querySelectorAll('span')]
          .map(span => span.textContent.trim())
          .find(text => text !== discipline && /^\d{1,3}$/.test(text) && Number(text) <= 100);
        if (hasRating && gauge) return Number(gauge);
      }
    }
    return null;
  }

  function parseRatingMeta() {
    return {
      Doubles: { reliability: reliabilityFor('Doubles') },
      Singles: { reliability: reliabilityFor('Singles') }
    };
  }

  function longestStreak(matches, wantedResult) {
    let current = 0;
    let best = 0;
    for (const match of matches) {
      current = match.won === wantedResult ? current + 1 : 0;
      best = Math.max(best, current);
    }
    return best;
  }

  function comparableEventName(name) {
    return name.replace(/\s*\((Singles|Doubles)\)\s*$/i, '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function likelySameEvent(first, second) {
    if (first === second) return true;
    let sharedLength = 0;
    while (sharedLength < first.length && sharedLength < second.length && first[sharedLength] === second[sharedLength]) {
      sharedLength++;
    }

    const sharedStart = first.slice(0, sharedLength).trimEnd();
    const nextFirst = first[sharedStart.length] || '';
    const nextSecond = second[sharedStart.length] || '';
    const endsAtWordBoundary = (!nextFirst || /[^a-z0-9]/i.test(nextFirst)) &&
      (!nextSecond || /[^a-z0-9]/i.test(nextSecond));
    const coverage = sharedStart.length / Math.min(first.length, second.length);

    return sharedStart.length >= 24 && coverage >= 0.8 && endsAtWordBoundary;
  }

  function buildEvent(matches) {
    // matches arrive earliest-played first, so ratings run start to finish.
    const wins = matches.filter(match => match.won).length;
    const partnersByName = new Map();
    for (const match of matches) for (const player of match.partners) partnersByName.set(player.name, player.id);
    const partnerNames = [...partnersByName.keys()];
    const rated = matches.filter(match => Number.isFinite(match.rating));
    // Ratings are post-match, so the rating BEFORE the first game is that game's rating minus its delta.
    const first = matches.find(match => Number.isFinite(match.rating) && Number.isFinite(match.delta));
    const startRating = first ? first.rating - first.delta : null;
    const endRating = rated.at(-1)?.rating ?? null;
    const net = Number.isFinite(startRating) && Number.isFinite(endRating) ? endRating - startRating : null;

    return {
      name: matches[0].eventName.replace(/\s*\((Singles|Doubles)\)\s*$/i, '').trim(),
      date: matches[0].date,
      minSourceIndex: Math.min(...matches.map(match => match.sourceIndex)),
      games: matches.length,
      wins,
      losses: matches.length - wins,
      partner: partnerNames.length === 0 ? null : partnerNames.length === 1 ? partnerNames[0] : 'Multiple',
      partnerId: partnerNames.length === 1 ? partnersByName.get(partnerNames[0]) : null,
      startRating,
      endRating,
      net
    };
  }

  function groupEvents(matches) {
    // DUPR supplies cards newest-first; reverse source order for games on the same date.
    const chronological = [...matches].sort((a, b) => a.date - b.date || b.sourceIndex - a.sourceIndex);
    const byDate = new Map();
    for (const match of chronological) {
      const dateKey = `${match.date.getFullYear()}-${match.date.getMonth()}-${match.date.getDate()}`;
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey).push(match);
    }

    const events = [];
    for (const dayMatches of byDate.values()) {
      const clusters = [];
      for (const match of dayMatches) {
        const name = comparableEventName(match.eventName);
        const cluster = clusters.find(group => group.some(existing => likelySameEvent(comparableEventName(existing.eventName), name)));
        if (cluster) cluster.push(match);
        else clusters.push([match]);
      }
      for (const cluster of clusters) events.push(buildEvent(cluster));
    }

    // Most recent first; within a date the most recent card (lowest source index) leads.
    return events.sort((a, b) => b.date - a.date || a.minSourceIndex - b.minSourceIndex);
  }

  function summarise(matches) {
    // DUPR supplies cards newest-first. Reverse source order for games on the same date.
    const chronological = [...matches].sort((a, b) => a.date - b.date || b.sourceIndex - a.sourceIndex);
    const wins = matches.filter(match => match.won).length;
    const scored = matches.filter(match => Number.isFinite(match.ownScore) && Number.isFinite(match.opponentScore));
    const margins = scored.map(match => match.ownScore - match.opponentScore);
    const eventList = groupEvents(matches);
    const rated = chronological.filter(match => Number.isFinite(match.rating));
    const changed = chronological.filter(match => Number.isFinite(match.delta));
    const gamesToEleven = scored.filter(match => {
      const winningScore = Math.max(match.ownScore, match.opponentScore);
      return winningScore >= 11 && winningScore < 15;
    });
    const byRating = (best, match) => !best || match.rating > best.rating ? match : best;
    const byLowestRating = (best, match) => !best || match.rating < best.rating ? match : best;
    const byDelta = (best, match) => !best || match.delta > best.delta ? match : best;
    const byLowestDelta = (best, match) => !best || match.delta < best.delta ? match : best;
    const byMargin = (best, match) => !best || match.ownScore - match.opponentScore > best.ownScore - best.opponentScore ? match : best;
    const byLowestMargin = (best, match) => !best || match.ownScore - match.opponentScore < best.ownScore - best.opponentScore ? match : best;

    const partnerRatings = matches.flatMap(match => match.partners.map(player => player.rating).filter(Number.isFinite));
    const opponentRatings = matches.flatMap(match => match.opponents.map(player => player.rating).filter(Number.isFinite));
    const partnerDiffs = matches.flatMap(match => Number.isFinite(match.rating)
      ? match.partners.filter(player => Number.isFinite(player.rating)).map(player => player.rating - match.rating) : []);
    const opponentDiffs = matches.flatMap(match => Number.isFinite(match.rating)
      ? match.opponents.filter(player => Number.isFinite(player.rating)).map(player => player.rating - match.rating) : []);
    // Strength matchups compare partner/opponent strength against my own rating.
    const partnerAvg = match => mean(match.partners.map(player => player.rating).filter(Number.isFinite));
    const record = predicate => {
      const games = matches.filter(predicate);
      const wins = games.filter(match => match.won).length;
      return { games: games.length, wins, losses: games.length - wins };
    };

    // ratingGap is opponents minus my team, so a win with the largest gap is the biggest upset delivered.
    const gapped = matches.filter(match => Number.isFinite(match.ratingGap));
    const byBiggestGap = (best, match) => !best || match.ratingGap > best.ratingGap ? match : best;
    const bySmallestGap = (best, match) => !best || match.ratingGap < best.ratingGap ? match : best;

    let currentStreak = 0;
    const newestFirst = [...chronological].reverse();
    const currentResult = newestFirst[0]?.won;
    for (const match of newestFirst) {
      if (match.won !== currentResult) break;
      currentStreak++;
    }

    return {
      matches: chronological,
      games: matches.length,
      wins,
      losses: matches.length - wins,
      winRate: matches.length ? wins / matches.length : 0,
      currentRating: rated.at(-1)?.rating ?? null,
      peakRating: rated.reduce(byRating, null),
      lowestRating: rated.reduce(byLowestRating, null),
      biggestGain: changed.filter(match => match.delta > 0).reduce(byDelta, null),
      biggestLoss: changed.filter(match => match.delta < 0).reduce(byLowestDelta, null),
      biggestTourneyGain: eventList.filter(event => Number.isFinite(event.net) && event.net > 0)
        .reduce((best, event) => !best || event.net > best.net ? event : best, null),
      biggestTourneyLoss: eventList.filter(event => Number.isFinite(event.net) && event.net < 0)
        .reduce((best, event) => !best || event.net < best.net ? event : best, null),
      avgGameMovement: mean(changed.map(match => match.delta)),
      gameMovementSamples: changed.length,
      avgTourneyMovement: mean(eventList.filter(event => Number.isFinite(event.net)).map(event => event.net)),
      tourneyMovementSamples: eventList.filter(event => Number.isFinite(event.net)).length,
      pointsFor: scored.reduce((sum, match) => sum + match.ownScore, 0),
      pointsAgainst: scored.reduce((sum, match) => sum + match.opponentScore, 0),
      avgPointsFor: scored.length ? scored.reduce((sum, match) => sum + match.ownScore, 0) / scored.length : null,
      avgPointsAgainst: scored.length ? scored.reduce((sum, match) => sum + match.opponentScore, 0) / scored.length : null,
      avgMargin: margins.length ? margins.reduce((sum, value) => sum + value, 0) / margins.length : null,
      closeRate: scored.length ? scored.filter(match => Math.abs(match.ownScore - match.opponentScore) <= 2).length / scored.length : null,
      closeGames: scored.filter(match => Math.abs(match.ownScore - match.opponentScore) <= 2).length,
      scoredGames: scored.length,
      bestWinStreak: longestStreak(chronological, true),
      currentStreak,
      currentResult,
      events: eventList.length,
      eventList,
      biggestWin: gamesToEleven.filter(match => match.won).reduce(byMargin, null),
      biggestLossByScore: gamesToEleven.filter(match => !match.won).reduce(byLowestMargin, null),
      recentWins: chronological.slice(-10).filter(match => match.won).length,
      recentGames: Math.min(10, chronological.length),
      avgPartnerRating: mean(partnerRatings),
      avgPartnerDiff: mean(partnerDiffs),
      avgOpponentRating: mean(opponentRatings),
      avgOpponentDiff: mean(opponentDiffs),
      partnerSamples: partnerRatings.length,
      opponentSamples: opponentRatings.length,
      strongerPartner: record(match => Number.isFinite(match.rating) && Number.isFinite(partnerAvg(match)) && partnerAvg(match) > match.rating),
      weakerPartner: record(match => Number.isFinite(match.rating) && Number.isFinite(partnerAvg(match)) && partnerAvg(match) < match.rating),
      strongerOpponents: record(match => Number.isFinite(match.rating) && Number.isFinite(match.oppTeamAvg) && match.oppTeamAvg > match.rating),
      weakerOpponents: record(match => Number.isFinite(match.rating) && Number.isFinite(match.oppTeamAvg) && match.oppTeamAvg < match.rating),
      biggestUpsetDelivered: gapped.filter(match => match.won).reduce(byBiggestGap, null),
      biggestUpsetReceived: gapped.filter(match => !match.won).reduce(bySmallestGap, null)
    };
  }

  function formatSigned(value, digits = 2) {
    if (!Number.isFinite(value)) return 'N/A';
    return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
  }

  function metric(label, value, note = '') {
    return `<div class="dupr-metric"><span>${label}</span><strong>${value}</strong>${note ? `<small>${note}</small>` : ''}</div>`;
  }

  function recordLine(record) {
    if (!record || !record.games) return 'N/A';
    return `${record.wins}&ndash;${record.losses} (${(record.wins / record.games * 100).toFixed(1)}%)`;
  }

  function matchDate(match) {
    if (typeof match === 'string') return match;
    return match?.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) || 'No data';
  }

  function insight(label, value, match) {
    const matchAttribute = match?.id ? ` data-match-id="${match.id}" tabindex="0"` : '';
    return `<div class="dupr-insight"${matchAttribute}><span>${label}</span><strong>${value}</strong><small>${matchDate(match)}</small></div>`;
  }

  function attachMatchDetails(root, matches) {
    const matchesById = new Map(matches.map(match => [match.id, match]));
    for (const element of root.querySelectorAll('.dupr-insight[data-match-id]')) {
      const match = matchesById.get(element.dataset.matchId);
      if (!match) continue;
      const tooltip = document.createElement('div');
      tooltip.className = 'dupr-match-details';

      const addRow = (label, value) => {
        if (!value) return;
        const row = document.createElement('p');
        const term = document.createElement('span');
        const detail = document.createElement('strong');
        term.textContent = label;
        detail.textContent = value;
        row.append(term, detail);
        tooltip.appendChild(row);
      };

      const withRatings = players => players
        .map(player => Number.isFinite(player.rating) ? `${player.name} (${player.rating.toFixed(3)})` : player.name)
        .join(', ') || 'Unknown';

      addRow('Tournament', match.eventName);
      if (match.type === 'Doubles') addRow('Partner', withRatings(match.partners));
      addRow(match.type === 'Doubles' ? 'Opponents' : 'Opponent', withRatings(match.opponents));
      addRow('Score', Number.isFinite(match.ownScore) && Number.isFinite(match.opponentScore)
        ? `${match.ownScore}-${match.opponentScore}` : 'Unavailable');
      if (Number.isFinite(match.ratingGap)) {
        addRow('Rating gap', `${formatSigned(match.ratingGap, 2)} (you ${match.myTeamAvg.toFixed(2)} vs ${match.oppTeamAvg.toFixed(2)})`);
      }
      element.appendChild(tooltip);
    }
  }

  function netClass(net) {
    if (!Number.isFinite(net) || net === 0) return '';
    return net > 0 ? 'dupr-net-pos' : 'dupr-net-neg';
  }

  function partnerCell(event) {
    if (!event.partner) return '&mdash;';
    if (!event.partnerId) return event.partner;
    return `<a href="https://dashboard.dupr.com/dashboard/player/${event.partnerId}" target="_blank" rel="noopener">${event.partner}</a>`;
  }

  function eventsTable(events, type) {
    if (!events.length) return '';
    const showPartner = type === 'Doubles';
    const rows = events.map(event => `
      <tr>
        <td class="dupr-event-name"><strong>${event.name}</strong><small>${matchDate(event)}</small></td>
        <td>${event.games}</td>
        <td>${event.wins}&ndash;${event.losses}</td>
        ${showPartner ? `<td class="dupr-event-partner">${partnerCell(event)}</td>` : ''}
        <td>${Number.isFinite(event.startRating) ? event.startRating.toFixed(3) : 'N/A'}</td>
        <td>${Number.isFinite(event.endRating) ? event.endRating.toFixed(3) : 'N/A'}</td>
        <td class="${netClass(event.net)}">${formatSigned(event.net, 3)}</td>
      </tr>`).join('');
    return `
      <div class="dupr-insights-section dupr-events"><h3>Tournament log</h3>
        <table class="dupr-events-table">
          <thead><tr><th>Tournament</th><th>Games</th><th>W&ndash;L</th>${showPartner ? '<th>Partner</th>' : ''}<th>Start</th><th>End</th><th>Net</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function reliabilityDonut(value) {
    if (!Number.isFinite(value)) return '';
    const radius = 15.5;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - Math.max(0, Math.min(100, value)) / 100);
    return `<figure class="dupr-reliability" title="Rating reliability">
      <svg viewBox="0 0 36 36" role="img" aria-label="${value}% reliability">
        <circle class="dupr-reliability-track" cx="18" cy="18" r="${radius}"></circle>
        <circle class="dupr-reliability-arc" cx="18" cy="18" r="${radius}" stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 18 18)"></circle>
        <text class="dupr-reliability-value" x="18" y="18">${value}</text>
      </svg>
      <figcaption>Reliability</figcaption>
    </figure>`;
  }

  function disciplinePanel(type, summary, meta = {}) {
    if (!summary.games) return `<section class="dupr-panel" data-discipline="${type}"><h2>${type}</h2><p class="dupr-empty">No ${type.toLowerCase()} results found.</p></section>`;
    const streak = summary.currentStreak ? `${summary.currentStreak} ${summary.currentResult ? 'W' : 'L'}` : 'N/A';
    return `
      <section class="dupr-panel" data-discipline="${type}">
        <div class="dupr-section-title"><div><span class="dupr-kicker">${type}</span><h2>${summary.games} rated games</h2></div><div class="dupr-headline-stats"><div class="dupr-headline-copy"><strong>${summary.currentRating?.toFixed(3) || 'N/A'}</strong><small>${Math.round(summary.winRate * 100)}% win rate</small></div>${reliabilityDonut(meta.reliability)}</div></div>
        <div class="dupr-winbar"><i style="width:${summary.winRate * 100}%"></i></div>
        <div class="dupr-metrics">
          ${metric('Record', `${summary.wins}&ndash;${summary.losses}`, 'wins - losses')}
          ${metric('Average points', `${summary.avgPointsFor?.toFixed(1) || 'N/A'} / ${summary.avgPointsAgainst?.toFixed(1) || 'N/A'}`, 'for / against')}
          ${metric('Average margin', formatSigned(summary.avgMargin, 1), `${summary.pointsFor}-${summary.pointsAgainst} total points`)}
          ${metric('Close games (≤2)', summary.closeRate === null ? 'N/A' : `${summary.closeGames} (${Math.round(summary.closeRate * 100)}%)`)}
          ${metric('Best win streak', summary.bestWinStreak, `Current: ${streak}`)}
          ${metric('Recent form', `${summary.recentWins}-${summary.recentGames - summary.recentWins}`, `last ${summary.recentGames} games`)}
          ${metric('Tournaments', summary.events)}
        </div>
        <div class="dupr-insights-section"><h3>Rating performance</h3><div class="dupr-insights dupr-insights-rating">
          ${insight('Peak rating', summary.peakRating?.rating.toFixed(3) || 'N/A', summary.peakRating)}
          ${insight('Lowest rating', summary.lowestRating?.rating.toFixed(3) || 'N/A', summary.lowestRating)}
          ${insight('Avg movement per game', formatSigned(summary.avgGameMovement, 3), summary.gameMovementSamples ? `across ${summary.gameMovementSamples} games` : '')}
          ${insight('Avg movement per tournament', formatSigned(summary.avgTourneyMovement, 3), summary.tourneyMovementSamples ? `across ${summary.tourneyMovementSamples} tournaments` : '')}
          ${insight('Biggest single game gain', formatSigned(summary.biggestGain?.delta, 3), summary.biggestGain)}
          ${insight('Biggest single game loss', formatSigned(summary.biggestLoss?.delta, 3), summary.biggestLoss)}
          ${insight('Biggest single tourney gain', formatSigned(summary.biggestTourneyGain?.net, 3), summary.biggestTourneyGain)}
          ${insight('Biggest single tourney loss', formatSigned(summary.biggestTourneyLoss?.net, 3), summary.biggestTourneyLoss)}
        </div></div>
        <div class="dupr-insights-section"><h3>Score highlights</h3><div class="dupr-insights">
          ${insight('Biggest win (to 11)', summary.biggestWin ? `+${summary.biggestWin.ownScore - summary.biggestWin.opponentScore} points` : 'N/A', summary.biggestWin)}
          ${insight('Biggest loss (to 11)', summary.biggestLossByScore ? `${summary.biggestLossByScore.ownScore - summary.biggestLossByScore.opponentScore} points` : 'N/A', summary.biggestLossByScore)}
          ${insight('Points scored', summary.pointsFor, `across ${summary.scoredGames} games`)}
          ${insight('Points conceded', summary.pointsAgainst, `across ${summary.scoredGames} games`)}
        </div></div>
        <div class="dupr-insights-section"><h3>Partners &amp; opponents</h3><div class="dupr-metrics">
          ${summary.partnerSamples ? metric('Avg partner rating', summary.avgPartnerRating?.toFixed(3) ?? 'N/A', `across ${summary.partnerSamples} partners`) : ''}
          ${summary.partnerSamples ? metric('Avg partner Δ vs me', formatSigned(summary.avgPartnerDiff, 3), 'partner minus my rating') : ''}
          ${metric('Avg opponent rating', summary.avgOpponentRating?.toFixed(3) ?? 'N/A', summary.opponentSamples ? `across ${summary.opponentSamples} opponents` : '')}
          ${metric('Avg opponent Δ vs me', formatSigned(summary.avgOpponentDiff, 3), 'opponent minus my rating')}
        </div></div>
        <div class="dupr-insights-section"><h3>Strength matchups</h3><div class="dupr-metrics">
          ${summary.partnerSamples ? metric('Stronger partner W-L', recordLine(summary.strongerPartner)) : ''}
          ${summary.partnerSamples ? metric('Weaker partner W-L', recordLine(summary.weakerPartner)) : ''}
          ${metric('Stronger opponents W-L', recordLine(summary.strongerOpponents), 'Opp avg. vs me')}
          ${metric('Weaker opponents W-L', recordLine(summary.weakerOpponents), 'Opp avg. vs me')}
        </div></div>
        <div class="dupr-insights-section"><h3>Rating upsets</h3><div class="dupr-insights">
          ${insight('Biggest upset delivered', summary.biggestUpsetDelivered ? `${formatSigned(summary.biggestUpsetDelivered.ratingGap, 2)} rating gap` : 'N/A', summary.biggestUpsetDelivered)}
          ${insight('Biggest upset received', summary.biggestUpsetReceived ? `${formatSigned(summary.biggestUpsetReceived.ratingGap, 2)} rating gap` : 'N/A', summary.biggestUpsetReceived)}
        </div></div>
        <div class="dupr-charts">
          <figure class="dupr-rating-chart"><figcaption>Rating history <small>earliest to latest</small></figcaption><canvas data-chart="rating" aria-label="${type} rating history from earliest to latest"></canvas></figure>
        </div>
        ${eventsTable(summary.eventList, type)}
      </section>`;
  }

  const TOURNEY_COLORS = ['#087f8c', '#e85d3f', '#2f6fb0', '#c9ab00', '#7a4fb0', '#3fa34d', '#d1477a'];

  function drawLineChart(canvas, matches) {
    const points = matches.filter(match => Number.isFinite(match.rating));
    canvas._duprChart = null;
    drawCanvas(canvas, (context, width, height) => {
      if (points.length < 2) return drawNoData(context, width, height);
      const values = points.map(match => match.rating);
      const padding = { top: 18, right: 24, bottom: 18, left: 48 };
      let minTick = Math.floor(Math.min(...values) * 10);
      let maxTick = Math.ceil(Math.max(...values) * 10);
      if (minTick === maxTick) { minTick--; maxTick++; }
      const min = minTick / 10;
      const max = maxTick / 10;
      const x = index => padding.left + index * (width - padding.left - padding.right) / (points.length - 1);
      const y = value => padding.top + (max - value) * (height - padding.top - padding.bottom) / (max - min || 1);

      context.strokeStyle = '#dce3e9';
      context.lineWidth = 1;
      context.font = '11px system-ui';
      for (let tick = maxTick; tick >= minTick; tick--) {
        const value = tick / 10;
        const rowY = y(value);
        context.beginPath(); context.moveTo(padding.left, rowY); context.lineTo(width - padding.right, rowY); context.stroke();
        context.fillStyle = '#66767c'; context.textAlign = 'right';
        context.fillText(value.toFixed(1), padding.left - 7, rowY + 4);
      }
      // Assign each point a tournament index; a new tournament begins when the date or the event
      // name no longer matches the previous match, mirroring how the tournament log groups games.
      const tourneyIndex = [];
      let currentTourney = -1;
      let previous = null;
      for (const point of points) {
        const sameDay = previous
          && previous.date.getFullYear() === point.date.getFullYear()
          && previous.date.getMonth() === point.date.getMonth()
          && previous.date.getDate() === point.date.getDate();
        const sameEvent = previous
          && likelySameEvent(comparableEventName(previous.eventName), comparableEventName(point.eventName));
        if (!sameDay || !sameEvent) currentTourney++;
        tourneyIndex.push(currentTourney);
        previous = point;
      }
      const colorForTourney = index => TOURNEY_COLORS[index % TOURNEY_COLORS.length];

      // Each segment takes the colour of the tournament its later point belongs to, so the line
      // changes hue whenever a new tournament starts.
      context.lineWidth = 3; context.lineJoin = 'round'; context.lineCap = 'round';
      for (let index = 1; index < points.length; index++) {
        context.strokeStyle = colorForTourney(tourneyIndex[index]);
        context.beginPath();
        context.moveTo(x(index - 1), y(points[index - 1].rating));
        context.lineTo(x(index), y(points[index].rating));
        context.stroke();
      }
      for (const index of [0, points.length - 1]) {
        context.beginPath(); context.arc(x(index), y(values[index]), 5, 0, Math.PI * 2);
        context.fillStyle = colorForTourney(tourneyIndex[index]); context.fill();
        context.strokeStyle = '#fff'; context.lineWidth = 2; context.stroke();
      }

      canvas._duprChart = { points, values, padding, x, y, width, height };
    });
    setupRatingInteraction(canvas);
  }

  function setupRatingInteraction(canvas) {
    const figure = canvas.closest('.dupr-rating-chart');
    if (!figure) return;

    let hover = figure.querySelector('.dupr-chart-hover');
    if (!hover) {
      hover = document.createElement('div');
      hover.className = 'dupr-chart-hover';
      hover.hidden = true;
      hover.innerHTML = '<i></i><b></b><div role="status"><strong></strong><span></span><small></small></div>';
      figure.appendChild(hover);
    }
    if (canvas.dataset.interactive === 'true') return;
    canvas.dataset.interactive = 'true';

    canvas.addEventListener('pointermove', event => {
      const chart = canvas._duprChart;
      if (!chart) return;
      const rect = canvas.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const plotWidth = chart.width - chart.padding.left - chart.padding.right;
      const rawIndex = (localX - chart.padding.left) / plotWidth * (chart.points.length - 1);
      const index = Math.max(0, Math.min(chart.points.length - 1, Math.round(rawIndex)));
      const point = chart.points[index];
      const pointX = chart.x(index);
      const pointY = chart.y(point.rating);
      const canvasLeft = canvas.offsetLeft;
      const canvasTop = canvas.offsetTop;

      hover.hidden = false;
      hover.querySelector('i').style.cssText = `left:${canvasLeft + pointX}px;top:${canvasTop + chart.padding.top}px;height:${chart.height - chart.padding.top - chart.padding.bottom}px`;
      hover.querySelector('b').style.cssText = `left:${canvasLeft + pointX}px;top:${canvasTop + pointY}px`;
      const tooltip = hover.querySelector('div');
      tooltip.style.left = `${canvasLeft + pointX}px`;
      tooltip.style.top = `${canvasTop + pointY}px`;
      tooltip.classList.toggle('dupr-tooltip-left', pointX > chart.width * 0.62);
      tooltip.querySelector('strong').textContent = `DUPR ${point.rating.toFixed(3)}`;
      tooltip.querySelector('span').textContent = point.date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
      tooltip.querySelector('small').textContent = point.eventName;
    });
    canvas.addEventListener('pointerleave', () => { hover.hidden = true; });
  }

  function drawCanvas(canvas, draw) {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * ratio; canvas.height = height * ratio;
    const context = canvas.getContext('2d');
    context.scale(ratio, ratio);
    draw(context, width, height);
  }

  function drawNoData(context, width, height) {
    context.fillStyle = '#7b898e'; context.font = '12px system-ui'; context.textAlign = 'center';
    context.fillText('Not enough data', width / 2, height / 2);
  }

  function showSummary(matches) {
    document.querySelector('#dupr-summary')?.remove();
    document.querySelector('#dupr-reopen')?.remove();
    document.querySelector('#dupr-summary-styles')?.remove();
    const singles = summarise(matches.filter(match => match.type === 'Singles'));
    const doubles = summarise(matches.filter(match => match.type === 'Doubles'));
    const ratingMeta = parseRatingMeta();
    const totalWins = singles.wins + doubles.wins;
    const totalGames = matches.length;
    const style = document.createElement('style');
    style.id = 'dupr-summary-styles';
    style.textContent = `
      #dupr-summary{position:fixed;inset:0;z-index:99999;overflow:auto;background:#f3f5f4;color:#18343d;font-family:Inter,system-ui,sans-serif;letter-spacing:0}
      #dupr-summary *{box-sizing:border-box;letter-spacing:0} .dupr-shell{max-width:1260px;margin:auto;padding:28px 28px 60px}
      .dupr-header{display:flex;justify-content:flex-end;align-items:center;margin-bottom:16px}
      .dupr-kicker{color:#087f8c;font-size:12px;font-weight:800;text-transform:uppercase}.dupr-actions{display:flex;gap:8px}.dupr-actions button{border:1px solid #c7d0d3;background:#fff;color:#18343d;border-radius:6px;padding:9px 13px;font-weight:700;cursor:pointer}
      .dupr-overview{display:grid;grid-template-columns:repeat(4,1fr);background:#18343d;color:white;border-radius:8px;margin-bottom:18px;overflow:hidden}.dupr-overview div{padding:18px 20px;border-right:1px solid #34505a}.dupr-overview div:last-child{border:0}.dupr-overview span{display:block;color:#b9c7cb;font-size:11px;text-transform:uppercase}.dupr-overview strong{font-size:25px}
      .dupr-tabs{display:flex;gap:6px;margin-bottom:16px}.dupr-tab{border:1px solid #c7d0d3;background:#fff;color:#52666d;border-radius:6px;padding:9px 20px;font-weight:700;font-size:14px;cursor:pointer}.dupr-tab[aria-selected="true"]{background:#18343d;color:#fff;border-color:#18343d}.dupr-panel[hidden]{display:none}
      .dupr-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.dupr-panel{background:white;border:1px solid #dce3e4;border-radius:8px;padding:22px;min-width:0}.dupr-section-title{display:flex;justify-content:space-between;align-items:end}.dupr-section-title h2{font-size:20px;margin:3px 0}.dupr-headline-stats{display:flex;align-items:center;justify-content:flex-end;gap:14px}.dupr-headline-copy{text-align:right}.dupr-headline-stats span,.dupr-headline-stats small{display:block;color:#718086;font-size:10px}.dupr-headline-stats strong{display:block;color:#087f8c;font-size:34px;line-height:1.1}.dupr-reliability{margin:0;display:flex;flex-direction:column;align-items:center;gap:3px}.dupr-reliability svg{display:block;width:46px;height:46px}.dupr-reliability-track{fill:none;stroke:#e2e7e8;stroke-width:3.5}.dupr-reliability-arc{fill:none;stroke:#087f8c;stroke-width:3.5;stroke-linecap:round}.dupr-reliability-value{fill:#18343d;font-size:11px;font-weight:800;text-anchor:middle;dominant-baseline:central}.dupr-reliability figcaption{color:#718086;font-size:9px;font-weight:700;text-transform:uppercase}.dupr-winbar{height:7px;background:#f0d9d4;margin:14px 0 18px}.dupr-winbar i{display:block;height:100%;background:#087f8c}
      .dupr-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#e2e7e8;border:1px solid #e2e7e8}.dupr-metric{background:#fff;padding:13px;min-width:0}.dupr-metric span,.dupr-metric small{display:block;color:#718086;font-size:11px}.dupr-metric strong{display:block;font-size:17px;margin:2px 0;overflow-wrap:anywhere}.dupr-insights-section{margin-top:20px}.dupr-insights-section h3{font-size:12px;margin:0 0 8px;text-transform:uppercase;color:#52666d}.dupr-insights{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #e2e7e8}.dupr-insights-rating .dupr-insight:nth-child(-n+4){border-bottom:1px solid #e2e7e8}.dupr-insights-rating .dupr-insight:nth-child(4n){border-right:0}.dupr-insight{position:relative;padding:11px;border-right:1px solid #e2e7e8;min-width:0}.dupr-insight:last-child{border:0}.dupr-insight span,.dupr-insight small{display:block;color:#718086;font-size:10px}.dupr-insight>strong{display:block;font-size:15px;margin:3px 0;overflow-wrap:anywhere}.dupr-insight[data-match-id]{cursor:help}.dupr-insight[data-match-id]:focus{outline:2px solid #087f8c;outline-offset:-2px}.dupr-match-details{display:none;position:absolute;z-index:10;left:0;bottom:calc(100% + 7px);width:270px;padding:10px 12px;background:#18343d;color:#fff;border-radius:6px;box-shadow:0 5px 18px #0004}.dupr-insight:nth-child(4n) .dupr-match-details{left:auto;right:0}.dupr-insight:hover>.dupr-match-details,.dupr-insight:focus>.dupr-match-details{display:block}.dupr-match-details p{margin:0 0 7px}.dupr-match-details p:last-child{margin:0}.dupr-match-details p>span{color:#aebfc4;font-size:9px;text-transform:uppercase}.dupr-match-details p>strong{display:block;margin-top:1px;color:#fff;font-size:11px;line-height:1.35}.dupr-charts{display:grid;grid-template-columns:1fr;gap:20px;margin-top:20px}.dupr-charts figure{margin:0;min-width:0}.dupr-charts figcaption{font-size:12px;font-weight:800;margin-bottom:8px}.dupr-charts figcaption small{color:#718086;font-weight:500;margin-left:5px}.dupr-charts canvas{display:block;width:100%;height:160px}.dupr-charts .dupr-rating-chart{position:relative}.dupr-charts .dupr-rating-chart canvas{height:260px;cursor:crosshair;touch-action:pan-y}.dupr-empty{color:#718086}
      .dupr-events{overflow-x:auto}.dupr-events-table{width:100%;border-collapse:collapse;font-size:13px}.dupr-events-table th{text-align:right;color:#52666d;font-size:10px;font-weight:800;text-transform:uppercase;padding:8px 10px;border-bottom:2px solid #e2e7e8;white-space:nowrap}.dupr-events-table th:first-child{text-align:left}.dupr-events-table td{padding:9px 10px;border-bottom:1px solid #eef1f2;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.dupr-events-table tbody tr:last-child td{border-bottom:0}.dupr-events-table tbody tr:hover{background:#f7f9f9}.dupr-event-name{text-align:left!important;white-space:normal!important}.dupr-event-name strong{display:block;font-size:13px}.dupr-event-name small{display:block;color:#718086;font-size:10px}.dupr-event-partner{text-align:left!important;color:#18343d}.dupr-event-partner a{color:#087f8c;font-weight:600;text-decoration:none}.dupr-event-partner a:hover{text-decoration:underline}.dupr-net-pos{color:#087f8c;font-weight:700}.dupr-net-neg{color:#e85d3f;font-weight:700}
      .dupr-chart-hover[hidden]{display:none}.dupr-chart-hover>i{position:absolute;width:1px;background:#18343d55;pointer-events:none}.dupr-chart-hover>b{position:absolute;width:12px;height:12px;border:3px solid #fff;border-radius:50%;background:#e85d3f;box-shadow:0 0 0 2px #18343d;transform:translate(-50%,-50%);pointer-events:none}.dupr-chart-hover>div{position:absolute;z-index:2;width:210px;padding:10px 12px;background:#18343d;color:#fff;border-radius:6px;box-shadow:0 5px 18px #0004;transform:translate(10px,calc(-100% - 10px));pointer-events:none}.dupr-chart-hover>div.dupr-tooltip-left{transform:translate(calc(-100% - 10px),calc(-100% - 10px))}.dupr-chart-hover strong,.dupr-chart-hover span,.dupr-chart-hover small{display:block}.dupr-chart-hover strong{font-size:15px}.dupr-chart-hover span{margin-top:2px;color:#dce5e7;font-size:11px}.dupr-chart-hover small{margin-top:6px;color:#fff;font-size:11px;line-height:1.35}
      #dupr-reopen{position:fixed;right:18px;bottom:18px;z-index:99998;border:0;border-radius:6px;background:#18343d;color:#fff;padding:11px 15px;font-weight:700;box-shadow:0 4px 16px #0003;cursor:pointer}
      @media(max-width:900px){.dupr-grid{grid-template-columns:1fr}.dupr-shell{padding:18px 14px 40px}}
      @media(max-width:1100px){.dupr-metrics{grid-template-columns:repeat(2,1fr)}.dupr-insights{grid-template-columns:1fr 1fr}.dupr-insight:nth-child(2){border-right:0}.dupr-insight:nth-child(-n+2){border-bottom:1px solid #e2e7e8}.dupr-insights-rating .dupr-insight:nth-child(2n){border-right:0}.dupr-insights-rating .dupr-insight:nth-child(-n+6){border-bottom:1px solid #e2e7e8}}
      @media(max-width:560px){.dupr-overview{grid-template-columns:1fr 1fr}.dupr-overview div:nth-child(2){border-right:0}.dupr-metrics{grid-template-columns:1fr 1fr}.dupr-charts{grid-template-columns:1fr}.dupr-section-title{align-items:start}}
      @media print{body>*:not(#dupr-summary){display:none!important}#dupr-summary{position:static!important;overflow:visible!important;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.dupr-header,.dupr-tabs,#dupr-reopen,#dupr-analyse{display:none!important}.dupr-shell{max-width:none;padding:0}.dupr-panel{border:0;padding:0}.dupr-panel[hidden]{display:block!important}.dupr-panel+.dupr-panel{break-before:page}.dupr-overview,.dupr-section-title,.dupr-metrics,.dupr-insights,.dupr-charts,.dupr-events{break-inside:avoid}}
    `;
    const summary = document.createElement('div');
    summary.id = 'dupr-summary';
    summary.innerHTML = `<main class="dupr-shell">
      <header class="dupr-header"><div class="dupr-actions"><button type="button" data-action="pdf">Save PDF</button><button type="button" data-action="refresh">Refresh data</button><button type="button" data-action="close">Show original</button></div></header>
      <section class="dupr-overview"><div><span>Total games</span><strong>${totalGames}</strong></div><div><span>Overall record</span><strong>${totalWins}&ndash;${totalGames - totalWins}</strong></div><div><span>Singles win rate</span><strong>${Math.round(singles.winRate * 100)}%</strong></div><div><span>Doubles win rate</span><strong>${Math.round(doubles.winRate * 100)}%</strong></div></section>
      <div class="dupr-tabs" role="tablist">
        <button type="button" class="dupr-tab" data-tab="Doubles" role="tab" aria-selected="true">Doubles</button>
        <button type="button" class="dupr-tab" data-tab="Singles" role="tab" aria-selected="false">Singles</button>
      </div>
      <div class="dupr-panels">${disciplinePanel('Doubles', doubles, ratingMeta.Doubles)}${disciplinePanel('Singles', singles, ratingMeta.Singles)}</div>
    </main>`;
    const reopen = document.createElement('button');
    reopen.id = 'dupr-reopen'; reopen.type = 'button'; reopen.textContent = 'Show stats'; reopen.hidden = true;
    document.head.appendChild(style); document.body.append(summary, reopen);
    attachMatchDetails(summary, matches);
    summary.querySelector('[data-action="pdf"]').addEventListener('click', () => printReport());
    summary.querySelector('[data-action="close"]').addEventListener('click', () => { summary.hidden = true; reopen.hidden = false; });
    summary.querySelector('[data-action="refresh"]').addEventListener('click', () => { summary.remove(); showSummary(parseMatches()); });
    reopen.addEventListener('click', () => { summary.hidden = false; reopen.hidden = true; redraw(); });

    const panels = new Map([...summary.querySelectorAll('[data-discipline]')].map(panel => [panel.dataset.discipline, panel]));
    const tabs = [...summary.querySelectorAll('.dupr-tab')];

    function drawPanel(panel) {
      if (!panel) return;
      const canvas = panel.querySelector('[data-chart="rating"]');
      if (canvas) drawLineChart(canvas, (panel.dataset.discipline === 'Singles' ? singles : doubles).matches);
    }

    function selectTab(name) {
      for (const tab of tabs) tab.setAttribute('aria-selected', String(tab.dataset.tab === name));
      for (const [discipline, panel] of panels) panel.hidden = discipline !== name;
      drawPanel(panels.get(name));
    }

    function redraw() {
      drawPanel([...panels.values()].find(panel => !panel.hidden));
    }

    function printReport() {
      // Both charts only render when their panel has layout, so reveal and draw both before printing.
      const restore = [...panels.values()].filter(panel => panel.hidden);
      for (const panel of panels.values()) { panel.hidden = false; drawPanel(panel); }
      const cleanup = () => {
        window.removeEventListener('afterprint', cleanup);
        for (const panel of restore) panel.hidden = true;
        redraw();
      };
      window.addEventListener('afterprint', cleanup);
      window.print();
    }

    for (const tab of tabs) tab.addEventListener('click', () => selectTab(tab.dataset.tab));
    selectTab('Doubles');
    requestAnimationFrame(redraw);
    window.addEventListener('resize', redraw);
  }

  function showAnalyseButton() {
    document.querySelector('#dupr-analyse')?.remove();
    const button = document.createElement('button');
    button.id = 'dupr-analyse';
    button.type = 'button';
    button.textContent = 'Analyse';
    button.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:99998;border:0;border-radius:6px;background:#18343d;color:#fff;padding:11px 15px;font-weight:700;box-shadow:0 4px 16px #0003;cursor:pointer;font-family:Inter,system-ui,sans-serif';
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Analysing…';
      button.style.cursor = 'progress';
      await loadEverything();
      button.remove();
    });
    document.body.appendChild(button);
  }

  showAnalyseButton();
})();
