/**
 *  Theme function for selects
 */
function theme_office_hours_select(variables) {
  try {
    return theme('select', variables);
  }
  catch (error) {
    console.log('theme_office_hours_select - ' + error);
  }
}

/**
 *  Theme function for textfields
 */
function theme_office_hours_textfield(variables) {
  try {
    return theme('textfield', variables);
  }
  catch (error) {
    console.log('theme_office_hours_textfield - ' + error);
  }
}

/**
 *  Theme function for labels
 */
function theme_office_hours_label(variables) {
  try {
    return '<div ' + drupalgap_attributes(variables.attributes) + '><strong>' +
              variables.title +
           '</strong></div>';
  }
  catch (error) {
    console.log('theme_office_hours_label - ' + error);
  }
}

/**
 * Theme function for field formatter.
 */
function theme_office_hours_field_formatter_default(variables) {
  try {
    var days = variables['days'];
    var daynames = variables['daynames'];
    var open = variables['open'];
    var settings = variables['display']['settings'];

    var timeformat;
    switch (settings['hoursformat']) {
      case 2:
        // 24hr with leading zero.
        timeformat = 'H:i';
        break;
      case 0:
        // 24hr without leading zero.
        timeformat = 'G:i';
        break;
      case 1:
        // 12hr ampm without leading zero.
        timeformat = 'g:i a';
        break;
      case 3:
        // 12hr format as a.m. - p.m. without leading zero.
        timeformat = 'g:i a';
        break;
    }

    // Minimum width for day labels. Adjusted when adding new labels.
    var max_label_length = 3;

    var html_hours = '';
    var html_current_status = '';

    for (var day = 0; day < days.length; day++) {
      if (typeof(days[day]) != 'undefined') {
        // Format the label.
        var label = daynames[days[day]['startday']];
        if (days[day]['endday']) {
          label += settings['separator_grouped_days'] + daynames[days[day]['endday']];
        }
        label += settings['separator_day_hours'];
        if (label.length > max_label_length) {
          max_label_length = label.length;
        }

        var times;
        var comment;

        // Format the time.
        if ((!days[day]['times']) || (days[day]['times'].length == 0)) {
          times = t(settings['closedformat']);
          comment = '';
        }
        else {
          times = [];
          for (var day_time = 0; day_time < days[day]['times'].length; day_time++) {
            var time_range_variables = {
              'times': days[day]['times'][day_time],
              'format': timeformat,
              'separator': settings['separator_hours_hours']
            };
            times.push(theme('office_hours_time_range', time_range_variables));
          }
          times = times.join(settings['separator_more_hours']);
          if (settings['hoursformat'] == 3) {
            times = time.replace('am', 'a.m.');
            times = time.replace('pm', 'p.m.');
          }
          comment = days[day]['times'][(days[day]['times'].length - 1)]['comment'];
        }

        days[day]['output_label'] = label;
        days[day]['output_times'] = times;
        days[day]['output_comment'] = comment;
      }
    }

    // Start the loop again - only now we have the correct max_label_length.
    for (var day = 0; day < days.length; day++) {
      if (typeof(days[day]) != 'undefined') {
        // Remove unwanted lines.
        switch (settings['showclosed']) {
          case 'all':
            break;
          case 'open':
            if (!days[day]['times']) {
              continue;
            }
            break;
          case 'next':
            if ((!days[day]['current']) && (!days[day]['next'])) {
              continue;
            }
            break;
          case 'none':
            continue;
            break;
        }

        // Generate HTML for Hours.
        html_hours += '<span class="oh-display">' +
                      '<span class="oh-display-label" style="width: ' + (max_label_length * 0.60) + 'em;">' +
                      days[day]['output_label'] +
                      '</span>' +
                      '<span class="oh-display-times oh-display-' + (((!days[day]['times']) || (days[day]['times'].length == 0)) ? ('closed') : ('hours')) +
                      ((days[day]['current']) ? (' oh-display-current') : ('')) + '">' +
                      days[day]['output_times'] + ' ' + ((days[day]['output_comment']) ? (days[day]['output_comment']) : ('')) + settings['separator_days'] +
                      '</span>' +
                      '</span>';
      }
    }
    html_hours = '<span class="oh-wrapper' + ((settings['grouped']) ? (' oh-display-grouped') : ('')) + '">' + html_hours + '</span>';

    // Generate HTML for CurrentStatus.
    if (open) {
      html_current_status = '<div class="oh-current-open">' + t(settings['current_status']['open_text']) + '</div>';
    }
    else {
      html_current_status = '<div class="oh-current-closed">' + t(settings['current_status']['closed_text']) + '</div>';
    }

    switch (settings['current_status']['position']) {
      case 'before':
        html = html_current_status + html_hours;
        break;
      case 'after':
        html = html_hours + html_current_status;
        break;
      case 'hide':
      default: // Not shown.
        html = html_hours;
        break;
    }

    return html;
  }
  catch (error) {
    console.log('theme_office_hours_field_formatter_default - ' + error);
  }
}

/**
 * Theme function for formatter: time ranges.
 */
function theme_office_hours_time_range(variables) {
  try {
    // Add default values to $vars if not set already.
    if (typeof(variables['times']) == 'undefined') {
      variables['times'] = {};
    }
    if (typeof(variables['times']['start']) == 'undefined') {
      variables['times']['start'] = '';
    }
    if (typeof(variables['times']['end']) == 'undefined') {
      variables['times']['end'] = '';
    }
    if (typeof(variables['format']) == 'undefined') {
      variables['format'] = 'G:i';
    }
    if (typeof(variables['separator']) == 'undefined') {
      variables['separator'] = ' - ';
    }

    var starttime = _office_hours_time_format(variables['times']['start'], variables['format']);
    var endtime = _office_hours_time_format(variables['times']['end'], variables['format']);
    if ((endtime == '0:00') || (endtime == '00:00')) {
      endtime = '24:00';
    }

    var result = starttime + variables['separator'] + endtime;

    return result;
  }
  catch (error) {
    console.log('theme_office_hours_time_range - ' + error);
  }
}

