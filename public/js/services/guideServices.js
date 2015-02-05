'use strict';

/**
 * Services for each tour step when you unlock features
 */

angular.module('habitrpg').factory('Guide',
['$rootScope', 'User', '$timeout', '$state',
function($rootScope, User, $timeout, $state) {
  /**
   * Init and show the welcome tour. Note we do it listening to a $rootScope broadcasted 'userLoaded' message,
   * this because we need to determine whether to show the tour *after* the user has been pulled from the server,
   * otherwise it's always start off as true, and then get set to false later
   */
  $rootScope.$on('userUpdated', initTour);
  function initTour(){
    if (User.user.flags.showTour === false) return;
    var tourSteps = [
      {
        intro: window.env.t('welcomeHabitT1') + " <a href='http://www.kickstarter.com/profile/1823740484' target='_blank'>Justin</a>, " + window.env.t('welcomeHabitT2'),
      }, {
        element: ".main-herobox",
        intro: window.env.t('yourAvatarText'),
        position: 'right'
      }, {
        element: ".main-herobox",
        intro: window.env.t('avatarCustomText'),
        position: 'right'
      }, {
        element: ".hero-stats",
        intro: window.env.t('hitPointsText'),
        position: 'right'
      }, {
        element: ".hero-stats",
        intro: window.env.t('expPointsText'),
      }, {
        element: "ul.habits",
        intro: window.env.t('typeGoalsText'),
        position: "top"
      }, {
        element: "ul.habits",
        intro: window.env.t('tourHabits'),
        position: "top"
      }, {
        element: "ul.dailys",
        intro: window.env.t('tourDailies'),
        position: "top"
      }, {
        element: ".todo-wrapper",
        intro: window.env.t('tourTodos'),
        position: "top",
      }, {
        element: "ul.main-list.rewards",
        intro: window.env.t('tourRewards'),
        position: "top"
      }, {
        element: "ul.habits li:first-child",
        intro: window.env.t('hoverOverText'),
        position: "right"
      }, {
        intro: window.env.t('unlockFeaturesT1') + " <a href='http://habitrpg.wikia.com' target='_blank'>" + window.env.t('habitWiki') + "</a> " + window.env.t('unlockFeaturesT2'),
        position: "right"
      }
    ];
    _.each(tourSteps, function(step) {
      step.intro = "<div><div class='" + (env.worldDmg.guide ? "npc_justin_broken" : "npc_justin") + " float-left'></div>" + step.intro + "</div>";
    });
    var intro = introJs();
    intro.setOptions({
      scrollToElement:true,
      steps:tourSteps,
      showStepNumbers: false,
      doneLabel: window.env.t('endTour')
    }).oncomplete(function(){
      User.set({'flags.showTour': false});
    })
    intro.start(); // Tour doesn't quite mesh with our handling of flags.showTour, just restart it on page load
  };

  var alreadyShown = function(before, after) {
    return !(!before && after === true);
  };

  var showPopover = function(selector, title, html, placement) {
    if (!placement) placement = 'bottom';
    $(selector).popover('destroy');
    var button = "<button class='btn btn-sm btn-default' onClick=\"$('" + selector + "').popover('hide');return false;\">" + window.env.t('close') + "</button>";
    if (env.worldDmg.guide) {
      html = "<div><div class='npc_justin_broken float-left'></div>" + html + '<br/>' + button + '</div>';
    } else {
      html = "<div><div class='npc_justin float-left'></div>" + html + '<br/>' + button + '</div>';
    }
    $(selector).popover({
      title: title,
      placement: placement,
      trigger: 'manual',
      html: true,
      content: html
    }).popover('show');
  };

  $rootScope.$watch('user.flags.customizationsNotification', function(after, before) {
    if (alreadyShown(before, after)) return;
    showPopover('.main-herobox', window.env.t('customAvatar'), window.env.t('customAvatarText'), 'bottom');
  });

  $rootScope.$watch('user.flags.itemsEnabled', function(after, before) {
    if (alreadyShown(before, after)) return;
    var html = window.env.t('storeUnlockedText');
    showPopover('div.rewards', window.env.t('storeUnlocked'), html, 'left');
  });

  $rootScope.$watch('user.flags.partyEnabled', function(after, before) {
    if (alreadyShown(before, after)) return;
    var html = window.env.t('partySysText');
    showPopover('.user-menu', window.env.t('partySys'), html, 'bottom');
  });

  $rootScope.$watch('user.flags.dropsEnabled', function(after, before) {
    if (alreadyShown(before, after)) return;
    var eggs = User.user.items.eggs || {};
    if (!eggs) {
      eggs['Wolf'] = 1; // This is also set on the server
    }
    $rootScope.openModal('dropsEnabled');
  });

  $rootScope.$watch('user.flags.rebirthEnabled', function(after, before) {
      if (alreadyShown(before, after)) return;
      $rootScope.openModal('rebirthEnabled');
  });


  /**
   * Classes Tour
   */
  function classesTour(){

    // TODO notice my hack-job `onShow: _.once()` functions. Without these, the syncronous path redirects won't properly handle showing tour
    var tourSteps = [
      {
        path: '/#/options/inventory/equipment',
        onShow: _.once(function(tour){
          $timeout(function(){tour.goTo(0)});
        }),
        element: '.equipment-tab',
        title: window.env.t('classGear'),
        content: window.env.t('classGearText', {klass: User.user.stats.class})
      },
      {
        path: '/#/options/profile/stats',
        onShow: _.once(function(tour){
          $timeout(function(){tour.goTo(1)});
        }),
        element: ".allocate-stats",
        title: window.env.t('stats'),
        content: window.env.t('classStats'),
      }, {
        element: ".auto-allocate",
        title: window.env.t('autoAllocate'),
        placement: 'left',
        content: window.env.t('autoAllocateText'),
      }, {
        element: ".meter.mana",
        title: window.env.t('spells'),
        content: window.env.t('spellsText') + " <a target='_blank' href='http://habitrpg.wikia.com/wiki/Todos'>" + window.env.t('toDo') + "</a>."
      }, {
        orphan: true,
        title: window.env.t('readMore'),
        content: window.env.t('moreClass') + " <a href='http://habitrpg.wikia.com/wiki/Class_System' target='_blank'>Wikia</a>."
      }
    ];
    _.each(tourSteps, function(step){
      if (env.worldDmg.guide) {
        step.content = "<div><div class='npc_justin_broken float-left'></div>" + step.content + "</div>";
      } else {
        step.content = "<div><div class='npc_justin float-left'></div>" + step.content + "</div>";
      }
    });
    $('.allocate-stats').popover('destroy');
    var tour = new Tour({
//        onEnd: function(){
//          User.set({'flags.showTour': false});
//        }
    });
    tourSteps.forEach(function(step) {
      tour.addStep(_.defaults(step, {html: true}));
    });
    tour.restart(); // Tour doesn't quite mesh with our handling of flags.showTour, just restart it on page load
    //tour.start(true);
  };

  return {
    initTour: initTour,
    classesTour: classesTour
  };
}]);
