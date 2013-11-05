var elemMatch = {$elemMatch:{'challenge.id':{$exists:1}}};
db.users.find({},{habits: elemMatch, dailys: elemMatch, todos: elemMatch}).forEach(function(user){
  user.challengeScores = {};
  _.each(['habits', 'dailys', 'todos'], function(type){
    _.each(user[type], function(task){
      if (!user.challengeScores[task.challenge.id]) user.challengeScores[task.challenge.id] = 0;
      user.challengeScores[task.challenge.id] += task.value;
    })
  })
  db.users.update({_id:user._id}, {$set:{challengeScores: user.challengeScores}});
});