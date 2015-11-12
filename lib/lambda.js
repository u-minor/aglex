var _ = require('lodash');
var AWS = require('aws-sdk');
var Q = require('q');

module.exports = function(awsConfig) {
  var lambda = new AWS.Lambda(awsConfig);
  return (function() {
    var obj = {};
    _.forEach(_.functions(lambda), function(method) {
      obj[method] = (function(method) {
        return function(params) {
          var dfd = Q.defer();
          lambda[method](params, function(err, data) {
            if (err) {
              dfd.reject(err);
            } else {
              dfd.resolve(data);
            }
          });
          return dfd.promise;
        };
      })(method);
    });
    return obj;
  })();
};
