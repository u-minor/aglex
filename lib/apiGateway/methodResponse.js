var _ = require('lodash');
var debug = require('debug')('aglex.apiGateway.methodResponse');

module.exports = function(api) {
  var MethodResponse = function(method, data) {
    this._method = method;
    _.merge(this, data);
  };

  MethodResponse.prototype = {
    update: function(params) {
      var that = this;
      return this.delete()
        .then(function() {
          return MethodResponse.create(that._method, params);
        })
        .then(function(methodResponse) {
          _.forEach(that, function(val, key) {
            delete that[key];
          });
          _.forEach(methodResponse, function(val, key) {
            that[key] = val;
          });
          return that;
        });
    },

    delete: function() {
      return api.deleteMethodResponseAsync({
        httpMethod: this._method.httpMethod,
        resourceId: this._method._resource.id,
        restApiId: this._method._resource._restApi.id,
        statusCode: this.statusCode
      });
    }
  };

  MethodResponse.create = function(method, params) {
    var obj = _.merge({
      httpMethod: method.httpMethod,
      resourceId: method._resource.id,
      restApiId: method._resource._restApi.id
    }, params);

    return api.putMethodResponseAsync(obj)
    .then(function(data) {
      debug(data);
      return new MethodResponse(method, data);
    });
  };

  return MethodResponse;
};
