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

