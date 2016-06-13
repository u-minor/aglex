var _ = require('lodash');
var debug = require('debug')('aglex.apiGateway.deployment');

module.exports = function(api) {
  var Deployment = function(restApi, data) {
    this._restApi = restApi;
    _.merge(this, data);
  };

  Deployment.prototype = {
  };

  Deployment.create = function(restApi, params) {
    var obj = _.merge({
      restApiId: restApi.id
    }, params);

    return api.createDeploymentAsync(obj)
      .then(function(data) {
        debug(data);
        return new Deployment(restApi, data);
      });
  };

  return Deployment;
};
