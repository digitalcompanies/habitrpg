db.users.find({},function(user){
  // Make sure things are cast properly, Derby cruft (see https://github.com/HabitRPG/habitrpg/blob/4e8918818ab4ea66380fb0e8c6b349697c7c372c/common/script/index.coffee#L1019)
  user.stats.gp = +user.stats.gp;
  user.stats.hp = +user.stats.hp;
  user.stats.exp = +user.stats.exp;

  //FIXME
  _.each(user.tasks, function(task){
    task.value = +task.value;
    task.streak = ~~task.streak;
    task.priority = task.priority || 1;
  })
})