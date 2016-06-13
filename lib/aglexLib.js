var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var AWS = require('aws-sdk');
var Promise = require('bluebird');
var colors = require('colors');
var debug = require('debug')('aglex.lib');
var logger = require('winston');

var apiGateway = require('./apiGateway');
var config = require('./config');

var AglexLib = function(conf, logLevel) {
  logger.remove(logger.transports.Console);
  logger.add(logger.transports.Console, {showLevel: false, colorize: false});
  logger.level = logLevel || 'none';

  AWS.config.update({region: conf.config.region || 'us-east-1'});
  if (conf.config.accessKeyId && conf.config.secretAccessKey) {
    AWS.config.credentials = new AWS.Credentials(conf.config.accessKeyId, conf.config.secretAccessKey);
  } else if (conf.config.profile) {
    AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: conf.config.profile});
  } else {
    AWS.config.credentials = new AWS.SharedIniFileCredentials();
  }

  this.apiGateway = apiGateway();
  this.lambda = Promise.promisifyAll(new AWS.Lambda(), {suffix: 'AsyncB'});
  this.config = conf;
  this.lambdaFunction = undefined;

  config.normalizeResources(this.config.apiGateway.resources);
  config.normalizeMethods(this.config.apiGateway.resources, this.config.apiGateway.methodDefinitions);
};

var reducePromises = function(arr) {
  return Promise.reduce(arr, function(_, task) {
    return task();
  }, null);
};

AglexLib.prototype = {
  checkIntegration: function(method) {
    var that = this;

    debug('checkIntegration called - method:%s resource:%s', method.httpMethod, method._resource.path);

    return this.checkIntegrationRequest(method)
    .then(function() { return that.checkMethodResponses(method); })
    .then(function() { return that.checkIntegrationResponses(method.methodIntegration); });
  },

  checkIntegrationRequest: function(method) {
    var integrationConfig = this.config.apiGateway.resources[method._resource.path][method.httpMethod].request;

    debug('checkIntegrationRequest called - method:%s resource:%s', method.httpMethod, method._resource.path);

    if (!method.methodIntegration) {
      logger.info(('create integration request for ' + method.httpMethod + ':' + method._resource.path + ' ...').green);
      return method.createIntegration(integrationConfig);
    }

    var needUpdate = false;
    _.forEach(integrationConfig, function(val, key) {
      if (key === 'integrationHttpMethod') {
        key = 'httpMethod';
      }
      if (!_.isEqual(method.methodIntegration[key], val)) {
        needUpdate = true;
      }
    });

    if (needUpdate) {
      logger.info(('update integration request for ' + method.httpMethod + ':' + method._resource.path).yellow);
      return method.updateIntegration(integrationConfig);
    }

    return Promise.resolve();
  },

  checkIntegrationResponses: function(integration) {
    var method = integration._method;
    var resource = method._resource;
    var resConfig = this.config.apiGateway.resources[resource.path][method.httpMethod].responses;
    var arr = [];

    debug('checkIntegrationResponses called - method:%s resource:%s', method.httpMethod, method._resource.path);

    if (!integration.integrationResponses) {
      _.forEach(resConfig, function(rval, rkey) {
        logger.info(('create integration response status:' + rkey + ' for ' + method.httpMethod + ':' + resource.path + ' ...').green);
        var resParams = {};
        _.forEach(rval.responseHeaders, function(hval, hkey) {
          resParams['method.response.header.' + hkey] = hval;
        });
        var obj = {
          statusCode: rkey,
          responseParameters: resParams,
          responseTemplates: rval.responseTemplates || {'application/json': ''}
        };
        if (rval.selectionPattern) {
          obj.selectionPattern = rval.selectionPattern;
        }

        arr.push(function() {
          return integration.createIntegrationResponse(obj);
        });
      });
      return reducePromises(arr);
    }

    _.forEach(resConfig, function(obj, statusCode) {
      // check difference
      var needUpdate = false;
      var ir = integration.integrationResponses[statusCode];
      var resParams = {};
      _.forEach(obj.responseHeaders, function(hval, hkey) {
        resParams['method.response.header.' + hkey] = hval;
      });
      _.defaults(obj, {
        responseTemplates: {'application/json': ''}
      });

      if (!_.isEqual(ir.selectionPattern, obj.selectionPattern)) {
        needUpdate = true;
      }
      if (!_.isEqual(ir.responseParameters, resParams)) {
        needUpdate = true;
      }
      var templates = _.clone(ir.responseTemplates, true);
      _.forEach(templates, function(val, key) {
        if (val === null) {
          templates[key] = '';
        }
      });
      if (!_.isEqual(templates, obj.responseTemplates)) {
        needUpdate = true;
      }
      if (needUpdate) {
        logger.info(('update integration response status:' + statusCode + ' for ' + method.httpMethod + ':' + resource.path).yellow);
        arr.push(function() {
          return ir.update({
            statusCode: statusCode,
            selectionPattern: obj.selectionPattern,
            responseParameters: resParams,
            responseTemplates: obj.responseTemplates
          });
        });
      }
    });
    return reducePromises(arr);
  },

  checkMethodResponses: function(method) {
    var resource = method._resource;
    var resConfig = this.config.apiGateway.resources[resource.path][method.httpMethod].responses;
    var arr = [];

    debug('checkMethodResponses called - method:%s resource:%s', method.httpMethod, method._resource.path);

    if (!method.methodResponses) {
      _.forEach(resConfig, function(rval, rkey) {
        logger.info(('create method response status:' + rkey + ' for ' + method.httpMethod + ':' + resource.path + ' ...').green);
        var resParams = {};
        _.forEach(rval.responseHeaders, function(hval, hkey) {
          resParams['method.response.header.' + hkey] = false;
        });

        arr.push(function() {
          return method.createMethodResponse({
            statusCode: rkey,
            responseModels: rval.responseModels || {'application/json': 'Empty'},
            responseParameters: resParams
          });
        });
      });
      return reducePromises(arr);
    }

    // delete unused methodResponse
    _.forEach(method.methodResponses, function(methodResponse, statusCode) {
      if (!resConfig[statusCode]) {
        logger.info(('delete method response status:' + statusCode + ' for ' + method.httpMethod + ':' + resource.path + ' ...').red);
        arr.push(function() {
          return methodResponse.delete().then(function() {
            delete method.methodResponses[statusCode];
          });
        });
      }
    });

    // check difference
    _.forEach(resConfig, function(resConfig, statusCode) {
      _.defaults(resConfig, {
        responseModels: {'application/json': 'Empty'}
      });
      var resParams = {};
      _.forEach(resConfig.responseHeaders, function(hval, hkey) {
        resParams['method.response.header.' + hkey] = false;
      });
      var methodResponse = method.methodResponses[statusCode];

      if (!methodResponse) {
        logger.info(('create method response status:' + statusCode + ' for ' + method.httpMethod + ':' + resource.path + ' ...').green);
        arr.push(function() {
          return method.createMethodResponse({
            statusCode: statusCode,
            responseModels: resConfig.responseModels || {'application/json': 'Empty'},
            responseParameters: resParams
          });
        });
        return;
      }

      var needUpdate = false;
      if (!_.isEqual(methodResponse.responseModels, resConfig.responseModels)) {
        needUpdate = true;
      }
      if (!_.isEqual(methodResponse.responseParameters, resParams)) {
        needUpdate = true;
      }
      if (needUpdate) {
        logger.info(('update method response status:' + statusCode + ' for ' + method.httpMethod + ':' + resource.path).yellow);
        arr.push(function() {
          return methodResponse.update({
            statusCode: statusCode,
            responseModels: resConfig.responseModels,
            responseParameters: resParams
          });
        });
      }
    });
    return reducePromises(arr);
  },

  checkMethods: function(resource) {
    var that = this;
    var config = this.config.apiGateway;

    debug('checkMethods called - resource:%s', resource.path);

    return resource.methods().then(function(methods) {
      var arr = [];
      // delete unused method
      _.forEach(methods, function(method) {
        if (!config.resources[resource.path][method.httpMethod]) {
          logger.info(('delete method ' + method.httpMethod + ' for ' + resource.path).red);
          arr.push(function() { return method.delete(); });
        }
      });

      _.forEach(config.resources[resource.path], function(methodConfig, methodName) {
        var method = _.find(methods, {httpMethod: methodName});
        if (method) {
          arr.push(function() { return that.checkIntegration(method); });
          return;
        }

        var reqParams = {};
        _.forEach(resource.path.match(/\{.+?\}/g), function(match) {
          reqParams['method.request.path.' + match.replace(/[{}]/g, '')] = true;
        });
        logger.info(('create method ' + methodName + ' for ' + resource.path).green);
        arr.push(function() {
          return resource.createMethod({
            authorizationType: methodConfig.authorizationType || 'NONE',
            httpMethod: methodName,
            apiKeyRequired: methodConfig.apiKeyRequired || false,
            requestModels: methodConfig.requestModels || null,
            requestParameters: reqParams || null
          }).then(function(method) {
            return that.checkIntegration(method);
          });
        });
      });

      return reducePromises(arr);
    });
  },

  checkResources: function(api) {
    var config = this.config.apiGateway;

    debug('checkResources called');

    return api.resources().then(function(resources) {
      // delete unused resource
      var p = Promise.resolve();
      var deleted = false;

      _.forEach(resources, function(resource) {
        if (!config.resources[resource.path]) {
          logger.info(('delete resource ' + resource.path).red);
          p = p.then(function() {
            return resource.delete();
          });
          deleted = true;
        }
      });

      if (deleted) {
        return p.then(function() {
          return api.resources();
        });
      }
      return resources;
    })
    .then(function(resources) {
      // create unregistered resource
      var resourceHash = {};
      var arr = [];
      var p = Promise.resolve();
      var added = false;

      _.forEach(resources, function(resource) {
        resourceHash[resource.path] = resource;
      });
      _.forEach(Object.keys(config.resources).sort(), function(resource) {
        if (!_.find(resources, {path: resource})) {
          logger.info(('create resource ' + resource).green);
          p = p.then(function() {
            return api.createResource({
              parentId: resourceHash[path.dirname(resource)].id,
              pathPart: path.basename(resource)
            })
            .then(function(resource) {
              resourceHash[resource.path] = resource;
              return;
            });
          });
          added = true;
        }
      });
      if (added) {
        return p.then(function() {
          return api.resources();
        });
      }
      return resources;
    });
  },

  getApi: function() {
    var that = this;

    debug('getApi called');

    return this.apiGateway.RestApi.findByName(this.config.apiGateway.name).then(function(api) {
      if (api) {
        logger.info('found restApi ' + api.name + ' ' + api.id);
        return api;
      }

      logger.info(('create restApi ' + that.config.apiGateway.name).green);
      return that.apiGateway.RestApi.create({
        name: that.config.apiGateway.name,
        description: that.config.apiGateway.description
      });
    });
  },

  deployApi: function(description, stageName, stageDescription) {
    var that = this;

    debug('deployApi called');

    return this.apiGateway.RestApi.findByName(this.config.apiGateway.name).then(function(api) {
      if (!api) {
        logger.info(('cannot find api ' + that.config.apiGateway.name).red);
        throw 'Error';
      }
      return api.createDeployment({
        stageName: stageName,
        description: description,
        stageDescription: stageDescription
      });
    });
  },

  getApiStages: function() {
    var that = this;

    debug('getApiStages called');

    return this.apiGateway.RestApi.findByName(this.config.apiGateway.name).then(function(api) {
      if (!api) {
        logger.info(('cannot find api ' + that.config.apiGateway.name).red);
        throw 'Error';
      }
      return api.stages();
    });
  },

  getLambda: function() {
    var that = this;

    debug('getLambda called');

    return this.lambda.getFunctionAsyncB({FunctionName: this.config.lambda.FunctionName})
      .then(function(lambda) {
        logger.info('found lambda ' + lambda.Configuration.FunctionName + ' ' + lambda.Configuration.FunctionArn);
        config.normalizeRequestTemplates(that.config.apiGateway.resources, that.config.config.region, lambda.Configuration.FunctionArn);
        that.lambdaFunction = lambda;
        return lambda;
      }, function(err) {
        logger.info(('cannot find lambda ' + that.config.lambda.FunctionName).red);
        throw err;
      });
  },

  updateLambda: function(file) {
    var that = this;

    debug('updateLambda called');

    var iam = Promise.promisifyAll(new AWS.IAM());
    return iam.getRoleAsync({RoleName: that.config.lambda.RoleName})
      .then(function(data) {
        logger.info('found lambda execution role %s', data.Role.Arn);
        // replace RoleName -> Role (ARN)
        that.config.lambda.Role = data.Role.Arn;
        delete that.config.lambda.RoleName;

        return that.lambda.getFunctionAsyncB({FunctionName: that.config.lambda.FunctionName})
          .then(function(lambda) {
            logger.info('found lambda ' + lambda.Configuration.FunctionName);
            logger.info(('update configuration for %s').yellow, lambda.Configuration.FunctionName);
            return that.lambda.updateFunctionConfigurationAsyncB(that.config.lambda)
              .then(function() {
                logger.info(('update function code for %s').yellow, lambda.Configuration.FunctionName);
                return that.lambda.updateFunctionCodeAsyncB({
                  FunctionName: that.config.lambda.FunctionName,
                  ZipFile: fs.readFileSync(file)
                });
              });
          }, function(err) {
            if (err.statusCode !== 404) {
              throw err;
            }

            logger.info(('create lambda %s').green, that.config.lambda.FunctionName);
            var params = _.merge({
              Runtime: 'nodejs',
              Code: {
                ZipFile: fs.readFileSync(file)
              }
            }, that.config.lambda);

            return that.lambda.createFunctionAsyncB(params);
          });
      }, function(err) {
        logger.info((err.message).red);
        throw err;
      });
  },

  addLambdaPermission: function() {
    var that = this;

    debug('updateLambdaPermission called');

    return this.lambda.getFunctionAsyncB({FunctionName: this.config.lambda.FunctionName})
      .then(function(lambda) {
        logger.info('found lambda ' + lambda.Configuration.FunctionName + ' ' + lambda.Configuration.FunctionArn);
        var accountId = lambda.Configuration.FunctionArn.split(':')[4];
        return Promise.all([that.lambda.removePermissionAsyncB({
          FunctionName: that.config.lambda.FunctionName,
          StatementId: 'ExecuteFromApiGateway'
        })])
        .then(function() {
          return that.lambda.addPermissionAsyncB({
            FunctionName: that.config.lambda.FunctionName,
            Principal: 'apigateway.amazonaws.com',
            StatementId: 'ExecuteFromApiGateway',
            Action: 'lambda:InvokeFunction',
            SourceArn: 'arn:aws:execute-api:' + that.lambda.config.region + ':' + accountId + ':*'
          });
        });
      }, function(err) {
        logger.info(('cannot find lambda ' + that.config.lambda.FunctionName).red);
        throw err;
      });
  }
};

module.exports = function(config, api) {
  return new AglexLib(config, api);
};
