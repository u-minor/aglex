var _ = require('lodash');
var debug = require('debug')('aglex.apiGateway.integration');

var integrationResponse = require('./integrationResponse');

module.exports = function(api) {
  var IntegrationResponse = integrationResponse(api);
  var Integration = function(method, data) {
    var that = this;
    this._method = method;
    _.merge(this, data);

    if (this.integrationResponses) {
      var responses = {};
      _.forEach(this.integrationResponses, function(val, key) {
        responses[key] = new IntegrationResponse(that, val);
      });
      this.integrationResponses = responses;
    }
  };

  Integration.prototype = {
    createIntegrationResponse: function(params) {
      var that = this;
      return IntegrationResponse.create(this, params).then(function(response) {
        if (!that.integrationResponses) {
          that.integrationResponses = {};
        }
        that.integrationResponses[params.statusCode] = response;
      });
    },

    update: function(params) {
      var that = this;
      return Integration.create(this._method, params).then(function(integration) {
        _.forEach(that, function(val, key) {
          delete that[key];
        });
        _.forEach(integration, function(val, key) {
          that[key] = val;
        });
        return that;
      });
    }
  };

  Integration.create = function(method, params) {
    var obj = _.merge({
      httpMethod: method.httpMethod,
      resourceId: method._resource.id,
      restApiId: method._resource._restApi.id
    }, params);

    return api.putIntegrationAsync(obj)
    .then(function(data) {
      debug(data);
      return new Integration(method, data);
    });
  };

  return Integration;
};
