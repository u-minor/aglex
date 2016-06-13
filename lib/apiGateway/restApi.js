var _ = require('lodash');
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
      var that = this;
      return api.getResourcesAsync({
        restApiId: this.id,
        limit: 500
      }).then(function(data) {
        var arr = [];
        debug(data);
        _.forEach(data.items, function(item) {
          arr.push(new Resource(that, item));
        });
        return _.sortBy(arr, 'path');
      });
    },

    stages: function() {
      var that = this;
      return api.getStagesAsync({
        restApiId: this.id
      }).then(function(data) {
        debug(data);
        var arr = [];
        _.forEach(data.item, function(item) {
          arr.push(new Stage(that, item));
        });
        return _.sortBy(arr, 'stageName');
      });
    }
  };

  RestApi.findByName = function(name) {
    return api.getRestApisAsync()
    .then(function(data) {
      debug(data);
      var api = _.find(data.items, {name: name});
      if (! api) {
        return null;
      }
      return new RestApi(api);
    });
  };

  RestApi.create = function(params) {
    return api.createRestApiAsync(params)
    .then(function(data) {
      debug(data);
      return new RestApi(data);
    });
  };

  return RestApi;
};
