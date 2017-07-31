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
