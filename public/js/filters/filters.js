angular.module('habitrpg')
  .filter('gold', function () {
    return function (gp) {
      return Math.floor(gp);
    }
  })
  .filter('silver', function () {
    return function (gp) {
      return Math.floor((gp - Math.floor(gp))*100);
    }
  })
//  .filter('todosFilter', function(){
//    return function(task, scope) {
//      return (task.type == 'todo') ? ((scope.list && scope.list.showCompleted) ? !task.completed : task.completed) : true;
//    }
//  })
