var _ = require('lodash');
var debug = require('debug')('aglex.apiGateway.stage');

module.exports = function(api) {
  var Stage = function(restApi, data) {
    this._restApi = restApi;
    _.merge(this, data);
  };

  Stage.prototype = {
  };

  Stage.create = function(restApi, params) {
    var obj = _.merge({
      restApiId: restApi.id
    }, params);

    return api.createStageAsync(obj)
    .then(function(data) {
      debug(data);
      return new Stage(restApi, data);
    });
  };

  return Stage;
};
