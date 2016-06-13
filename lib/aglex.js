var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Promise = require('bluebird');
var debug = require('debug')('aglex.core');
var aglexLib = require('./aglexLib');

var Aglex = function(config, logLevel) {
  this.config = config;
  this.logLevel = logLevel;
};

Aglex.prototype = {
  deployApi: function(description, stageName, stageDescription) {
    debug('deployApi called');
    var lib = aglexLib(this.config, this.logLevel);
    return lib.deployApi(description, stageName, stageDescription);
  },

  getApiStages: function() {
    debug('getApiStages called');
    var lib = aglexLib(this.config, this.logLevel);
    return lib.getApiStages()
      .then(function(stages) {
        var data = {};
        _.forEach(stages, function(stage) {
          data[stage.stageName] = stage.description;
        });
        return data;
      });
  },

  updateApi: function() {
    debug('updateApi called');
    var lib = aglexLib(this.config, this.logLevel);
    return lib.getLambda()
      .then(function(lambda) {
        return lib.getApi();
      })
      .then(function(api) {
        return lib.checkResources(api);
      })
      .then(function(resources) {
        var p = Promise.resolve();
        return Promise.reduce(resources, function(_, resource) {
          return lib.checkMethods(resource);
        }, null);
      });
  },

  updateLambda: function(file) {
    debug('updateLambda called');
    var lib = aglexLib(this.config, this.logLevel);
    return lib.updateLambda(file);
  },

  addLambdaPermission: function() {
    debug('addLambdaPermission called');
    var lib = aglexLib(this.config, this.logLevel);
    return lib.addLambdaPermission();
  },

  generateConfig: function() {
    return fs.readFileSync(path.resolve(__dirname, '../config/config.yml'), 'utf8');
  },

  generateLambdaHandler: function(coffee) {
    var content = fs.readFileSync(path.resolve(__dirname, '../config/lambda.coffee'), 'utf8');
    if (!coffee) {
      content = require('coffee-script').compile(content, {bare: true});
    }
    return content.trim();
  }
};

module.exports = function(config, logLevel) {
  return new Aglex(config, logLevel);
};
