var _ = require('lodash');
var Promise = require('bluebird');
var debug = require('debug')('aglex.apiGateway.resource');

var method = require('./method');

module.exports = function(api) {
  var Method = method(api);
  var Resource = function(restApi, data) {
    this._restApi = restApi;
    _.merge(this, data);
  };

  Resource.prototype = {
    createMethod: function(params) {
      return Method.create(this, params);
    },

    methods: function() {
      var promises = [];
      var that = this;

      _.forEach(this.resourceMethods, function(dummy, method) {
        var p = api.getMethodAsync({
          httpMethod: method,
          resourceId: that.id,
          restApiId: that._restApi.id
        }).then(function(data) {
          debug(data);
          return new Method(that, data);
        });
        promises.push(p);
      });

      return Promise.all(promises);
    },

    delete: function() {
      return api.deleteResourceAsync({
        resourceId: this.id,
        restApiId: this._restApi.id
      });
    }
  };

  Resource.create = function(restApi, params) {
    var obj = _.merge({
      restApiId: restApi.id
    }, params);

    return api.createResourceAsync(obj)
    .then(function(data) {
      debug(data);
      return new Resource(restApi, data);
    });
  };

  return Resource;
};
