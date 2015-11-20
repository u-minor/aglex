var _ = require('lodash');
var Q = require('q');
var debug = require('debug')('aglex.apiGateway.deployment');

module.exports = function(api) {
  var Deployment = function(restApi, data) {
    this._restApi = restApi;
    _.merge(this, data);
  };

  Deployment.prototype = {
  };

  Deployment.create = function(restApi, params) {
    var dfd = Q.defer();
    var obj = _.merge({
      restApiId: restApi.id
    }, params);

    api.createDeployment(obj, function(err, data) {
      if (err) {
        dfd.reject(err);
      } else {
        debug(data);
        dfd.resolve(new Deployment(restApi, data));
      }
    });

    return dfd.promise;
  };

  return Deployment;
};
