'use strict';

/**
 * Services that persists and retrieves user from localStorage.
 */

angular.module('habitrpg').factory('Trello',
['User', function(User) {
  var T = {
    onAuthorize: function(){
      Trello.members.get("me", function(member){
        T.member = member;
        Trello.get("members/me/cards", function(cards) {
          T.cards = cards;

          _.each(cards, function(c){
            User.user.todos.push({
              id: c.id,
              text: c.name,
              notes: c.desc,
              //tags: ??
              value: 0,
              priority: 1,
              attribute: 'str',
              challenge: {},
              type: 'todo',
              completed: false,
              //dateCompleted: Date,
              date: c.due,
              //collapseChecklist:collapseChecklist,
              //checklist:checklist
            })
          });

        });
      });
    },
    login: function(){
      Trello.authorize({
        type: "popup",
        success: Trello.onAuthorize
      })
    },
    logout: function(){
      Trello.deauthorize();
      T.member = {};
      T.cards = [];
    },
    cards: [],
    member: {}
  }
  $.getScript('https://api.trello.com/1/client.js?key=459a4d4c83893e0465a7907b25a41ebb', function(){
    Trello.authorize({
      interactive:false,
      success: T.onAuthorize
    });
  });
  return T;
}]);
