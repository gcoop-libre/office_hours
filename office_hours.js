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


/**
 * Implements hook_field_widget_form().
 */
function office_hours_field_widget_form(form, form_state, field, instance, langcode, items, delta, element) {
  try {
    // Convert the item into a hidden field that will have
    // its value populated dynamically by the widget.
    // We'll store the value within the element using this format:
    //
    // DAY|STARTHOURS_HOURS:STARTHOURS_MINUTES:STARTHOURS_AMPM|ENDHOURS_HOURS:ENDHOURS_MINUTES:ENDHOURS_AMPM|COMMENT
    items[delta].type = 'hidden';

    if (instance.widget.type == 'office_hours') {
      _office_hours_correct_items_delta(items, field.settings.date_first_day, field.settings.cardinality);
    }

    _office_hours_field_set_values(field, instance, items, delta);

    switch (instance.widget.type) {
      case 'office_hours_dynamic_widget':
        var has_value = false;
        if (!empty(items[delta].value)) {
          has_value = true;
        }

        var value_parts = _office_hours_extract_value_parts(items[delta].value);
        var increment = parseInt(field.settings.granularity);
        var ampm = false;
        if (
          (field.settings.hoursformat == 1) ||
          (field.settings.hoursformat == 3)
        ) {
          ampm = true;
        }

        var attributes_day;
        var attributes_starthours;
        var attributes_endhours;
        var attributes_remove_day;

        var widget_day;
        var widget_starthours;
        var widget_endhours;

        items[delta].children.push({
          markup: '<div class="office-hours-day-container" style="' + ((!has_value) ? ('display:none;') : ('')) + '">'
        });

        attributes_day = {
          'id': items[delta].id + '-day',
          'onchange': "office_hours_update_field_value(this, '" + items[delta].id + "');"
        };
        widget_day = _office_hours_widget_days(value_parts['day'], attributes_day);
        widget_day['prefix'] = theme('office_hours_label', { title: t('Day') });
        items[delta].children.push(widget_day);

        attributes_starthours = {
          'id': items[delta].id + '-starthours',
          'onchange': "office_hours_update_field_value(this, '" + items[delta].id + "');"
        };
        widget_starthours = _office_hours_widget_starthours(value_parts['starthours'], attributes_starthours, increment, ampm);
        items[delta].children.push({ markup: theme('office_hours_label', { title: t('From:') }) });
        items[delta].children.push(_office_hours_widget_starthours_container(ampm, true));
        for (var i = 0; i < widget_starthours.length; i++) {
          items[delta].children.push(widget_starthours[i]);
        }
        items[delta].children.push(_office_hours_widget_starthours_container(ampm, false));

        attributes_endhours = {
          'id': items[delta].id + '-endhours',
          'onchange': "office_hours_update_field_value(this, '" + items[delta].id + "');"
        };
        widget_endhours = _office_hours_widget_endhours(value_parts['endhours'], attributes_endhours, increment, ampm);
        items[delta].children.push({ markup: theme('office_hours_label', { title: t('To:') }) });
        items[delta].children.push(_office_hours_widget_endhours_container(ampm, true));
        for (var i = 0; i < widget_endhours.length; i++) {
          items[delta].children.push(widget_endhours[i]);
        }
        items[delta].children.push(_office_hours_widget_endhours_container(ampm, false));

        attributes_remove_day = {
          'data-icon': 'delete',
          'data-iconpos': 'right',
          'href': '#',
          'onclick': 'office_hours_remove_day(this);'
        }
        items[delta].children.push({
          'type': 'button',
          'attributes': attributes_remove_day,
          'text': t('Remove')
        });

        items[delta].children.push({
          markup:'</div>'
        });

        if (delta == (field.cardinality - 1)) {
          var add_button_style = 'display:none;';
          for (var i = 0; i < field.cardinality; i++) {
            if (empty(items[i].value)) {
              add_button_style = '';
              break;
            }
          }

          attributes_add_day = {
            'data-icon': 'calendar',
            'data-iconpos': 'right',
            'class': 'office-hours-add-day',
            'href': '#',
            'onclick': 'office_hours_add_day(this);',
            'style': add_button_style
          }
          items[delta].children.push({
            'type': 'button',
            'attributes': attributes_add_day,
            'text': t('Add an hour')
          });
        }
        break;
      case 'office_hours':
        var weekdays = [
          t('Sunday'),
          t('Monday'),
          t('Tuesday'),
          t('Wednesday'),
          t('Thursday'),
          t('Friday'),
          t('Saturday')
        ];

        var day;
        var day_delta;

        day = parseInt(field.settings.date_first_day) + Math.floor(delta / field.settings.cardinality);
        day_delta = delta - ((day - field.settings.date_first_day) * field.settings.cardinality);
        if (day >= 7) {
          day -= 7;
        }

        var has_value = false;
        if (!empty(items[delta].value)) {
          has_value = true;
        }

        var value_parts = _office_hours_extract_value_parts(items[delta].value);
        var increment = parseInt(field.settings.granularity);
        var ampm = false;
        if (
          (field.settings.hoursformat == 1) ||
          (field.settings.hoursformat == 3)
        ) {
          ampm = true;
        }

        var attributes_starthours;
        var attributes_endhours;
        var attributes_remove_day;

        var widget_starthours;
        var widget_endhours;
        var widget_comment;

        if (day_delta == 0) {
          items[delta].children.push({ markup: theme('header', { text: weekdays[day] }) });
          items[delta].children.push({
            markup: '<div class="office-hours-day-container">'
          });
        }

        items[delta].children.push({
          markup: '<div class="office-hours-day-delta-container" style="' + ((!has_value) ? ('display:none;') : ('')) + '">'
        });

        attributes_starthours = {
          'id': items[delta].id + '-starthours',
          'onchange': "office_hours_update_field_value(this, '" + items[delta].id + "');"
        };
        widget_starthours = _office_hours_widget_starthours(value_parts['starthours'], attributes_starthours, increment, ampm);
        items[delta].children.push({ markup: theme('office_hours_label', { title: t('From:') }) });
        items[delta].children.push(_office_hours_widget_starthours_container(ampm, true));
        for (var i = 0; i < widget_starthours.length; i++) {
          items[delta].children.push(widget_starthours[i]);
        }
        items[delta].children.push(_office_hours_widget_starthours_container(ampm, false));

        attributes_endhours = {
          'id': items[delta].id + '-endhours',
          'onchange': "office_hours_update_field_value(this, '" + items[delta].id + "');"
        };
        widget_endhours = _office_hours_widget_endhours(value_parts['endhours'], attributes_endhours, increment, ampm);
        items[delta].children.push({ markup: theme('office_hours_label', { title: t('To:') }) });
        items[delta].children.push(_office_hours_widget_endhours_container(ampm, true));
        for (var i = 0; i < widget_endhours.length; i++) {
          items[delta].children.push(widget_endhours[i]);
        }
        items[delta].children.push(_office_hours_widget_endhours_container(ampm, false));

        if (!empty(field.settings.comment)) {
          attributes_comment = {
            'id': items[delta].id + '-comment',
            'onblur': "office_hours_update_field_value(this, '" + items[delta].id + "');"
          };
          widget_comment = _office_hours_widget_comments(value_parts['comment'], attributes_comment);
          widget_comment['prefix'] = theme('office_hours_label', { title: t('Comment') });
          items[delta].children.push(widget_comment);
        }

        attributes_remove_day_delta = {
          'data-icon': 'delete',
          'data-iconpos': 'right',
          'href': '#',
          'onclick': 'office_hours_remove_day_delta(this);'
        }
        items[delta].children.push({
          'type': 'button',
          'attributes': attributes_remove_day_delta,
          'text': t('Remove')
        });

        items[delta].children.push({
          markup:'</div>'
        });

        if (day_delta == (field.settings.cardinality - 1)) {
          var add_button_style = 'display:none;';
          for (var i = 0; i < field.settings.cardinality; i++) {
            var i_delta = (delta - day_delta) + i;
            if (empty(items[i_delta].value)) {
              add_button_style = '';
              break;
            }
          }

          attributes_add_day_delta = {
            'data-icon': 'calendar',
            'data-iconpos': 'right',
            'class': 'office-hours-add-day-delta',
            'href': '#',
            'onclick': 'office_hours_add_day_delta(this);',
            'style': add_button_style
          }
          items[delta].children.push({
            'type': 'button',
            'attributes': attributes_add_day_delta,
            'text': t('Add an hour')
          });

          items[delta].children.push({
            markup:'</div>'
          });
        }
        break;
      default:
        console.log('office_hours_field_widget_form - unknown widget type: ' + instance.widget.type);
        break;
    }
  }
  catch (error) {
    console.log('office_hours_field_widget_form - ' + error);
  }
}


/**
 *  Generate Day widget
 *
 *  @param  {String}  value
 *  @param  {Object}  attributes
 *  @return {Object}
 */
function _office_hours_widget_days(value, attributes) {
  try {
    // The space ensures DrupalGap respect the order of the options
    var options = {
      ' ': t('- Select -'),
      ' 0': t('Sunday'),
      ' 1': t('Monday'),
      ' 2': t('Tuesday'),
      ' 3': t('Wednesday'),
      ' 4': t('Thursday'),
      ' 5': t('Friday'),
      ' 6': t('Saturday')
    };

    // Build and theme the select list.
    field = {
      type: 'office_hours_select',
      value: ' ' + value,
      attributes: attributes,
      options: options
    };

    return field;
  }
  catch (error) {
    console.log('_office_hours_widget_days', error);
  }
}

/**
 *  Generate Start hours widget container
 *
 *  @param  {Boolean}  ampm
 *  @param  {Boolean}  start
 *  @return {Object}
 */
function _office_hours_widget_starthours_container(ampm, start) {
  try {
    return _office_hours_widget_hours_container(ampm, start);
  }
  catch (error) {
    console.log('_office_hours_widget_starthours_container', error);
  }
}

/**
 *  Generate Start hours widget
 *
 *  @param  {String}  value
 *  @param  {Object}  attributes
 *  @param  {Int}  increment
 *  @param  {Boolean}  ampm
 *  @return {Object}
 */
function _office_hours_widget_starthours(value, attributes, increment, ampm) {
  try {
    return _office_hours_widget_hours(value, attributes, increment, ampm);
  }
  catch (error) {
    console.log('_office_hours_widget_starthours', error);
  }
}

/**
 *  Generate End hours widget
 *
 *  @param  {String}  value
 *  @param  {Object}  attributes
 *  @param  {Int}  increment
 *  @param  {Boolean}  ampm
 *  @return {Object}
 */
function _office_hours_widget_endhours(value, attributes, increment, ampm) {
  try {
    return _office_hours_widget_hours(value, attributes, increment, ampm);
  }
  catch (error) {
    console.log('_office_hours_widget_endhours', error);
  }
}

/**
 *  Generate End hours widget container
 *
 *  @param  {Boolean}  ampm
 *  @param  {Boolean}  start
 *  @return {Object}
 */
function _office_hours_widget_endhours_container(ampm, start) {
  try {
    return _office_hours_widget_hours_container(ampm, start);
  }
  catch (error) {
    console.log('_office_hours_widget_endhours_container', error);
  }
}

/**
 *  Generate Hours widget
 *
 *  @param  {String}  value
 *  @param  {Object}  attributes
 *  @param  {Int}  increment
 *  @param  {Boolean}  ampm
 *  @return {Object}
 */
function _office_hours_widget_hours(value, attributes, increment, ampm) {
  try {
    var fields = [];

    var hour_start;
    var hour_end;
    if (ampm) {
      hour_start = 1;
      hour_end = 12;
    }
    else {
      hour_start = 0;
      hour_end = 23;
    }
    // The space ensures DrupalGap respect the order of the options
    var options_hour = {
      ' ': t('- Select -')
    };
    for (var i = hour_start; i <= hour_end; i++) {
      var key = i;
      if (i < 10) {
        key = '0' + i;
      }
      key = ' ' + key;

      options_hour[key] = i;
    }

    var attributes_hour = {
      id: attributes.id + '-hour',
      onchange: attributes.onchange
    };
    var field_hour = {
      type: 'office_hours_select',
      value: ' ' + value[0],
      attributes: attributes_hour,
      options: options_hour,
      prefix: '<div class="ui-block-a">',
      suffix: '</div>'
    }
    fields.push(field_hour);

    // The space ensures DrupalGap respect the order of the options
    var options_minute = {
      ' ': t('- Select -')
    };
    for (var i = 0; i < 60; i += increment) {
      var option_key = i;
      var option_value = i;
      if (i < 10) {
        option_key = '0' + i;
        option_value = '0' + i;
      }
      option_key = ' ' + option_key;


      options_minute[option_key] = option_value;
    }

    var attributes_minute = {
      id: attributes.id + '-minute',
      onchange: attributes.onchange
    };
    var field_minute = {
      type: 'office_hours_select',
      value: ' ' + value[1],
      attributes: attributes_minute,
      options: options_minute,
      prefix: '<div class="ui-block-b">',
      suffix: '</div>'
    }
    fields.push(field_minute);

    if (ampm) {
      var options_ampm = {
        '': t('- Select -'),
        'am': t('AM'),
        'pm': t('PM')
      };

      var attributes_ampm = {
        id: attributes.id + '-ampm',
        onchange: attributes.onchange
      };
      var field_ampm = {
        type: 'office_hours_select',
        value: value[2],
        attributes: attributes_ampm,
        options: options_ampm,
        prefix: '<div class="ui-block-c">',
        suffix: '</div>'
      }
      fields.push(field_ampm);
    }

    return fields;
  }
  catch (error) {
    console.log('_office_hours_widget_hours', error);
  }
}

/**
 *  Generate Hours widget container
 *
 *  @param  {Boolean}  ampm
 *  @param  {Boolean}  start
 *  @return {Object}
 */
function _office_hours_widget_hours_container(ampm, start) {
  try {
    var field;

    if (start) {
      field = {
        markup: '<div class="' + ((ampm) ? ('ui-grid-b') : ('ui-grid-a')) + '">'
      };
    }
    else {
      field = {
        markup: '</div>'
      }
    }

    return field;
  }
  catch (error) {
    console.log('_office_hours_widget_endhours_container', error);
  }
}

/**
 *  Generate Comment widget
 *
 *  @param  {String}  value
 *  @param  {Object}  attributes
 *  @return {Object}
 */
function _office_hours_widget_comments(value, attributes) {
  try {
    attributes.value = value;

    // Build and theme the text field.
    field = {
      type: 'office_hours_textfield',
      attributes: attributes
    };

    return field;
  }
  catch (error) {
    console.log('_office_hours_widget_comments', error);
  }
}


/**
 *  Correct the item object of the items, so they are attached to the right delta
 *
 *  @param  {Object}  items
 *  @param  {Int}  date_first_day
 *  @param  {Int}  cardinality
 */
function _office_hours_correct_items_delta(items, date_first_day, cardinality) {
  var items_per_day = {};

  for (var delta in items) {
    if (!items.hasOwnProperty(delta)) {
      continue;
    }

    if (typeof(items[delta]['item']) != 'undefined') {
      var item = items[delta]['item'];

      if (typeof(item['day']) != 'undefined') {
        if (typeof(items_per_day[item['day']]) == 'undefined') {
          items_per_day[item['day']] = [];
        }

        items_per_day[item['day']].push(item);
      }
      delete(item);
      delete(items[delta]['item']);
    }
  }

  for (var day = 0; day < 7; day++) {
    var item_day = day + parseInt(date_first_day);
    if (item_day >= 7) {
      item_day -= 7;
    }

    if (typeof(items_per_day[item_day]) != 'undefined') {
      for (var day_slot = 0; day_slot < cardinality; day_slot++) {
        if (typeof(items_per_day[item_day][day_slot]) != 'undefined') {
          var delta = (day * cardinality) + day_slot;

          items[delta]['item'] = items_per_day[item_day][day_slot];
        }
      }
    }
  }
}

/**
 *  Generate the field value from the item Object
 *
 *  @param  {Object}  field
 *  @param  {Object}  instance
 *  @param  {Array}  items
 *  @param  {int}  delta
 */
function _office_hours_field_set_values(field, instance, items, delta) {
  try {
    var field_value_item = null;

    if (typeof(items[delta].item) != 'undefined') {
      field_value_item = items[delta].item;
    }
    else {
      if ((typeof(items[delta].value) == 'undefined') || (items[delta].value == '')) {
        // If the value isn't set, check if a default value is available.
        if (
          ((items[delta].default_value == '') || (!items[delta].default_value)) &&
          (instance.settings.default_value != '')
        ) {
          items[delta].default_value = instance.settings.default_value;
        }

        if (
          (typeof(items[delta].default_value) != 'undefined') &&
          (items[delta].default_value)
        ) {
          if (instance.widget.type == 'office_hours_dynamic_widget') {
            if (delta == 0) {
              field_value_item = items[delta].default_value;
            }
          }
          else if (instance.widget.type == 'office_hours') {
            $.each(items[delta].default_value, function(key, default_value) {
              var item_delta;

              item_delta = ((default_value.day - field.settings.date_first_day) * field.settings.cardinality) + default_value.daydelta;
              if (field.settings.date_first_day > default_value.day) {
                item_delta += (7 * field.settings.cardinality);
              }

              if (item_delta == delta) {
                field_value_item = default_value;
                return false;
              }
            });
          }
        }
      }
      else {
        if (instance.widget.type == 'office_hours_dynamic_widget') {
          if (delta == 0) {
            field_value_item = items[delta].value;
          }
        }
        else if (instance.widget.type == 'office_hours') {
          $.each(items[delta].value, function(key, value) {
            var item_delta;

            item_delta = ((value.day - field.settings.date_first_day) * field.settings.cardinality) + value.daydelta;
            if (field.settings.date_first_day > value.day) {
              item_delta += (7 * field.settings.cardinality);
            }

            if (item_delta == delta) {
              field_value_item = value;
              return false;
            }
          });
        }
      }
    }

    items[delta].value = '';
    if (!empty(field_value_item)) {
      var day, starthours, endhours, comment;
      day = '';
      starthours = ['', '', ''];
      endhours = ['', '', ''];
      comment = '';

      if (
        (typeof(field_value_item.day) != 'undefined') &&
        (!empty(field_value_item.day))
      ) {
        day = field_value_item.day;
      }
      if (
        (typeof(field_value_item.starthours) != 'undefined') &&
        (!empty(field_value_item.starthours))
      ) {
        var item_starthours = '' + field_value_item.starthours;
        item_starthours = '0000'.substr(0, (4 - item_starthours.length)) + item_starthours;

        starthours = [
          item_starthours.substr(0, 2),
          item_starthours.substr(-2),
          ''
        ];

        if (
          (field.settings.hoursformat == 1) ||
          (field.settings.hoursformat == 3)
        ) {
          if (starthours[0] >= 12) {
            if (starthours[0] > 12) {
              starthours[0] -= 12;
              if (starthours[0] < 10) {
                starthours[0] = '0' + starthours[0];
              }
            }
            starthours[2] = 'pm';
          }
          else {
            starthours[2] = 'am';
          }
        }
      }
      if (
        (typeof(field_value_item.endhours) != 'undefined') &&
        (!empty(field_value_item.endhours))
      ) {
        var item_endhours = '' + field_value_item.endhours;
        item_endhours = '0000'.substr(0, (4 - item_endhours.length)) + item_endhours;

        endhours = [
          item_endhours.substr(0, 2),
          item_endhours.substr(-2),
          ''
        ];

        if (
          (field.settings.hoursformat == 1) ||
          (field.settings.hoursformat == 3)
        ) {
          if (endhours[0] >= 12) {
            if (endhours[0] > 12) {
              endhours[0] -= 12;
              if (endhours[0] < 10) {
                endhours[0] = '0' + endhours[0];
              }
            }
            endhours[2] = 'pm';
          }
          else {
            endhours[2] = 'am';
          }
        }
      }
      if (
        (typeof(field_value_item.comment) != 'undefined') &&
        (field_value_item.comment)
      ) {
        comment = field_value_item.comment;
      }

      items[delta].value = _office_hours_format_value(day, starthours, endhours, comment);
    }
  }
  catch (error) {
    console.log('_office_hours_field_set_values', error);
  }
}

/**
 *  Format a field value from its parts
 *
 *  @param  {String}  day
 *  @param  {Array}  starthours
 *  @param  {Array}  endhours
 *  @param  {String}  comment
 *  @return  {String}
 */
function _office_hours_format_value(day, starthours, endhours, comment) {
  try {
    var value;

    value = day + '|' + starthours.join(':') + '|' + endhours.join(':') + '|' + comment;

    return value;
  }
  catch (error) {
    console.log('_office_hours_format_value', error);
  }
}

/**
 *  Extract field value parts
 *
 *  @param  {String} value
 *  @return  {Array}
 */
function _office_hours_extract_value_parts(value) {
  try {
    var parts;

    parts = {
      'day': '',
      'starthours': ['', '', ''],
      'endhours': ['', '', ''],
      'comment': ''
    };

    value_array = value.split('|', 4);
    if (typeof(value_array[0]) != 'undefined') {
      parts['day'] = value_array[0];
    }
    if (typeof(value_array[1]) != 'undefined') {
      starthours_array = value_array[1].split(':', 3);
      if (typeof(starthours_array[0]) != 'undefined') {
        parts['starthours'][0] = starthours_array[0];
      }
      if (typeof(starthours_array[1]) != 'undefined') {
        parts['starthours'][1] = starthours_array[1];
      }
      if (typeof(starthours_array[2]) != 'undefined') {
        parts['starthours'][2] = starthours_array[2];
      }
    }
    if (typeof(value_array[2]) != 'undefined') {
      endhours_array = value_array[2].split(':', 3);
      if (typeof(endhours_array[0]) != 'undefined') {
        parts['endhours'][0] = endhours_array[0];
      }
      if (typeof(endhours_array[1]) != 'undefined') {
        parts['endhours'][1] = endhours_array[1];
      }
      if (typeof(endhours_array[2]) != 'undefined') {
        parts['endhours'][2] = endhours_array[2];
      }
    }
    if (typeof(value_array[3]) != 'undefined') {
      parts['comment'] = value_array[3];
    }

    return parts;
  }
  catch (error) {
    console.log('_office_hours_extract_value_parts', error);
  }
}

/**
 *  Update the field value from a field part
 *
 *  @param  {Object}  input
 *  @param  {String}  id
 */
function office_hours_update_field_value(input, id) {
  try {
    var current_value;
    var new_value;
    var parts;
    var input_id;

    current_value = $('#' + id).val();
    new_value = $.trim($(input).val());
    parts = _office_hours_extract_value_parts(current_value);
    input_id = $(input).attr('id');

    if (input_id.endsWith('-day')) {
      parts['day'] = new_value;
    }
    else if (input_id.endsWith('-starthours-hour')) {
      parts['starthours'][0] = new_value;
    }
    else if (input_id.endsWith('-starthours-minute')) {
      parts['starthours'][1] = new_value;
    }
    else if (input_id.endsWith('-starthours-ampm')) {
      parts['starthours'][2] = new_value;
    }
    else if (input_id.endsWith('-endhours-hour')) {
      parts['endhours'][0] = new_value;
    }
    else if (input_id.endsWith('-endhours-minute')) {
      parts['endhours'][1] = new_value;
    }
    else if (input_id.endsWith('-endhours-ampm')) {
      parts['endhours'][2] = new_value;
    }
    else if (input_id.endsWith('-comment')) {
      parts['comment'] = new_value;
    }

    $('#' + id).val(_office_hours_format_value(parts['day'], parts['starthours'], parts['endhours'], parts['comment']));
  }
  catch (error) {
    console.log('office_hours_update_field_value', error);
  }
}

/**
 *  Remove the widgets for a Day
 *
 *  @param  {Object}  input
 */
function office_hours_remove_day(input) {
  try {
    $(input)
      .parents('.office-hours-day-container')
        .each(function() {
          $(this)
            .find('select')
              .val(' ')
                .change();

          $(this).hide();
        })
        .siblings('.office-hours-add-day')
          .show();
  }
  catch (error) {
    console.log('office_hours_remove_day', error);
  }
}

/**
 *  Add the widgets for a Day
 *
 *  @param  {Object}  input
 */
function office_hours_add_day(input) {
  try {
    $(input)
      .before(
        $(input)
          .siblings('.office-hours-day-container:hidden')
            .first()
              .show()
      );

    if ($(input).siblings('.office-hours-day-container:hidden').length == 0) {
      $(input).hide();
    }
  }
  catch (error) {
    console.log('office_hours_add_day', error);
  }
}

/**
 *  Remove the widgets for a delta of a Day
 *
 *  @param  {Object}  input
 */
function office_hours_remove_day_delta(input) {
  try {
    $(input)
      .parents('.office-hours-day-delta-container')
        .each(function() {
          $(this)
            .find('select')
              .val(' ')
                .change();

          $(this).hide();
        })
        .siblings('.office-hours-add-day-delta')
          .show();
  }
  catch (error) {
    console.log('office_hours_remove_day_delta', error);
  }
}

/**
 *  Add the widgets for a delta of a Day
 *
 *  @param  {Object}  input
 */
function office_hours_add_day_delta(input) {
  try {
    $(input)
      .before(
        $(input)
          .siblings('.office-hours-day-delta-container:hidden')
            .first()
              .show()
      );

    if ($(input).siblings('.office-hours-day-delta-container:hidden').length == 0) {
      $(input).hide();
    }
  }
  catch (error) {
    console.log('office_hours_add_day_delta', error);
  }
}

/**
 * Helper function to convert '08:00' / '8:00' / '800' to '0800'
 */
function _office_hours_time_to_mil(time) {
  if (empty(time)) {
    return time;
  }

  time = '' + time;
  time = time.replace(':', '');
  time = '0000'.substr(0, (4 - time.length)) + time;

  return time;
}

/**
 * Helper function to convert '0800' to '08:00' / '8:00' / '800'
 */
function _office_hours_time_format(time, format) {
  time = '' + time;
  time = time.replace(':', '');
  time = '0000'.substr(0, (4 - time.length)) + time;

  var hours = parseInt(time.substr(0, 2));
  var minutes = parseInt(time.substr(-2));
  var current_date = new Date();
  current_date.setHours(hours);
  current_date.setMinutes(minutes);

  var time_formatted = date(format, current_date.getTime());

  return time_formatted;
}


/**
 * Implements hook_services_request_pre_postprocess_alter().
 * @param {Object} options
 * @param {*} result
 */
function office_hours_services_request_pre_postprocess_alter(options, result) {
  try {
    if (options.service == 'system' && options.resource == 'connect') {
      $.each(drupalgap.field_info_fields, function(field_name, field_info) {
        if ((field_info['type'] == 'office_hours') && (field_info['cardinality'] == -1)) {
          if (typeof(field_info['settings']['cardinality']) != 'undefined') {
            var office_hours_cardinality = 7 * field_info['settings']['cardinality'];
            drupalgap.field_info_fields[field_name]['cardinality'] = office_hours_cardinality;
          }
        }
      });
    }
  }
  catch (error) {
    console.log('office_hours_services_request_pre_postprocess_alter - ' + error);
  }
}

/**
 * Implements hook_assemble_form_state_into_field().
 *
 * @param  {String}  entity_type
 * @param  {String}  bundle
 * @param  {String}  form_state_value
 * @param  {Object}  field
 * @param  {Object}  instance
 * @param  {String}  langcode
 * @param  {Int}  delta
 * @param  {Object}  field_key
 * @param  {Object}  form
 */
function office_hours_assemble_form_state_into_field(entity_type, bundle, form_state_value, field, instance, langcode, delta, field_key, form) {
  try {
    field_key.use_key = false;
    field_key.use_wrapper = false;
    field_key.use_delta = true;

    var result = {};

    var parts = _office_hours_extract_value_parts(form_state_value);
    if ((typeof(parts['day']) != 'undefined') && (!empty(parts['day']))) {
      result['day'] = parts['day'];
    }
    if (typeof(parts['starthours']) != 'undefined') {
      result['starthours'] = {};

      if ((typeof(parts['starthours'][0]) != 'undefined') && (!empty(parts['starthours'][0]))) {
        var hours = parseInt(parts['starthours'][0]);
        if (hours > 0) {
          hours = '' + hours + '00';
        }
        result['starthours']['hours'] = hours;
      }
      if ((typeof(parts['starthours'][1]) != 'undefined') && (!empty(parts['starthours'][1]))) {
        result['starthours']['minutes'] = parts['starthours'][1];
      }
      if ((typeof(parts['starthours'][2]) != 'undefined') && (!empty(parts['starthours'][2]))) {
        result['starthours']['ampm'] = parts['starthours'][2];
      }
    }
    if (typeof(parts['endhours']) != 'undefined') {
      result['endhours'] = {};

      if ((typeof(parts['endhours'][0]) != 'undefined') && (!empty(parts['endhours'][0]))) {
        var hours = parseInt(parts['endhours'][0]);
        if (hours > 0) {
          hours = '' + hours + '00';
        }
        result['endhours']['hours'] = hours;
      }
      if ((typeof(parts['endhours'][1]) != 'undefined') && (!empty(parts['endhours'][1]))) {
        result['endhours']['minutes'] = parts['endhours'][1];
      }
      if ((typeof(parts['endhours'][2]) != 'undefined') && (!empty(parts['endhours'][2]))) {
        result['endhours']['ampm'] = parts['endhours'][2];
      }
    }
    if ((typeof(parts['comment']) != 'undefined') && (!empty(parts['comment']))) {
      result['comment'] = parts['comment'];
    }

    return result;
  }
  catch (error) {
    console.log('office_hours_assemble_form_state_into_field - ' + error);
  }
}


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

