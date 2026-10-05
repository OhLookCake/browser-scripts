javascript: (function () {
  // Convert the event name into a cleaner calendar title.
  function toTitleCase(str) {
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Use today, or find the next occurrence of a named weekday.
  // If the named weekday is today, use next week.
  function getEventDate(dayName = 'today') {
    if (dayName.toLowerCase() === 'today') return new Date();

    const days = {
      sun: 0,
      sunday: 0,
      mon: 1,
      monday: 1,
      tue: 2,
      tuesday: 2,
      wed: 3,
      wednesday: 3,
      thu: 4,
      thursday: 4,
      fri: 5,
      friday: 5,
      sat: 6,
      saturday: 6,
    };

    const targetDay = days[dayName.toLowerCase()];
    if (targetDay === undefined) return null;

    const today = new Date();
    const currentDay = today.getDay();
    let daysUntilTarget = targetDay - currentDay;

    if (daysUntilTarget <= 0) daysUntilTarget += 7;

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    return targetDate;
  }

  // Parse compact times such as 1900, or clock times such as 9, 9.30am and 9:30.
  function parseTime(timeStr) {
    timeStr = timeStr.trim().toLowerCase().replace('.', ':');

    if (/^\d{3,4}$/.test(timeStr)) {
      const hours = parseInt(timeStr.slice(0, -2));
      const minutes = parseInt(timeStr.slice(-2));
      return { hours, minutes };
    }

    const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]) || 0;
      const period = match[3]?.toLowerCase();

      if (period) {
        if (period === 'pm' && hours !== 12) hours += 12;
        if (period === 'am' && hours === 12) hours = 0;
      } else if (hours === 12) {
        hours = 0;
      }

      return { hours, minutes };
    }

    return null;
  }

  // A period may be attached to the time or separated by a space.
  function getTrailingTime(parts) {
    if (parts.length >= 2 && /^(am|pm)$/i.test(parts[parts.length - 1])) {
      const timeStr = `${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
      if (parseTime(timeStr)) return { timeStr, tokenCount: 2 };
    }

    if (parts.length >= 1 && parseTime(parts[parts.length - 1])) {
      return { timeStr: parts[parts.length - 1], tokenCount: 1 };
    }

    return null;
  }

  // Parse minutes, decimal hours, or combinations such as 1h30m.
  // Events default to one hour when no duration is provided.
  function parseDuration(str) {
    if (!str) return 60;

    str = str.trim().toLowerCase().replace(/^\+/, '');

    if (/^\d+(\.\d+)?$/.test(str)) {
      return Math.round(parseFloat(str));
    }

    let total = 0;
    let matched = false;
    const hours = str.match(/(\d+(?:\.\d+)?)h/);

    if (hours) {
      total += parseFloat(hours[1]) * 60;
      matched = true;
    }

    const minutes = str.match(/(\d+(?:\.\d+)?)m/);

    if (minutes) {
      total += parseFloat(minutes[1]);
      matched = true;
    }

    if (matched) return Math.round(total);
    return null;
  }

  // Google Calendar accepts compact UTC timestamps in its dates parameter.
  function formatDateTime(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  const input = prompt(
    'Examples:\ntennis practice wed 1900 2h\nPark Run today 9.30am +90m\nDinner 9 pm s',
  );

  if (!input) return;

  // A trailing standalone "s" means the event should also be saved.
  const trimmedInput = input.trim();
  const shouldSave = /\ss$/i.test(trimmedInput);

  // Read the optional day, time, and duration from the end of the input.
  // Everything before those fields becomes the event title.
  const eventInput = shouldSave
    ? trimmedInput.replace(/\ss$/i, '')
    : trimmedInput;
  const parts = eventInput.split(/\s+/);

  let durationStr = null;
  const durationCandidate = parts[parts.length - 1];
  if (
    /^\+?\d+(\.\d+)?[mh]?$/i.test(durationCandidate) &&
    getTrailingTime(parts.slice(0, -1))
  ) {
    durationStr = parts.pop();
  }

  const trailingTime = getTrailingTime(parts);
  if (!trailingTime) {
    alert('Invalid time');
    return;
  }

  parts.splice(-trailingTime.tokenCount);

  let eventDate = getEventDate();
  const explicitDate = getEventDate(parts[parts.length - 1]);
  if (explicitDate) {
    eventDate = explicitDate;
    parts.pop();
  }

  const eventTitle = toTitleCase(parts.join(' '));
  if (!eventTitle) {
    alert("Use: 'event [day] time [duration]'");
    return;
  }

  const timeInfo = parseTime(trailingTime.timeStr);

  const durationMinutes = parseDuration(durationStr);

  if (durationMinutes === null) {
    alert('Invalid duration');
    return;
  }

  eventDate.setHours(timeInfo.hours, timeInfo.minutes, 0, 0);

  const endDate = new Date(eventDate);
  endDate.setMinutes(endDate.getMinutes() + durationMinutes);

  const startTime = formatDateTime(eventDate);
  const endTime = formatDateTime(endDate);
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${startTime}/${endTime}`;

  const calendarWindow = window.open(url, '_blank');

  if (shouldSave && calendarWindow) {
    setTimeout(() => {
      const buttons = calendarWindow.document.querySelectorAll(
        'button, [role="button"]',
      );
      const saveButton = Array.from(buttons).find((button) => {
        const label = button.getAttribute('aria-label') || button.textContent;
        return label?.trim().toLowerCase() === 'save';
      });

      saveButton?.click();
    }, 500);
  }
})();
