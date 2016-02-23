'use strict';

(function(){
  angular
    .module('habitrpg')
    .factory('Inventory', inventoryFactory);

  inventoryFactory.$inject = [
    'Content',
    'User',
  ];

  function inventoryFactory(Content, User) {

    var user = User.user;

    function ownsSet(type,_set) {
      return !_.find(_set,function(v,k){
        return !user.purchased || !user.purchased[type] || !user.purchased[type][k];
      });
    }

    /**
     * For gem-unlockable preferences, (a) if owned, select preference (b) else, purchase
     * @param path: User.preferences <-> User.purchased maps like User.preferences.skin=abc <-> User.purchased.skin.abc.
     *  Pass in this paramater as "skin.abc". Alternatively, pass as an array ["skin.abc", "skin.xyz"] to unlock sets
     */
    function unlock(path) {
      var fullSet = ~path.indexOf(',');
      var cost =
        ~path.indexOf('background.') ?
          (fullSet ? 3.75 : 1.75) : // (Backgrounds) 15G per set, 7G per individual
          (fullSet ? 1.25 : 0.5); // (Hair, skin, etc) 5G per set, 2G per individual

      if (path.indexOf('background.') > -1) {
        var bg = path.slice(11);
        if (Content.appearances.background[bg].timetravel) {
          return User.user.ops.unlock({query:{path:path}});
        }
      }
      if (fullSet) {
        if (confirm(window.env.t('purchaseFor',{cost:cost*4})) !== true) return;
        if (User.user.balance < cost) return $rootScope.openModal('buyGems');
      } else if (!User.user.fns.dotGet('purchased.' + path)) {
        if (confirm(window.env.t('purchaseFor',{cost:cost*4})) !== true) return;
        if (User.user.balance < cost) return $rootScope.openModal('buyGems');
      }
      User.user.ops.unlock({query:{path:path}})
    }

    return {
      ownsSet: ownsSet,
      unlock: unlock
    }
  }
}());
