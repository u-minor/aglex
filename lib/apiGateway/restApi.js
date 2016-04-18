var _ = require('lodash');
var Q = require('q');
var debug = require('debug')('aglex.apiGateway.restApi');

var resource = require('./resource');
var deployment = require('./deployment');
var stage = require('./stage');

module.exports = function(api) {
  var Resource = resource(api);
  var Deployment = deployment(api);
  var Stage = stage(api);
  var RestApi = function(data) {
    _.merge(this, data);
  };

  RestApi.prototype = {
    createResource: function(params) {
      return Resource.create(this, params);
    },

    createDeployment: function(params) {
      return Deployment.create(this, params);
    },

    resources: function() {
      var dfd = Q.defer();
      var that = this;
      api.getResources({
        restApiId: this.id,
        limit: 500
      }, function(err, data) {
        if (err) {
          dfd.reject(err);
          return;
        }
        var arr = [];
        _.forEach(data.items, function(item) {
          arr.push(new Resource(that, item));
        });
        dfd.resolve(_.sortBy(arr, 'path'));
      });
      return dfd.promise;
    },

    stages: function() {
      var dfd = Q.defer();
      var that = this;
      api.getStages({
        restApiId: this.id,
      }, function(err, data) {
        if (err) {
          dfd.reject(err);
          return;
        }
        debug(data);
        var arr = [];
        _.forEach(data.item, function(item) {
          arr.push(new Stage(that, item));
        });
        dfd.resolve(_.sortBy(arr, 'stageName'));
      });
      return dfd.promise;
    }
  };

  RestApi.findByName = function(name) {
    var dfd = Q.defer();
    api.getRestApis(null, function(err, data) {
      if (err) {
        dfd.reject(err);
      } else {
        var api = _.find(data.items, {name: name});
        if (api) {
          debug(data);
          dfd.resolve(new RestApi(api));
        } else {
          dfd.resolve(null);
        }
      }
    });
    return dfd.promise;
  };

  RestApi.create = function(params) {
    var dfd = Q.defer();
    api.createRestApi(params, function(err, data) {
      if (err) {
        dfd.reject(err);
      } else {
        debug(data);
        dfd.resolve(new RestApi(data));
      }
    });
    return dfd.promise;
  };

  return RestApi;
};
