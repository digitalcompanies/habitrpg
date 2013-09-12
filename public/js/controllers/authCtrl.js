"use strict";

/*
 The authentication controller (login & facebook)
 */

habitrpg.controller("AuthCtrl", ['$scope', '$rootScope', 'User', '$http', '$location', 'API_URL', 'Auth',
  function($scope, $rootScope, User, $http, $location, API_URL, Auth) {
    var showedFacebookMessage;
    $scope.Auth = Auth;
    $scope.useUUID = false;
    $scope.toggleUUID = function() {
      if (showedFacebookMessage === false) {
        alert("Until we add Facebook, use your UUID and API Token to log in (found at https://habitrpg.com > Options > Settings).");
        showedFacebookMessage = true;
      }
      $scope.useUUID = !$scope.useUUID;
    };

    $scope.register = function() {
      //TODO highlight invalid inputs
       //we have this as a workaround for https://github.com/HabitRPG/habitrpg-mobile/issues/64
      if ($scope.registrationForm.$invalid) return;
      Auth.register($scope.registerVals, true);
    };

    $scope.authenticate = function() {
      var id = $scope.loginUsername;
      var token = $scope.loginPassword;
      var authFn = ($scope.useUUID) ? Auth.authenticate : Auth.login;
      authFn(id, token, true);
    };

    $scope.playButtonClick = function(){
      if (Auth.authenticated()) {
        window.location.href = '/#/tasks';
      } else {
        $('#login-modal').modal('show');
      }
    }

  }
]);
