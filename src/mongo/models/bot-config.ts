'use strict';

var mongoose     = require('mongoose');

var botConfigSchema = new mongoose.Schema({

}, { strict: false });


module.exports = mongoose.model('botConfig', botConfigSchema);
