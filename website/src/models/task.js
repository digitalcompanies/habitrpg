var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var shared = require('../../../common');
var _ = require('lodash');
var moment = require('moment');
var dictionaryPlugin = require('mongoose-dictionary')(mongoose);


//TODO use mongoose discriminator to create diff schemas
//TODO verify schema
var TaskSchema = new Schema({
  _id:{type: String,'default': shared.uuid},

  _owner: String, //// TODO ref:Dynamic (see mongoose 4.x)
    //{type: String}, // self, peer, challenge, template, group

  dateCreated: {type:Date, 'default':Date.now},
  text: String,
  notes: String,
  tags: {type: Schema.Types.Mixed, 'default': {}}, //{ "4ddf03d9-54bd-41a3-b011-ca1f1d2e9371" : true },
  value: {type: Number, 'default': 0}, // redness
  priority: {type: Number, 'default': 1},
  attribute: {type: String, 'default': "str", enum: ['str','con','int','per']},
  sort: {type: Number},
  type: {type:String, 'default': 'habit'},

  frequency: {type: String, 'default': 'weekly', enum: ['daily', 'weekly']},
  everyX: {type: Number, 'default': 1}, // e.g. once every X weeks
  startDate: {type: Date, 'default': moment().startOf('day').toDate()},

  //challenge: {
  //  broken: String, // CHALLENGE_DELETED, TASK_DELETED, UNSUBSCRIBED, CHALLENGE_CLOSED
  //  winner: String // user.profile.name
  //  // group: {type: 'Strign', ref: 'Group'} // if we restore this, rename `id` above to `challenge`
  //}

  // Habits
  history: Array, // habits+dailies. Note [{date:Date, value:Number}] causes major performance problems
  up: {type: Boolean, 'default': true},
  down: {type: Boolean, 'default': true},

  // Dailies
  repeat: {
    m:  {type: Boolean, 'default': true},
    t:  {type: Boolean, 'default': true},
    w:  {type: Boolean, 'default': true},
    th: {type: Boolean, 'default': true},
    f:  {type: Boolean, 'default': true},
    s:  {type: Boolean, 'default': true},
    su: {type: Boolean, 'default': true}
  },

  checklist:[{ // dailies+todos
    completed: {type: Boolean, 'default': false},
    text: String,
    _id: {type: String, 'default': shared.uuid}, // @migration from id
  }],

  // To-Dos
  due: {}, //@migration from date(string) to Date // FIXME we're getting parse errors, people have stored as "today" and "3/13". Need to run a migration & put this back to type: Date

}, {
  toObject: { virtuals: true },
  toJSON: { virtuals: true }
});

TaskSchema.plugin(dictionaryPlugin, {
  fields: {
    members: {
      text: String,
      notes: String,
      tags: {type: Schema.Types.Mixed, 'default': {}}, //{ "4ddf03d9-54bd-41a3-b011-ca1f1d2e9371" : true },
      value: {type: Number, 'default': 0}, // redness
      sort: Number,
      history: Array,
      completed: {type: Boolean, 'default': false}, //dailies+todos
      collapseChecklist: {type:Boolean, 'default':false}, // dailies+todos
      streak: {type: Number, 'default': 0},
      dateCompleted: Date,
      archived: {type:Boolean, 'default':false},
      approval: Number,

      checklist: {type: Schema.Types.Mixed }
    }
  }
});

TaskSchema.virtual('id').get(function(){
  return this._id; // legacy api support
})

TaskSchema.pre('save', function(next){
  //TODO prune history
  next();
})


module.exports.schema = TaskSchema;
module.exports.model = mongoose.model("Task", TaskSchema);