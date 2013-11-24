var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var helpers = require('habitrpg-shared/script/helpers');
var _ = require('lodash');
var TaskSchemas = require('./task');
var Group = require('./group').model;

var StatisticSchema = new Schema({
  _id: {type: String, 'default': helpers.uuid},
  name: String,
  description: String,
  value: {type: Number, 'default': 0}
});


module.exports.schema = StatisticSchema;
module.exports.model = mongoose.model("Statistics", StatisticSchema);
