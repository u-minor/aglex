var _ = require('lodash');
var debug = require('debug')('aglex.apiGateway.method');

var integration = require('./integration');
var methodResponse = require('./methodResponse');

module.exports = function(api) {
  var Integration = integration(api);
  var MethodResponse = methodResponse(api);
  var Method = function(resource, data) {
    var that = this;
    this._resource = resource;
    _.merge(this, data);

    if (this.methodIntegration) {
      this.methodIntegration = new Integration(this, this.methodIntegration);
    }
    if (this.methodResponses) {
      var responses = {};
      _.forEach(this.methodResponses, function(val, key) {
        responses[key] = new MethodResponse(that, val);
      });
      this.methodResponses = responses;
    }
  };

  Method.prototype = {
    createIntegration: function(params) {
      var that = this;
      return Integration.create(this, params).then(function(integration) {
        that.methodIntegration = integration;
      });
    },

    createMethodResponse: function(params) {
      var that = this;
      return MethodResponse.create(this, params).then(function(response) {
        if (!that.methodResponses) {
          that.methodResponses = {};
        }
        that.methodResponses[params.statusCode] = response;
      });
    },

    updateIntegration: function(params) {
      return this.methodIntegration.update(params);
    },

    updateMethodResponse: function(params) {
      var that = this;
      return this.methodResponses[params.statusCode].update(params);
    },

    delete: function() {
      return api.deleteMethodAsync({
        httpMethod: this.httpMethod,
        resourceId: this._resource.id,
        restApiId: this._resource._restApi.id
      });
    }
  };

  Method.create = function(resource, params) {
    var obj = _.merge({
      resourceId: resource.id,
      restApiId: resource._restApi.id
    }, params);

    return api.putMethodAsync(obj)
    .then(function(data) {
      debug(data);
      return new Method(resource, data);
    });
  };

  return Method;
};
