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

