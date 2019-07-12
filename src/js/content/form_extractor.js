/*global jQuery, Rule, Logger, Utils, OptimalSelect */
/* eslint no-unused-vars: 0 */
var FormExtractor = {
  _knownElements: null,
  knownElements: function() {
    if (this._knownElements) {
      return this._knownElements;
    }
    var inputs = [
      "text",
      "checkbox",
      "image",
      "password",
      "radio",
      "search",
      "email",
      "url",
      "tel",
      "number",
      "range",
      "date",
      "month",
      "week",
      "time",
      "datetime",
      "datetime-local",
      "color",
    ];

    // Other extractable tags including the "input" element without a type which
    // defaults to "type=text"
    // See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Input#Form_%3Cinput%3E_types
    var tags = ["button", "textarea", "select", "input"];
    this._knownElements = inputs.map(function(inputType) {
      return "input[type=" + inputType + "]";
    });
    this._knownElements = this._knownElements.concat(tags);
    return this._knownElements;
  },
  extract: function(domNodeStartExtractionHere) {
    var extractor = this;
    var $form = jQuery(domNodeStartExtractionHere);
    var ruleData = {
      url: document.location.href,
      name: "A rule for " + document.location.href,
      fields: [],
    };

    this.knownElements().forEach(function(selector) {
      Logger.info("[form_extractor.js] Looking for '" + selector + "'");
      $form.find(selector).each(function() {
        Logger.info(
          "[form_extractor.js] Found a '" + this.type + "' (" + this.value + ") <" + this.name + ">"
        );
        var value = extractor._valueFor(this);
        // Only include field if value !== null
        if (value !== null) {
          // Find shortest selector for element
          var optimalSelect = OptimalSelect.select(this, {
            priority: ["id", "name", "class", "href", "src"],
          })
            .replace(/\"/g, "'")
            .replace(/\\\//g, "/");

          var field = {
            selector: optimalSelect,
            value: value,
          };
          ruleData.fields.push(field);
        }
      });
    });

    return Rule.create(ruleData).prettyPrint();
  },
  _valueFor: function(domNode) {
    var method = this._method("value", domNode);
    return method(domNode);
  },
  _valueCheckbox: function(domNode) {
    // if checked include the checkbox in the rule
    return domNode.checked ? true : false;
  },
  _valueRadio: function(domNode) {
    // if checked include the radiobutton in the rule
    return domNode.checked ? domNode.value : null;
  },
  _valueSelectOne: function(domNode) {
    return (
      jQuery(domNode)
        .find("option:selected")
        .eq(0)
        .val() || ""
    );
  },
  _valueSelectMultiple: function(domNode) {
    var values = jQuery(domNode)
      .find("option:selected")
      .map(function() {
        return this.value;
      })
      .get();
    return values || [];
  },
  _valueDefault: function(domNode) {
    return domNode.value;
  },
  _method: function(prefix, domNode) {
    var valueMethod = this[this._typeMethod(prefix, domNode.type)];
    // Default is to set the value of the field if
    // no special function is defined for that type
    if (typeof valueMethod !== "function") {
      valueMethod = this["_" + prefix + "Default"];
    }
    return valueMethod;
  },
  _typeMethod: function(prefix, type) {
    return ("_" + prefix + "-" + type).replace(/(\-[a-z])/g, function($1) {
      return $1.toUpperCase().replace("-", "");
    });
  },
};
