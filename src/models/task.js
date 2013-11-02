// User.js
// =======
// Defines the user data model (schema) for use via the API.

// Dependencies
// ------------
var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var helpers = require('habitrpg-shared/script/helpers');
var _ = require('lodash');

// Task Schema
// -----------
var TaskEmbed = {
  //id:{type: String}, // this needs to == _id
  _id:{type: String,'default': helpers.uuid},
  text: String,
  notes: {type: String, 'default': ''},
  tags: {type: Schema.Types.Mixed, 'default': {}}, //{ "4ddf03d9-54bd-41a3-b011-ca1f1d2e9371" : true },
  value: {type: Number, 'default': 0},
  priority: {type: String, 'default': '!'}, //'!!' // FIXME this should be a number or something
  challenge: {
    id: String, // {type: 'String', ref:'Challenge'}, // We don't use this for lookup, it's just used in comparisons & ifs
    broken: String, // CHALLENGE_DELETED, TASK_DELETED, UNSUBSCRIBED, CHALLENGE_CLOSED
    winner: String // user.profile.name
    // group: {type: 'Strign', ref: 'Group'} // if we restore this, rename `id` above to `challenge`
  }
};

var HabitEmbed = _.defaults({
  type: {type:String, 'default': 'habit'},
  up: {type: Boolean, 'default': true},
  down: {type: Boolean, 'default': true},
  history: [{date:Date, value:Number}]

}, TaskEmbed);

var DailyEmbed = _.defaults({
  type: {type:String, 'default': 'daily'},
  completed: {type: Boolean, 'default': false},
  repeat: {type: Schema.Types.Mixed, 'default': {m:1, t:1, w:1, th:1, f:1, s:1, su:1} },
  streak: {type: Number, 'default': 0},
  history: [{date:Date, value:Number}]

}, TaskEmbed);

var TodoEmbed = _.defaults({
  type: {type:String, 'default': 'todo'},
  completed: {type: Boolean, 'default': false}

}, TaskEmbed);

var RewardEmbed = _.defaults({
  type: {type:String, 'default': 'reward'}

}, TaskEmbed);


module.exports = {
  HabitEmbed: HabitEmbed,
  DailyEmbed: DailyEmbed,
  TodoEmbed: TodoEmbed,
  RewardEmbed: RewardEmbed
};