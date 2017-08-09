/**
 * Implements hook_field_formatter_view().
 */
function office_hours_field_formatter_view(entity_type, entity, field, instance, langcode, items, display) {
  try {
    var element = [];

    if (!empty(items)) {
      // Initialize daynames, using date_api as key: 0=Sun - 6=Sat.
      var daynames = [];
      switch (display.settings.daysformat) {
        case 'number':
          // ISO-8601 numerical representation.
          for (var i = 1; i <= 7; i++) {
            daynames.push(i);
          }
          break;

        case 'none':
          for (var i = 0; i < 7; i++) {
            daynames.push('');
          }
          break;

        case 'long':
          daynames = [
            t('Sunday'),
            t('Monday'),
            t('Tuesday'),
            t('Wednesday'),
            t('Thursday'),
            t('Friday'),
            t('Saturday')
          ];
          break;

        case 'short':
        default:
          daynames = [
            t('Sun'),
            t('Mon'),
            t('Tue'),
            t('Wed'),
            t('Thu'),
            t('Fri'),
            t('Sat')
          ];
          break;
      }

      // Initialize days and times, using date_api as key (0=Sun, 6-Sat)
      // Empty days are not yet present in items, and are now added in days.
      var days = [];
      for (var day = 0; day < 7; day++) {
        days.push({
          'startday': day,
          'endday': null,
          'times': [],
          'current': false,
          'next': false,
        });
      }

      // TODO: support timezones.
      var timezone = null;

      // Avoid repetitive calculations, use static.
      // See http://drupal.org/node/1969956.
      var today = parseInt(date('w'));
      var now = date('Gi');

      var open = false;
      var next = null;

      // Loop through all lines. Detect the current line and the open/closed status.
      // Convert the daynumber to (int) to get '0' for Sundays, not 'false'.
      for (var delta in items) {
        if (!items.hasOwnProperty(delta)) {
          continue;
        }

        var item = items[delta];

        // Calculate start and end times.
        var day = parseInt(item['day']);
        var start = _office_hours_time_to_mil(item['starthours']); // 'Gi' format.
        var end = _office_hours_time_to_mil(item['endhours']); // 'Gi' format.
        var comment = item['comment'];

        var times = {
          'start': start,
          'end': end,
          'comment': comment,
        };
        days[day]['times'].push(times);

        // Are we currently open? If not, when is the next time?
        // Remember: empty days are not in items; they are present in days.
        if (day < today) {
          // Initialize to first day of (next) week, in case we're closed
          // the rest of the week.
          if (!next) {
            next = day;
          }
        }

        if ((day - today == -1) || (day - today == 6)) {
          // We were open yesterday evening, check if we are still open.
          if ((start >= end) && (end >= now)) {
            open = true;
            days[day]['current'] = true;
            next = day;
          }
        }
        else if (day == today) {
          if (start <= now) {
            // We were open today, check if we are still open.
            if (
              (start > end) || // We are open until after midnight.
              (start == end) || // We are open 24hrs per day.
              ((start < end) && (end > now)) // We have closed already.
            ) {
              open = true;
              days[day]['current'] = true;
              next = day;
            }
            else {
              // We have already closed.
            }
          }
          else {
            // We will open later today.
            next = day;
          }
        }
        else if (day > today) {
          if ((!next) || (next < today)) {
            next = day;
          }
        }
      }
      if (next) {
        days[next]['next'] = true;
      }

      // Reorder weekdays to match the first day of the week, using formatter settings;
      if (display.settings.date_first_day > 0) {
        for (var i = 1; i <= display.settings.date_first_day; i++) {
          var last = days.shift();
          days.push(last);
        }
      }

      // Check if we're compressing times. If so, combine lines of the same day into one.
      if (display.settings.compress) {
        for (var day = 0; day < days.length; day++) {
          if (days[day]['times'].length > 0) {
            var day_times = days[day]['times'][0];

            for (var day_time = 0; day_time < days[day]['times'].length; day_time++) {
              if (days[day]['times'][day_time]['start'] < day_times['start']) {
                day_times['start'] = days[day]['times'][day_time]['start'];
              }
              if (days[day]['times'][day_time]['end'] > day_times['end']) {
                day_times['end'] = days[day]['times'][day_time]['end'];
              }
            }

            days[day]['times'] = [day_times];
          }
        }
      }

      // Check if we're grouping days.
      if (display.settings.grouped) {
        for (var day = 0; day < 7; day++) {
          var times;
          if (day == 0) {
            times = days[day]['times'];
          }
          else if (JSON.stringify(times) != JSON.stringify(days[day]['times'])) {
            times = days[day]['times'];
          }
          else {
            var yesterday = day - 1;
            if (yesterday < 0) {
              yesterday = 6;
            }

            days[day]['endday'] = days[day]['startday'];
            days[day]['startday'] = days[yesterday]['startday'];
            days[day]['current'] = days[day]['current'] || days[yesterday]['current'];
            days[day]['next'] = days[day]['next'] || days[yesterday]['next'];
            delete(days[yesterday]);
          }
        }
      }

      // Theme the result.
      var element_variables = {
        'element': items,
        'display': display,
        'days': days,
        'daynames': daynames,
        'open': open,
        'timezone': timezone
      };
      element.push({
        markup: theme('office_hours_field_formatter_default', element_variables)
      });
    }

    return element;
  }
  catch (error) {
    console.log('office_hours_field_formatter_view - ' + error);
  }
}

