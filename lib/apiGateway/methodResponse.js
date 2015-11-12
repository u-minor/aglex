var _ = require('lodash');
var Q = require('q');
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
      var dfd = Q.defer();
      api.deleteMethodResponse({
        httpMethod: this._method.httpMethod,
        resourceId: this._method._resource.id,
        restApiId: this._method._resource._restApi.id,
        statusCode: this.statusCode
      }, function(err, data) {
        if (err) {
          dfd.reject(err);
        } else {
          dfd.resolve(data);
        }
      });
      return dfd.promise;
    }
  };

  MethodResponse.create = function(method, params) {
    var dfd = Q.defer();
    var obj = _.merge({
      httpMethod: method.httpMethod,
      resourceId: method._resource.id,
      restApiId: method._resource._restApi.id
    }, params);

    api.putMethodResponse(obj, function(err, data) {
      if (err) {
        dfd.reject(err);
      } else {
        debug(data);
        dfd.resolve(new MethodResponse(method, data));
      }
    });

    return dfd.promise;
  };

  return MethodResponse;
};
