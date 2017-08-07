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

