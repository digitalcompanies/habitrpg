'use strict';

/**
 * Services that persists and retrieves user from localStorage.
 */

angular.module('userServices', []).
    factory('User', ['$rootScope', '$http', '$location', 'API_URL', 'STORAGE_USER_ID', 'Auth', 'Sync', 'Members',
      function($rootScope, $http, $location, API_URL, STORAGE_USER_ID, Auth, Sync, Members) {

        var user = {}; // this is stored as a reference accessible to all controllers, that way updates propagate

        //first we populate user with schema
        _.extend(user, window.habitrpgShared.helpers.newUser());
        user.apiToken = user._id = ''; // we use id / apitoken to determine if registered

        //than we try to load localStorage
        if (localStorage.getItem(STORAGE_USER_ID)) {
          _.extend(user, JSON.parse(localStorage.getItem(STORAGE_USER_ID)));
        }


        var userServices = {
            user: user,

            save: function () {
              localStorage.setItem(STORAGE_USER_ID, JSON.stringify(user));
            },

            log: function (action) {
              var self = this;
              //push by one buy one if an array passed in.
              if (_.isArray(action)) {
                action.forEach(function (a) {
                  settings.sync.queue.push(a);
                });
              } else {
                settings.sync.queue.push(action);
              }

              this.save();
              Sync.flush(user, function(data, status, headers, config){
                //we can't do user=data as it will not update user references in all other angular controllers.

                // the user has been modified from another application, sync up
                if(data.wasModified) {
                  delete data.wasModified;
                  _.extend(user, data);
                }
                user._v = data._v;

                // FIXME handle this somewhere else, we don't need to check every single time
                var offset = moment().zone(); // eg, 240 - this will be converted on server as -(offset/60)
                if (!user.preferences.timezoneOffset || user.preferences.timezoneOffset !== offset) {
                  self.set('preferences.timezoneOffset', offset);
                }
                Members.populate(user);
              });
            },

            /*
             Very simple path-set. `set('preferences.gender','m')` for example. We'll deprecate this once we have a complete API
             */
            set: function(k, v) {
              var log = { op: 'set', data: {} };
              window.habitrpgShared.helpers.dotSet(k, v, this.user);
              log.data[k] = v;
              this.log(log);
            },

            setMultiple: function(obj){
              var self = this;
              var log = { op: 'set', data: {} };
              _.each(obj, function(v,k){
                window.habitrpgShared.helpers.dotSet(k, v, self.user);
                log.data[k] = v;
              });
              self.log(log);
            }
        };

        /**
         * Upon initial authentication, fetch the full user object
         */
        $rootScope.$on('authenticated', function(event){
          if (user && user._v) user._v--; // shortcut to always fetch new updates on page reload
          userServices.log({});
        })

        return userServices;
    }
]);
