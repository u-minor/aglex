var _ = require('lodash');
var Q = require('q');
var debug = require('debug')('aglex.apiGateway.stage');

module.exports = function(api) {
  var Stage = function(restApi, data) {
    this._restApi = restApi;
    _.merge(this, data);
  };

  Stage.prototype = {
  };

  Stage.create = function(restApi, params) {
    var dfd = Q.defer();
    var obj = _.merge({
      restApiId: restApi.id
    }, params);

    api.createStage(obj, function(err, data) {
      if (err) {
        dfd.reject(err);
      } else {
        debug(data);
        dfd.resolve(new Stage(restApi, data));
      }
    });

    return dfd.promise;
  };

  return Stage;
};
