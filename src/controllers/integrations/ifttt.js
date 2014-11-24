var _ = require('lodash');
var nconf = require('nconf');
var async = require('async');
var shared = require('habitrpg-shared');
// var User = require('./../models/user').model;
// var Group = require('./../models/group').model;
var api = module.exports;
// XXX purge above

api.testIftttKey = function(req, res, next) {
  if (!(req.headers && req.headers['ifttt-channel-key'] && req.headers['ifttt-channel-key'] === "9MIqXMPn4X3B_WrsHl77MpnleQo0XS_ZgfaMcVSkgrlDq3dPEDqf67I0OW4PqyiG")) return res.json(401, {err:"Denied"});
  next();
}
