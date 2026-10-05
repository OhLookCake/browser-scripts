javascript: (function () {
  // Convert the event name into a cleaner calendar title.
  function toTitleCase(str) {
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Find the next occurrence of a named weekday. If it is today, use next week.
  function getNextWeekday(dayName) {
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

  // Parse compact times such as 1900, or clock times such as 9.30am and 9:30.
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
    'Examples:\ntennis practice wed 1900 2h\nPark Run saturday 9.30am +90m',
  );

  if (!input) return;

  // Read the day, time, and optional duration from the end of the input.
  // Everything before those fields becomes the event title.
  const parts = input.trim().split(/\s+/);

  if (parts.length < 3) {
    alert("Use: 'event day time [duration]'");
    return;
  }

  let durationStr = null;
  if (/^\+?\d+(\.\d+)?[mh]?$/i.test(parts[parts.length - 1])) {
    durationStr = parts.pop();
  }

  const timeStr = parts.pop();
  const dayStr = parts.pop();
  const eventTitle = toTitleCase(parts.join(' '));
  const eventDate = getNextWeekday(dayStr);

  if (!eventDate) {
    alert('Invalid day');
    return;
  }

  const timeInfo = parseTime(timeStr);

  if (!timeInfo) {
    alert('Invalid time');
    return;
  }

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

  window.open(url, '_blank');
})();
