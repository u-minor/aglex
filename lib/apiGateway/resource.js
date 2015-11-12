var _ = require('lodash');
var Q = require('q');
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
      var dfd = Q.defer();
      var promises = [];
      var that = this;

      _.forEach(this.resourceMethods, function(dummy, method) {
        var dfd = Q.defer();
        api.getMethod({
          httpMethod: method,
          resourceId: that.id,
          restApiId: that._restApi.id
        }, function(err, data) {
          if (err) {
            dfd.reject(err);
          } else {
            debug(data);
            dfd.resolve(new Method(that, data));
          }
        });
        promises.push(dfd.promise);
      });

      Q.all(promises).then(function(arr) {
        dfd.resolve(arr);
      });

      return dfd.promise;
    },

    delete: function() {
      var dfd = Q.defer();
      api.deleteResource({
        resourceId: this.id,
        restApiId: this._restApi.id
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

  Resource.create = function(restApi, params) {
    var dfd = Q.defer();
    var obj = _.merge({
      restApiId: restApi.id
    }, params);

    api.createResource(obj, function(err, data) {
      if (err) {
        dfd.reject(err);
      } else {
        debug(data);
        dfd.resolve(new Resource(restApi, data));
      }
    });

    return dfd.promise;
  };

  return Resource;
};
