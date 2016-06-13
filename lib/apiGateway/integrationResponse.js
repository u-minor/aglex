var _ = require('lodash');
var debug = require('debug')('aglex.apiGateway.integrationResponse');

module.exports = function(api) {
  var IntegrationResponse = function(integration, data) {
    this._integration = integration;
    _.merge(this, data);
  };

  IntegrationResponse.prototype = {
    update: function(params) {
      var that = this;
      return this.delete()
        .then(function() {
          return IntegrationResponse.create(that._integration, params);
        })
        .then(function(integrationResponse) {
          _.forEach(that, function(val, key) {
            delete that[key];
          });
          _.forEach(integrationResponse, function(val, key) {
            that[key] = val;
          });
          return that;
        });
    },

    delete: function() {
      return api.deleteIntegrationResponseAsync({
        httpMethod: this._integration._method.httpMethod,
        resourceId: this._integration._method._resource.id,
        restApiId: this._integration._method._resource._restApi.id,
        statusCode: this.statusCode
      });
    }
  };

  IntegrationResponse.create = function(integration, params) {
    var obj = _.merge({
      httpMethod: integration._method.httpMethod,
      resourceId: integration._method._resource.id,
      restApiId: integration._method._resource._restApi.id
    }, params);

    return api.putIntegrationResponseAsync(obj)
    .then(function(data) {
      debug(data);
      return new IntegrationResponse(integration, data);
    });
  };

  return IntegrationResponse;
};
