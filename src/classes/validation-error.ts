'use strict';
var map = require('lodash/map');
var flatten = require('lodash/flatten');

function CustomValidationError (errors, options) {
  this.message = 'validation error';
  this.errors = errors;
  this.flatten = options.flatten;
  this.status = options.status;
  this.statusText = options.statusText;
};
CustomValidationError.prototype = Object.create(Error.prototype);

CustomValidationError.prototype.toString = function () {
  return JSON.stringify(this.toJSON());
};

CustomValidationError.prototype.toJSON = function () {
  if (this.flatten) return flatten(map(this.errors, 'messages'));
  return {
    status: this.status,
    statusText: this.statusText,
    errors: this.errors
  };
};

module.exports = CustomValidationError;
