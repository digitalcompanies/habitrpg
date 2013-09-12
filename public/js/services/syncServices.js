'use strict';

/**
 * Services that persists and retrieves user from localStorage.
 */

var facebook = {}

angular.module('syncServices').
  factory('Sync', ['$http', 'STORAGE_SETTINGS_ID', 'API_URL',
    function($http, $location, STORAGE_SETTINGS_ID, API_URL) {

    var defaultSettings = {
        auth: { apiId: '', apiToken: ''},
        sync: {
          queue: [], //here OT will be queued up, this is NOT call-back queue!
          sent: [] //here will be OT which have been sent, but we have not got reply from server yet.
        },
        fetching: false,  // whether fetch() was called or no. this is to avoid race conditions
        online: false,
        API_URL: '' // https://beta.habitrpg.com or what have you
      },
      sync = {}; //habit mobile settings (like auth etc.) to be stored here

    var syncServices = {

      save: function(){
        localStorage.setItem(STORAGE_SETTINGS_ID, JSON.stringify(sync));
      },

      /**
       * Flush the queue. If user object is provided, necessary user attrs will be sent up to the server
       * @param [optional] user
       * @param cb
       */
      flush: function(user, cb) {
        if (!cb) cb = user, user=undefined;

        var self = this;

        if (!sync.auth.apiToken) {
          return alert("Not authenticated, can't sync, go to settings first.");
        }

        var queue = sync.sync.queue;
        var sent = sync.sync.sent;
        if (queue.length === 0) {
          console.log('Sync: Queue is empty');
          return;
        }
        if (sync.fetching) {
          console.log('Sync: Already fetching');
          return;
        }
        if (sync.online!==true) {
          console.log('Sync: Not online');
          return;
        }

        sync.fetching = true;
        // move all actions from queue array to sent array
        _.times(queue.length, function () {
          sent.push(queue.shift());
        });

        $http.post(API_URL + '/api/v1/user/batch-update', sent, {params: {data:+new Date, _v: user && user._v}})
          .success(function (data, status, headers, config) {
            //make sure there are no pending actions to sync. If there are any it is not safe to apply model from server as we may overwrite user data.
            if (!queue.length && !!cb) {
              cb(data, status, headers, config);
            }
            sent.length = 0;
            sync.fetching = false;
            self.flush(); // call syncQueue to check if anyone pushed more actions to the queue while we were talking to server.
          })
          .error(function (data, status, headers, config) {
            //move sent actions back to queue
            _.times(sent.length, function () {
              queue.push(sent.shift())
            });
            sync.fetching = false;
            //Notification.push({type:'text', text:"We're offline"})
          });
      }
    }

    //load settings if we have them
    if (localStorage.getItem(STORAGE_SETTINGS_ID)) {
      //use extend here to make sure we keep object reference in other angular controllers
      _.extend(sync, JSON.parse(localStorage.getItem(STORAGE_SETTINGS_ID)));
      //if settings were saved while fetch was in process reset the flag.
      sync.fetching = false;

    //create and load if not
    } else {
      localStorage.setItem(STORAGE_SETTINGS_ID, JSON.stringify(defaultSettings));
      _.extend(sync, defaultSettings);
    }

    return syncServices;

  }
]);