"use strict";

window.habitrpg = angular.module('habitrpg',
    ['ngRoute', 'ngResource', 'ngSanitize', 'ui.bootstrap', 'ui.keypress',
      'syncServices', 'authServices', 'userServices', 'groupServices', 'memberServices', 'sharedServices', 'notificationServices', 'guideServices',])

  .constant("STORAGE_USER_ID", 'habitrpg-user')
  .constant("STORAGE_SETTINGS_ID", 'habit-mobile-settings')

  .config(['$routeProvider', '$httpProvider', 'STORAGE_SETTINGS_ID',
    function($routeProvider, $httpProvider, STORAGE_SETTINGS_ID) {
      $routeProvider
        //.when('/login', {templateUrl: 'views/login.html'})
        .when('/tasks',   {templateUrl: 'partials/tasks'})
        .when('/options', {templateUrl: 'partials/options'})

        .otherwise({redirectTo: '/tasks'});

      $httpProvider.defaults.headers.common['Content-Type'] = 'application/json;charset=utf-8';

      // Handle errors
      // FIXME make a proper errorNotificationServices service
      var interceptor = ['$rootScope', '$q', function ($rootScope, $q) {
        function success(response) {
          return response;
        }
        function error(response) {
          //var status = response.status;
          response.data = (response.data.err) ? response.data.err : response.data;
          if (response.status == 0) response.data = 'Server currently unreachable';
          if (response.status == 500) response.data += '(see Chrome console for more details).';
          $rootScope.flash.errors.push(response.status + ': ' + response.data);
          console.log(arguments);
          return $q.reject(response);
        }
        return function (promise) {
          return promise.then(success, error);
        }
      }];
      $httpProvider.responseInterceptors.push(interceptor);
  }])