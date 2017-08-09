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

