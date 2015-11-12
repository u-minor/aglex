var AWS = require('aws-sdk');

var restApi = require('./apiGateway/restApi');

module.exports = function(awsConfig) {
  var apiGateway = new AWS.APIGateway(awsConfig);
  return {
    RestApi: restApi(apiGateway)
  };
};
