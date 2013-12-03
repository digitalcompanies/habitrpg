var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var User = require('./../models/user').model;
var Group = require('./../models/group').model;
var Challenge = require('./../models/group').model;
var helpers = require('habitrpg-shared/script/helpers');
var async = require('async');
var moment = require('moment');
var _ = require('lodash');

var StatisticSchema = new Schema({
  _id: {type: String, 'default': helpers.uuid},
  registered: {type: Number, 'default': 0},
  active: {type: Number, 'default': 0},
  parties: {type: Number, 'default': 0},
  guilds: {type: Number, 'default': 0},
  challenges: {type: Number, 'default': 0}
});

StatisticSchema.statics.updateStats = function(){
  var _this = this;
  var _stats;
  async.waterfall([
    function(cb){
      _this.findById('habitrpg', function(err, found){
        if (err) return cb(err);
        if (found) return cb(null, found);
        module.exports.model.create({_id:'habitrpg'}, cb); //defaults will kick in
      });
    },
    function(found, cb) {
      _stats = found;
      async.parallel([
        // Registered
        function(cb2) {
          User.count(cb2);
        },
        // Active
        function(cb2) {
          var twoWeeksAgo = +moment().subtract(14, 'days');
          // TODO this method of determining "active users" is highly-debatable, I'm very open for suggestions
          User.count({'auth.timestamps.created':{$lt:twoWeeksAgo}, lastCron:{$gt:twoWeeksAgo}}, cb2);

          // Maybe more accurate?:
//          User.count({
//            'auth.timestamps.created': {$exists:true},
//            $where: function(){
//              return
//                // Has been active at some point
//                (Math.abs(moment(this.lastCron).diff(this.auth.timestamps.created, 'd')) > 14) &&
//                // And has logged in recently
//                moment(item.lastCron).isAfter(twoWeeksAgo)
//            }
//          }, cb2);

        },
        // Parties
        function(cb2) {
          Group.count({type:'party'},cb2);
        },
        // Guilds
        function(cb2) {
          Group.count({type:'guild'},cb2);
        },
        // Challenges
        function(cb2) {
          Challenge.count(cb2);
        }
      ],cb);
    },
    function(results, cb) {
      _stats.registered = results[0];
      _stats.active = results[1];
      _stats.parties = results[2];
      _stats.guilds = results[3];
      _stats.challenges = results[4];
      _stats.save(cb);
    }
  ],function(err){
    if (err) throw err;
    // nothing otherwise, this is a background job
  });
}

module.exports.schema = StatisticSchema;
module.exports.model = mongoose.model("Statistics", StatisticSchema);
