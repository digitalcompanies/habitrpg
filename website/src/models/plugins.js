var _ = require('lodash');
var async = require('async');

function taskHelpers (schema, modelName) {

  modelName!=='User' && schema.virtual('tasks').get(function(){
    return _.defaults({},this.habits,this.dailys,this.todos,this.rewards);
  })

  schema.statics.withTasks = function (q, cb) {
    q = _.isString(q) ? {_id:q} : q;
    async.waterfall([
      function(cb2){
        mongoose.model(modelName).findOne(q, cb2);
      },
      function(obj, cb2){
        if (!obj) return cb2({code:404, message: modelName + " not found"});
        obj.populateTasks(cb2);
      }
    ], cb);
  };

  schema.methods.populateTasks = function(cb){
    var self = this;
    async.waterfall([
      function(cb2){
        mongoose.model("Task").find({_owner: self._id}, cb2);
      },
      function(tasks, cb2){
        _.each(['habit', 'daily', 'todo', 'reward'], function(type){
          self[type+'s'] = _.reduce(tasks, function(m,v){
            if (v.type==type) m[v._id]=v; return m;
          }, {});
        });
        console.log(self);
        cb2(null, self);
      }
    ], cb);
  }


  schema.methods.validateTasks = function(){
    var self = this;
    _.each( _.defaults({},self.habits,self.todos,self.dailys,self.rewards), function(v,k){
      if (v.isModified && v.isModified()) {
        v.save();
      } else if (!v.isModified || v.isNew) { // is POJO or new model
        var task = new Task(v);
        task._owner=self._id;
        task.emit('new', task);
        //task.members.$add(self._id, v.members || {});
        //console.log(task.members);
        task.save();
        self[v.type+'s'][k] = task;
      }
    })
  }
}

module.exports = exports = {
  taskHelpers: taskHelpers
};