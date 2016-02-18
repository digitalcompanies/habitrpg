"use strict";

habitrpg.controller("UserCtrl", ['$rootScope', '$scope', '$location', 'User', '$http', '$state', 'Guide', 'Shared', 'Content', 'Stats', 'Social', 'Inventory',
  function($rootScope, $scope, $location, User, $http, $state, Guide, Shared, Content, Stats, Social, Inventory) {
    $scope.profile = User.user;

    $scope.statCalc = Stats;

    $scope.loadWidgets = Social.loadWidgets;

    $scope.ownsSet = Inventory.ownsSet;
    $scope.unlock = Inventory.unlock;

    $scope.hideUserAvatar = function() {
      $(".userAvatar").hide();
    };

    $scope.$watch('_editing.profile', function(value){
      if(value === true) $scope.editingProfile = angular.copy(User.user.profile);
    });

    $scope.allocate = function(stat){
      User.user.ops.allocate({query:{stat:stat}});
    }

    $scope.changeClass = function(klass){
      if (!klass) {
        if (!confirm(window.env.t('sureReset')))
          return;
        return User.user.ops.changeClass({});
      }

      User.user.ops.changeClass({query:{class:klass}});
      $scope.selectedClass = undefined;
      Shared.updateStore(User.user);
      Guide.goto('classes', 0,true);
    }

    $scope.save = function(){
      var values = {};
      _.each($scope.editingProfile, function(value, key){
        // Using toString because we need to compare two arrays (websites)
        var curVal = $scope.profile.profile[key];
        if(!curVal || $scope.editingProfile[key].toString() !== curVal.toString())
          values['profile.' + key] = value;
      });
      User.set(values);
      $scope._editing.profile = false;
    }

    $scope.acknowledgeHealthWarning = function(){
      User.user.ops.update && User.set({'flags.warnedLowHealth':true});
    }

    $scope.setKeys = function(type,_set){
      return _.map(_set, function(v,k){
        return type+'.'+k;
      }).join(',');
    }

  }
]);
