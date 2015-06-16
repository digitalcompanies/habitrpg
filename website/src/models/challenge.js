var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var shared = require('../../../common');
var _ = require('lodash');
var plugins = require('./plugins');
var Task = require('./task').model;

var ChallengeSchema = new Schema({
  _id: {type: String, 'default': shared.uuid},
  name: String,
  shortName: String,
  description: String,
  official: {type: Boolean,'default':false},
  leader: {type: String, ref: 'User'},
  group: {type: String, ref: 'Group'},
  timestamp: {type: Date, 'default': Date.now},
  members: [{type: String, ref: 'User'}],
  memberCount: {type: Number, 'default': 0},
  prize: {type: Number, 'default': 0}
});

ChallengeSchema.methods.toJSON = function(){
  var doc = this.toObject();
  doc._isMember = this._isMember;
  return doc;
}

// --------------
// Syncing logic
// --------------

function syncableAttrs(task) {
  var t = (task.toObject) ? task.toObject() : task; // lodash doesn't seem to like _.omit on EmbeddedDocument
  // only sync/compare important attrs
  var omitAttrs = 'challenge history tags completed streak notes'.split(' ');
  if (t.type != 'reward') omitAttrs.push('value');
  return _.omit(t, omitAttrs);
}

/**
 * Syncs all new tasks, deleted tasks, etc to the user object
 */
ChallengeSchema.methods.updateAttrs = function(attrs, cb) {
  var self = this;

  // Update the challenge top-level attrs
  _.merge(this, _.pick(attrs, 'name shortName description date'.split(' ')));
  this.shortName = this.shortName || this.name;
  this.save(cb);

  // sync tasks

  _.each(this.tasks, function(task){
    // deletion
    if (!attrs[task.type+'s'][task._id]) {
      //TODO handle order?
      Task.update({_id:task._id}, {$set:{'challenge.broken':'TASK_DELETED'}});

    // updates
    } else if (syncableAttrs(task)!== syncableAttrs(attrs[task.type+'s'][task._id])) {

      //TODO stream
      Task.find({_id:task._id}, function(userTask){
        if (!userTask.notes) userTask.notes = task.notes; // don't override the notes, but provide it if not provided
        userTask.challenge = {id:self._id};
        userTask.tags = userTask.tags || {};
        userTask.tags[self._id] = true;
        _.merge(userTask, syncableAttrs(task));
      })

    }
  });
  _.each(_.defaults({},attrs.habits,attrs.dailys,attrs.todos,attrs.rewards), function(task){
    if (!this[task.type+'s'][task._id]) {
      //addition
      _.each(self.members, function(uid){
        Task.create(_.defaults({_owner:uid,_parent:self._id}, task));
      })
    }
  })


  // Save user attrs

  //TODO stream
  User.find({_id:{$in:self.members}}).select('challenges tags').exec(function(user){
    // Add challenge to user.challenges
    if (!_.contains(user.challenges, self._id)) {
      user.challenges.push(self._id);
    }

    // Sync tags
    var tags = user.tags || [];
    var i = _.findIndex(tags, {id: self._id})
    if (~i) {
      if (tags[i].name !== self.shortName) {
        // update the name - it's been changed since
        user.tags[i].name = self.shortName;
      }
    } else {
      user.tags.push({
        id: self._id,
        name: self.shortName,
        challenge: true
      });
    }

    user.save();
  })
};

plugins.taskHelpers(ChallengeSchema, 'Challenge');

module.exports.schema = ChallengeSchema;
module.exports.model = mongoose.model("Challenge", ChallengeSchema);
