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

