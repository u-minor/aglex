var AWS = require('aws-sdk');
var Promise = require('bluebird');

var restApi = require('./apiGateway/restApi');

module.exports = function() {
  var apiGateway = Promise.promisifyAll(new AWS.APIGateway());

  return {
    RestApi: restApi(apiGateway)
  };
};
