_ = require 'lodash'
expect = require 'expect.js'
sinon = require 'sinon'
moment = require 'moment'
shared = require '../../common/script/index.js'
shared.i18n.translations = require('../../website/src/libs/i18n.js').translations
test_helper = require './test_helper'
test_helper.addCustomMatchers()
$w = (s)->s.split(' ')

### Helper Functions ####
newUser = (addTasks=true)->
  buffs = {per:0, int:0, con:0, str:0, stealth: 0, streaks: false}
  user =
    auth:
      timestamps: {}
    stats: {str:1, con:1, per:1, int:1, mp: 32, class: 'warrior', buffs: buffs}
    items:
      lastDrop:
        count: 0
      hatchingPotions: {}
      eggs: {}
      food: {}
      gear:
        equipped: {}
        costume: {}
        owned: {}
      quests: {}
    party:
      quest:
        progress:
          down: 0
    preferences: {
      autoEquip: true
    }
    dailys: []
    todos: []
    rewards: []
    flags: {}
    achievements:
      ultimateGearSets: {}
    contributor:
      level: 2
    _tmp: {}

  shared.wrap(user)
  user.ops.reset(null, ->)
  if addTasks
    _.each ['habit', 'todo', 'daily'], (task)->
      user.ops.addTask {body: {type: task, id: shared.uuid()}}
  user

rewrapUser = (user)->
  user._wrapped = false
  shared.wrap(user)
  user

# options.daysAgo: days ago when the last cron was executed
# cronAfterStart: moves the lastCron to be after the dayStart.
#  This way the daysAgo works as expected if the test case
#  makes the assumption that the lastCron was after dayStart.
beforeAfter = (options={}) ->
  user = newUser()
  [before, after] = [user, _.cloneDeep(user)]
  # avoid closure on the original user
  rewrapUser(after)
  before.preferences.dayStart = after.preferences.dayStart = options.dayStart if options.dayStart
  before.preferences.timezoneOffset = after.preferences.timezoneOffset = (options.timezoneOffset or moment().zone())
  if options.limitOne
    before["#{options.limitOne}s"] = [before["#{options.limitOne}s"][0]]
    after["#{options.limitOne}s"] = [after["#{options.limitOne}s"][0]]
  lastCron = moment(options.now || +new Date).subtract( {days:options.daysAgo} ) if options.daysAgo
  lastCron.add( {hours:options.dayStart, minutes:1} ) if options.daysAgo and options.cronAfterStart
  lastCron = +lastCron if options.daysAgo
  _.each [before,after], (obj) ->
    obj.lastCron = lastCron if options.daysAgo
  {before:before, after:after}
#TODO calculate actual points

expectLostPoints = (before, after, taskType) ->
  if taskType in ['daily','habit']
    expect(after.stats.hp).to.be.lessThan before.stats.hp
    expect(after["#{taskType}s"][0].history).to.have.length(1)
  else expect(after.history.todos).to.have.length(1)
  expect(after).toHaveExp 0
  expect(after).toHaveGP 0
  expect(after["#{taskType}s"][0].value).to.be.lessThan before["#{taskType}s"][0].value

expectGainedPoints = (before, after, taskType) ->
  expect(after.stats.hp).to.be 50
  expect(after.stats.exp).to.be.greaterThan before.stats.exp
  expect(after.stats.gp).to.be.greaterThan before.stats.gp
  expect(after["#{taskType}s"][0].value).to.be.greaterThan before["#{taskType}s"][0].value
  expect(after["#{taskType}s"][0].history).to.have.length(1) if taskType is 'habit'
  # daily & todo histories handled on cron

expectClosePoints = (before, after, taskType) ->
  expect( Math.abs(after.stats.exp - before.stats.exp) ).to.be.lessThan 0.0001
  expect( Math.abs(after.stats.gp - before.stats.gp) ).to.be.lessThan 0.0001
  expect( Math.abs(after["#{taskType}s"][0].value - before["#{taskType}s"][0].value) ).to.be.lessThan 0.0001

###### Specs ######

describe 'User', ->
  it 'sets correct user defaults', ->
    user = newUser()
    base_gear = { armor: 'armor_base_0', weapon: 'weapon_base_0', head: 'head_base_0', shield: 'shield_base_0' }
    buffs = {per:0, int:0, con:0, str:0, stealth: 0, streaks: false}
    expect(user.stats).to.eql { str: 1, con: 1, per: 1, int: 1, hp: 50, mp: 32, lvl: 1, exp: 0, gp: 0, class: 'warrior', buffs: buffs }
    expect(user.items.gear).to.eql { equipped: base_gear, costume: base_gear, owned: {weapon_warrior_0: true} }
    expect(user.preferences).to.eql { autoEquip: true, costume: false }

  it 'calculates max MP', ->
    user = newUser()
    expect(user).toHaveMaxMP 32
    user.stats.int = 10
    expect(user).toHaveMaxMP 50
    user.stats.lvl = 5
    expect(user).toHaveMaxMP 54
    user.stats.class = 'wizard'
    user.items.gear.equipped.weapon = 'weapon_wizard_1'
    expect(user).toHaveMaxMP 63

  it 'handles perfect days', ->
    user = newUser()
    user.dailys = []
    _.times 3, ->user.dailys.push shared.taskDefaults({type:'daily', startDate: moment().subtract(7, 'days')})
    cron = -> user.lastCron = moment().subtract(1,'days');user.fns.cron()

    cron()
    expect(user.stats.buffs.str).to.be 0
    expect(user.achievements.perfect).to.not.be.ok()

    user.dailys[0].completed = true
    cron()
    expect(user.stats.buffs.str).to.be 0
    expect(user.achievements.perfect).to.not.be.ok()

    _.each user.dailys, (d)->d.completed = true
    cron()
    expect(user.stats.buffs.str).to.be 1
    expect(user.achievements.perfect).to.be 1

    # Handle greyed-out dailys
    yesterday = moment().subtract(1,'days')
    user.dailys[0].repeat[shared.dayMapping[yesterday.day()]] = false
    _.each user.dailys[1..], (d)->d.completed = true
    cron()
    expect(user.stats.buffs.str).to.be 1
    expect(user.achievements.perfect).to.be 2

  describe 'Resting in the Inn', ->
    user = null
    cron = null

    beforeEach ->
      user = newUser()
      user.preferences.sleep = true
      cron = -> user.lastCron = moment().subtract(1, 'days');user.fns.cron()
      user.dailys = []
      _.times 2, -> user.dailys.push shared.taskDefaults({type:'daily', startDate: moment().subtract(7, 'days')})

    it 'remains in the inn on cron', ->
      cron()
      expect(user.preferences.sleep).to.be true

    it 'resets dailies', ->
       user.dailys[0].completed = true
       cron()
       expect(user.dailys[0].completed).to.be false

    it 'resets checklist on incomplete dailies', ->
       user.dailys[0].checklist = [
         {
           "text" : "1",
           "id" : "checklist-one",
           "completed" : true
         },
         {
           "text" : "2",
           "id" : "checklist-two",
           "completed" : true
         },
         {
           "text" : "3",
           "id" : "checklist-three",
           "completed" : false
         }
       ]
       cron()
       _.each user.dailys[0].checklist, (box)->
         expect(box.completed).to.be false

    it 'resets checklist on complete dailies', ->
       user.dailys[0].checklist = [
         {
           "text" : "1",
           "id" : "checklist-one",
           "completed" : true
         },
         {
           "text" : "2",
           "id" : "checklist-two",
           "completed" : true
         },
         {
           "text" : "3",
           "id" : "checklist-three",
           "completed" : false
         }
       ]
       user.dailys[0].completed = true
       cron()
       _.each user.dailys[0].checklist, (box)->
         expect(box.completed).to.be false

    it 'does not reset checklist on grey incomplete dailies', ->
      yesterday = moment().subtract(1,'days')
      user.dailys[0].repeat[shared.dayMapping[yesterday.day()]] = false
      user.dailys[0].checklist = [
        {
          "text" : "1",
          "id" : "checklist-one",
          "completed" : true
        },
        {
          "text" : "2",
          "id" : "checklist-two",
          "completed" : true
        },
        {
          "text" : "3",
          "id" : "checklist-three",
          "completed" : true
        }
      ]

      cron()
      _.each user.dailys[0].checklist, (box)->
        expect(box.completed).to.be true

    it 'resets checklist on complete grey complete dailies', ->
      yesterday = moment().subtract(1,'days')
      user.dailys[0].repeat[shared.dayMapping[yesterday.day()]] = false
      user.dailys[0].checklist = [
        {
          "text" : "1",
          "id" : "checklist-one",
          "completed" : true
        },
        {
          "text" : "2",
          "id" : "checklist-two",
          "completed" : true
        },
        {
          "text" : "3",
          "id" : "checklist-three",
          "completed" : true
        }
      ]
      user.dailys[0].completed = true

      cron()
      _.each user.dailys[0].checklist, (box)->
        expect(box.completed).to.be false

    it 'does not damage user for incomplete dailies', ->
      expect(user).toHaveHP 50
      user.dailys[0].completed = true
      user.dailys[1].completed = false
      cron()
      expect(user).toHaveHP 50

    it 'gives credit for complete dailies', ->
      user.dailys[0].completed = true
      expect(user.dailys[0].history).to.be.empty
      cron()
      expect(user.dailys[0].history).to.not.be.empty

    it 'damages user for incomplete dailies after checkout', ->
      expect(user).toHaveHP 50
      user.dailys[0].completed = true
      user.dailys[1].completed = false
      user.preferences.sleep = false
      cron()
      expect(user.stats.hp).to.be.lessThan 50

  describe 'Death', ->
    user = undefined
    it 'revives correctly', ->
      user = newUser()
      user.stats = { gp: 10, exp: 100, lvl: 2, hp: 0, class: 'warrior' }
      user.ops.revive()
      expect(user).toHaveGP 0
      expect(user).toHaveExp 0
      expect(user).toHaveLevel 1
      expect(user).toHaveHP 50
      expect(user.items.gear.owned).to.eql { weapon_warrior_0: false }

    it "doesn't break unbreakables", ->
      ce = shared.countExists
      user = newUser()
      # breakables (includes default weapon_warrior_0):
      user.items.gear.owned['shield_warrior_1'] = true
      # unbreakables because off-class or 0 value:
      user.items.gear.owned['shield_rogue_1'] = true
      user.items.gear.owned['head_special_nye'] = true
      expect(ce user.items.gear.owned).to.be 4
      user.stats.hp = 0
      user.ops.revive()
      expect(ce(user.items.gear.owned)).to.be 3
      user.stats.hp = 0
      user.ops.revive()
      expect(ce(user.items.gear.owned)).to.be 2
      user.stats.hp = 0
      user.ops.revive()
      expect(ce(user.items.gear.owned)).to.be 2
      expect(user.items.gear.owned).to.eql { weapon_warrior_0: false, shield_warrior_1: false, shield_rogue_1: true, head_special_nye: true }

    it "handles event items", ->
      shared.content.gear.flat.head_special_nye.event.start = '2012-01-01'
      shared.content.gear.flat.head_special_nye.event.end = '2012-02-01'
      expect(shared.content.gear.flat.head_special_nye.canOwn(user)).to.be true
      delete user.items.gear.owned['head_special_nye']
      expect(shared.content.gear.flat.head_special_nye.canOwn(user)).to.be false

      shared.content.gear.flat.head_special_nye.event.start = moment().subtract(5,'days')
      shared.content.gear.flat.head_special_nye.event.end = moment().add(5,'days')
      expect(shared.content.gear.flat.head_special_nye.canOwn(user)).to.be true

  describe 'Rebirth', ->
    user = undefined
    it 'removes correct gear', ->
      user = newUser()
      user.stats.lvl = 100
      user.items.gear.owned = {
        "weapon_warrior_0": true,
        "weapon_warrior_1": true,
        "armor_warrior_1": false,
        "armor_mystery_201402": true,
        "back_mystery_201402": false,
        "head_mystery_201402": true,
        "weapon_armoire_basicCrossbow": true,
        }
      user.ops.rebirth()
      expect(user.items.gear.owned).to.eql {
        "weapon_warrior_0": true,
        "weapon_warrior_1": false,
        "armor_warrior_1": false,
        "armor_mystery_201402": true,
        "back_mystery_201402": false,
        "head_mystery_201402": true,
        "weapon_armoire_basicCrossbow": false,
        }

  describe 'store', ->
    it 'buys a Quest scroll', ->
      user = newUser()
      user.stats.gp = 205
      user.ops.buyQuest {params: {key: 'dilatoryDistress1'}}
      expect(user.items.quests).to.eql {dilatoryDistress1: 1}
      expect(user).toHaveGP 5

    it 'does not buy Quests without enough Gold', ->
      user = newUser()
      user.stats.gp = 1
      user.ops.buyQuest {params: {key: 'dilatoryDistress1'}}
      expect(user.items.quests).to.eql {}
      expect(user).toHaveGP 1

    it 'does not buy nonexistent Quests', ->
      user = newUser()
      user.stats.gp = 9999
      user.ops.buyQuest {params: {key: 'snarfblatter'}}
      expect(user.items.quests).to.eql {}
      expect(user).toHaveGP 9999

    it 'does not buy Gem-premium Quests', ->
      user = newUser()
      user.stats.gp = 9999
      user.ops.buyQuest {params: {key: 'kraken'}}
      expect(user.items.quests).to.eql {}
      expect(user).toHaveGP 9999

  describe 'Gem purchases', ->
    it 'does not purchase items without enough Gems', ->
      user = newUser()
      user.ops.purchase {params: {type: 'eggs', key: 'Cactus'}}
      user.ops.purchase {params: {type: 'gear', key: 'headAccessory_special_foxEars'}}
      user.ops.unlock {query: {path: 'items.gear.owned.headAccessory_special_bearEars,items.gear.owned.headAccessory_special_cactusEars,items.gear.owned.headAccessory_special_foxEars,items.gear.owned.headAccessory_special_lionEars,items.gear.owned.headAccessory_special_pandaEars,items.gear.owned.headAccessory_special_pigEars,items.gear.owned.headAccessory_special_tigerEars,items.gear.owned.headAccessory_special_wolfEars'}}
      expect(user.items.eggs).to.eql {}
      expect(user.items.gear.owned).to.eql { weapon_warrior_0: true }

    it 'purchases an egg', ->
      user = newUser()
      user.balance = 1
      user.ops.purchase {params: {type: 'eggs', key: 'Cactus'}}
      expect(user.items.eggs).to.eql { Cactus: 1}
      expect(user.balance).to.eql 0.25

    it 'purchases fox ears', ->
      user = newUser()
      user.balance = 1
      user.ops.purchase {params: {type: 'gear', key: 'headAccessory_special_foxEars'}}
      expect(user.items.gear.owned).to.eql { weapon_warrior_0: true, headAccessory_special_foxEars: true }
      expect(user.balance).to.eql 0.5

    it 'unlocks all the animal ears at once', ->
      user = newUser()
      user.balance = 2
      user.ops.unlock {query: {path: 'items.gear.owned.headAccessory_special_bearEars,items.gear.owned.headAccessory_special_cactusEars,items.gear.owned.headAccessory_special_foxEars,items.gear.owned.headAccessory_special_lionEars,items.gear.owned.headAccessory_special_pandaEars,items.gear.owned.headAccessory_special_pigEars,items.gear.owned.headAccessory_special_tigerEars,items.gear.owned.headAccessory_special_wolfEars'}}
      expect(user.items.gear.owned).to.eql { weapon_warrior_0: true, headAccessory_special_bearEars: true, headAccessory_special_cactusEars: true, headAccessory_special_foxEars: true, headAccessory_special_lionEars: true, headAccessory_special_pandaEars: true, headAccessory_special_pigEars: true, headAccessory_special_tigerEars: true, headAccessory_special_wolfEars: true}
      expect(user.balance).to.eql 0.75

  describe 'spells', ->
    _.each shared.content.spells, (spellClass)->
      _.each spellClass, (spell)->
        it "#{spell.text} has valid values", ->
          expect(spell.target).to.match(/^(task|self|party|user)$/)
          expect(spell.mana).to.be.an('number')
          if spell.lvl
            expect(spell.lvl).to.be.an('number')
            expect(spell.lvl).to.be.above(0)
          expect(spell.cast).to.be.a('function')

  describe 'drop system', ->
    user = null
    MIN_RANGE_FOR_POTION = 0
    MAX_RANGE_FOR_POTION = .3
    MIN_RANGE_FOR_EGG = .4
    MAX_RANGE_FOR_EGG = .6
    MIN_RANGE_FOR_FOOD = .7
    MAX_RANGE_FOR_FOOD = 1

    beforeEach ->
      user = newUser()
      user.flags.dropsEnabled = true
      @task_id = shared.uuid()
      user.ops.addTask({body: {type: 'daily', id: @task_id}})

    it 'drops a hatching potion', ->
      for random in [MIN_RANGE_FOR_POTION..MAX_RANGE_FOR_POTION] by .1
        sinon.stub(user.fns, 'predictableRandom').returns random
        user.ops.score {params: { id: @task_id, direction: 'up'}}
        expect(user.items.eggs).to.be.empty
        expect(user.items.hatchingPotions).to.not.be.empty
        expect(user.items.food).to.be.empty
        user.fns.predictableRandom.restore()

    it 'drops a pet egg', ->
      for random in [MIN_RANGE_FOR_EGG..MAX_RANGE_FOR_EGG] by .1
        sinon.stub(user.fns, 'predictableRandom').returns random
        user.ops.score {params: { id: @task_id, direction: 'up'}}
        expect(user.items.eggs).to.not.be.empty
        expect(user.items.hatchingPotions).to.be.empty
        expect(user.items.food).to.be.empty
        user.fns.predictableRandom.restore()

    it 'drops food', ->
      for random in [MIN_RANGE_FOR_FOOD..MAX_RANGE_FOR_FOOD] by .1
        sinon.stub(user.fns, 'predictableRandom').returns random
        user.ops.score {params: { id: @task_id, direction: 'up'}}
        expect(user.items.eggs).to.be.empty
        expect(user.items.hatchingPotions).to.be.empty
        expect(user.items.food).to.not.be.empty
        user.fns.predictableRandom.restore()

    it 'does not get a drop', ->
      sinon.stub(user.fns, 'predictableRandom').returns 0.5
      user.ops.score {params: { id: @task_id, direction: 'up'}}
      expect(user.items.eggs).to.eql {}
      expect(user.items.hatchingPotions).to.eql {}
      expect(user.items.food).to.eql {}
      user.fns.predictableRandom.restore()

  describe 'Quests', ->
    _.each shared.content.quests, (quest)->
      it "#{quest.text()} has valid values", ->
        expect(quest.notes()).to.be.an('string')
        expect(quest.completion()).to.be.an('string') if quest.completion
        expect(quest.previous).to.be.an('string') if quest.previous
        expect(quest.value).to.be.greaterThan 0 if quest.canBuy()
        expect(quest.drop.gp).to.not.be.lessThan 0
        expect(quest.drop.exp).to.not.be.lessThan 0
        expect(quest.category).to.match(/pet|unlockable|gold|world/)
        if quest.drop.items
          expect(quest.drop.items).to.be.an(Array)
        if quest.boss
          expect(quest.boss.name()).to.be.an('string')
          expect(quest.boss.hp).to.be.greaterThan 0
          expect(quest.boss.str).to.be.greaterThan 0
        else if quest.collect
          _.each quest.collect, (collect)->
            expect(collect.text()).to.be.an('string')
            expect(collect.count).to.be.greaterThan 0

  describe 'Achievements', ->
    _.each shared.content.classes, (klass) ->
      user = newUser()
      user.stats.gp = 10000
      _.each shared.content.gearTypes, (type) ->
        _.each [1..5], (i) ->
          user.ops.buy {params:'#{type}_#{klass}_#{i}'}
      it 'does not get ultimateGear ' + klass, ->
        expect(user.achievements.ultimateGearSets[klass]).to.not.be.ok()
      _.each shared.content.gearTypes, (type) ->
        user.ops.buy {params:'#{type}_#{klass}_6'}
      xit 'gets ultimateGear ' + klass, ->
        expect(user.achievements.ultimateGearSets[klass]).to.be.ok()

    it 'does not remove existing Ultimate Gear achievements', ->
      user = newUser()
      user.achievements.ultimateGearSets = {'healer':true,'wizard':true,'rogue':true,'warrior':true}
      user.items.gear.owned.shield_warrior_5 = false
      user.items.gear.owned.weapon_rogue_6 = false
      user.ops.buy {params:'shield_warrior_5'}
      expect(user.achievements.ultimateGearSets).to.eql {'healer':true,'wizard':true,'rogue':true,'warrior':true}

  describe 'unlocking features', ->
    it 'unlocks drops at level 3', ->
      user = newUser()
      user.stats.lvl = 3
      user.fns.updateStats(user.stats)
      expect(user.flags.dropsEnabled).to.be.ok()

    it 'unlocks Rebirth at level 50', ->
      user = newUser()
      user.stats.lvl = 50
      user.fns.updateStats(user.stats)
      expect(user.flags.rebirthEnabled).to.be.ok()

    describe 'level-awarded Quests', ->
      it 'gets Attack of the Mundane at level 15', ->
        user = newUser()
        user.stats.lvl = 15
        user.fns.updateStats(user.stats)
        expect(user.flags.levelDrops.atom1).to.be.ok()    
        expect(user.items.quests.atom1).to.eql 1

      it 'gets Vice at level 30', ->
        user = newUser()
        user.stats.lvl = 30
        user.fns.updateStats(user.stats)
        expect(user.flags.levelDrops.vice1).to.be.ok()
        expect(user.items.quests.vice1).to.eql 1

      it 'gets Golden Knight at level 40', ->
        user = newUser()
        user.stats.lvl = 40
        user.fns.updateStats(user.stats)
        expect(user.flags.levelDrops.goldenknight1).to.be.ok()
        expect(user.items.quests.goldenknight1).to.eql 1

      it 'gets Moonstone Chain at level 60', ->
        user = newUser()
        user.stats.lvl = 60
        user.fns.updateStats(user.stats)
        expect(user.flags.levelDrops.moonstone1).to.be.ok()
        expect(user.items.quests.moonstone1).to.eql 1

describe 'Simple Scoring', ->
  beforeEach ->
    {@before, @after} = beforeAfter()

  it 'Habits : Up', ->
    @after.ops.score {params: {id: @after.habits[0].id, direction: 'down'}, query: {times: 5}}
    expectLostPoints(@before, @after,'habit')

  it 'Habits : Down', ->
    @after.ops.score {params: {id: @after.habits[0].id, direction: 'up'}, query: {times: 5}}
    expectGainedPoints(@before, @after,'habit')

  it 'Dailys : Up', ->
    @after.ops.score {params: {id: @after.dailys[0].id, direction: 'up'}}
    expectGainedPoints(@before, @after,'daily')

  it 'Dailys : Up, Down', ->
    @after.ops.score {params: {id: @after.dailys[0].id, direction: 'up'}}
    @after.ops.score {params: {id: @after.dailys[0].id, direction: 'down'}}
    expectClosePoints(@before, @after, 'daily')

  it 'Todos : Up', ->
    @after.ops.score {params: {id: @after.todos[0].id, direction: 'up'}}
    expectGainedPoints(@before, @after,'todo')

  it 'Todos : Up, Down', ->
    @after.ops.score {params: {id: @after.todos[0].id, direction: 'up'}}
    @after.ops.score {params: {id: @after.todos[0].id, direction: 'down'}}
    expectClosePoints(@before, @after, 'todo')

describe 'Helper', ->

  it 'calculates gold coins', ->
    expect(shared.gold(10)).to.eql 10
    expect(shared.gold(1.957)).to.eql 1
    expect(shared.gold()).to.eql 0

  it 'calculates silver coins', ->
    expect(shared.silver(10)).to.eql 0
    expect(shared.silver(1.957)).to.eql 95
    expect(shared.silver(0.01)).to.eql "01"
    expect(shared.silver()).to.eql "00"

  it 'calculates experience to next level', ->
    expect(shared.tnl 1).to.eql 150
    expect(shared.tnl 2).to.eql 160
    expect(shared.tnl 10).to.eql 260
    expect(shared.tnl 99).to.eql 3580

  it 'calculates the start of the day', ->
    fstr = 'YYYY-MM-DD HH:mm:ss'
    today = '2013-01-01 00:00:00'
    # get the timezone for the day, so the test case doesn't fail
    #  if you run it during daylight savings time because by default
    #  it uses moment().zone() which is the current minute offset
    zone = moment(today).zone()
    expect(shared.startOfDay({now: new Date(2013, 0, 1, 0)}, timezoneOffset:zone).format(fstr)).to.eql today
    expect(shared.startOfDay({now: new Date(2013, 0, 1, 5)}, timezoneOffset:zone).format(fstr)).to.eql today
    expect(shared.startOfDay({now: new Date(2013, 0, 1, 23, 59, 59), timezoneOffset:zone}).format(fstr)).to.eql today
