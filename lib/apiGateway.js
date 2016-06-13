var AWS = require('aws-sdk');

var restApi = require('./apiGateway/restApi');

module.exports = function() {
  var apiGateway = new AWS.APIGateway();
  return {
    RestApi: restApi(apiGateway)
  };
};
