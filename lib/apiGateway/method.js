var _ = require('lodash');
var Q = require('q');
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
      var dfd = Q.defer();
      api.deleteMethod({
        httpMethod: this.httpMethod,
        resourceId: this._resource.id,
        restApiId: this._resource._restApi.id
      }, function(err, data) {
        if (err) {
          dfd.reject(err);
        } else {
          debug(data);
          dfd.resolve(data);
        }
      });
      return dfd.promise;
    }
  };

  Method.create = function(resource, params) {
    var dfd = Q.defer();
    var obj = _.merge({
      resourceId: resource.id,
      restApiId: resource._restApi.id
    }, params);

    api.putMethod(obj, function(err, data) {
      if (err) {
        dfd.reject(err);
      } else {
        debug(data);
        dfd.resolve(new Method(resource, data));
      }
    });

    return dfd.promise;
  };

  return Method;
};
