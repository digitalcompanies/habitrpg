'use strict';

/**
 * Services that persists and retrieves user from localStorage.
 */

var facebook = {}

angular.module('authServices').
  factory('Auth', ['$http', '$location', 'API_URL', 'Sync',
    function($http, $location, API_URL, Sync) {

    var auth = Sync.sync.auth;

    var errorAlert = function(data, status, headers, config) {
      if (status === 0) {
        alert("Server not currently reachable, try again later");
      } else if (!!data && !!data.err) {
        alert(data.err);
      } else {
        alert("ERROR: " + status);
      }
    }

    var authServices = {
      authenticate: function (uuid, token, refresh) {
        if (!!uuid && !!token) {
          $http.defaults.headers.common['x-api-user'] = uuid;
          $http.defaults.headers.common['x-api-key'] = token;
          auth.apiId = uuid; // why are we using apiId here instead of _id?
          auth.apiToken = token;
          Sync.sync.online = true;
          Sync.save();
          if (refresh) window.location.href = '/#/tasks';
        } else {
          alert('Please enter your ID and Token.')
        }
      },

      /**
       * Use username & password instead of uuid & apiToken (above)
       */
      login: function(username, password, refresh){
        var data = {username:username, password:password},
          self = this;
        $http.post(API_URL + "/api/v1/user/auth/local", data)
          .success(function(data, status, headers, config) {
            self.authenticate(data._id, data.token, refresh);
          }).error(errorAlert);
      },

      register: function(vals, refresh){
        var self = this;
        $http.post(API_URL + "/api/v1/register", vals)
          .success(function(data, status, headers, config) {
            self.authenticate(data.id, data.apiToken, refresh);
          }).error(errorAlert);
      },

      resetPassword: function(email){
        $http.post(API_URL + '/api/v1/user/reset-password', {email:email})
          .success(function(){
            alert('New password sent.');
          })
          .error(function(data){
            alert(data.err);
          });
      },

      authenticated: function(){
        return !_.isEmpty(auth.apiId);
      },

      logout: function(){
        localStorage.clear();
        window.location.href = '/logout';
      }
    }

    //If user does not have ApiID that forward him to settings.
    if (!auth.apiId || !auth.apiToken) {
      $http.defaults.headers.common['x-api-user'] = auth.apiId;
      $http.defaults.headers.common['x-api-key'] = auth.apiToken;

      //var search = $location.search(); // FIXME this should be working, but it's returning an empty object when at a root url /?_id=...
      var search = $location.search(window.location.search.substring(1)).$$search; // so we use this fugly hack instead
      if (search.err) return alert(search.err);
      if (search._id && search.apiToken) {
        authServices.authenticate(search._id, search.apiToken, function(){
          window.location.href='/';
        });
      } else {
        if (window.location.pathname.indexOf('/static') !== 0){
          authServices.logout();
        }
      }
    } else {
      authServices.authenticate(auth.apiId, auth.apiToken)
    }

    return authServices;

  //TODO FB.init({appId: '${section.parameters['facebook.app.id']}', status: true, cookie: true, xfbml: true});
    /*facebook.handleStatusChange = function(session) {
        if (session.authResponse) {

            FB.api('/me', {
                fields: 'name, picture, email'
            }, function(response) {
                console.log(response.error)
                if (!response.error) {

                    var data = {
                        name: response.name,
                        facebook_id: response.id,
                        email: response.email
                    }

                    $http.post(API_URL + '/api/v1/user/auth/facebook', data).success(function(data, status, headers, config) {
                        User.authenticate(data.id, data.token, function(err) {
                            if (!err) {
                                alert('Login successful!');
                                $location.path("/habit");
                            }
                        });
                    }).error(function(response) {
                        console.log('error')
                    })

                } else {
                    alert('napaka')
                }
                //clearAction();
            });
        } else {
            document.body.className = 'not_connected';
            //clearAction();
        }
    }

    return {

        authUser: function() {
            FB.Event.subscribe('auth.statusChange', facebook.handleStatusChange);
        },

        getAuth: function() {
            return auth;
        },

        login: function() {

            FB.login(null, {
                scope: 'email'
            });
        },

        logout: function() {
            FB.logout(function(response) {
                window.location.reload();
            });
        }
    }*/
  }
]);