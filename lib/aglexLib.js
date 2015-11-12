var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var AWS = require('aws-sdk');
var Q = require('q');
var colors = require('colors');
var debug = require('debug')('aglex.lib');
var logger = require('winston');

var apiGateway = require('./apiGateway');
var lambda = require('./lambda');
var config = require('./config');

var AglexLib = function(conf, logLevel) {
  logger.remove(logger.transports.Console);
  logger.add(logger.transports.Console, {showLevel: false, colorize: false});
  logger.level = logLevel || 'none';

  if (conf.config.profile) {
    var creds = new AWS.SharedIniFileCredentials({profile: conf.config.profile});
    conf.config.accessKeyId = creds.accessKeyId;
    conf.config.secretAccessKey = creds.secretAccessKey;
  }
  this.apiGateway = apiGateway(conf.config);
  this.lambda = lambda(conf.config);
  this.config = conf;
  this.lambdaFunction = undefined;

  config.normalizeResources(this.config.apiGateway.resources);
  config.normalizeMethods(this.config.apiGateway.resources, this.config.apiGateway.methodDefinitions);
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

    return Q();
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
      return arr.reduce(Q.when, Q());
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
    return arr.reduce(Q.when, Q());
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
      return arr.reduce(Q.when, Q());
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
    return arr.reduce(Q.when, Q());
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

      return arr.reduce(Q.when, Q());
    });
  },

  checkResources: function(api) {
    var dfd = Q.defer();
    var that = this;
    var config = this.config.apiGateway;

    debug('checkResources called');

    var getResource = function() {
      api.resources().done(function(resources) {
        // delete unused resource
        var promises = [];
        var resourceHash = {};
        _.forEach(resources, function(resource) {
          if (!config.resources[resource.path]) {
            logger.info(('delete resource ' + resource.path).red);
            promises.push(resource.delete());
          } else {
            resourceHash[resource.path] = resource;
          }
        });

        // create unregistered resource
        var arr = [];
        _.forEach(Object.keys(config.resources).sort(), function(resource) {
          if (!_.find(resources, {path: resource})) {
            arr.push(that.generateCreateResourceFunc(api, resource, resourceHash));
          }
        });

        if (promises.length) {
          Q.all(promises).then(recheck);
          return;
        }
        if (arr.length) {
          arr.reduce(Q.when, Q()).then(recheck);
          return;
        }

        dfd.resolve(resources);
      });
    };
    var recheck = function() {
      setTimeout(getResource(), 250);
    };
    getResource();

    return dfd.promise;
  },

  generateCreateResourceFunc: function(restApi, resource, resourceHash) {
    var parentPath = path.dirname(resource);
    var pathName = path.basename(resource);
    var that = this;

    debug('generateWaterFallFunc called: %s', resource);

    return function() {
      logger.info(('create resource ' + resource).green);
      return restApi.createResource({
        parentId: resourceHash[parentPath].id,
        pathPart: pathName
      }).then(function(resource) {
        resourceHash[resource.path] = resource;
        return resource;
      });
    };
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

  getLambda: function() {
    var that = this;

    debug('getLambda called');

    return this.lambda.getFunction({FunctionName: this.config.lambda.FunctionName})
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

    var iam = new AWS.IAM(this.config.config);
    var promiseRole = (function() {
      var dfd = Q.defer();
      iam.getRole({RoleName: that.config.lambda.RoleName}, function(err, data) {
        if (err) {
          dfd.reject(err);
        } else {
          dfd.resolve(data.Role);
        }
      });
      return dfd.promise;
    })();

    return promiseRole
      .then(function(role) {
        logger.info('found lambda execution role %s', role.Arn);
        // replace RoleName -> Role (ARN)
        that.config.lambda.Role = role.Arn;
        delete that.config.lambda.RoleName;

        return that.lambda.getFunction({FunctionName: that.config.lambda.FunctionName})
          .then(function(lambda) {
            logger.info(('update configuration for %s').yellow, lambda.Configuration.FunctionName);
            return that.lambda.updateFunctionConfiguration(that.config.lambda)
              .then(function() {
                logger.info(('update function code for %s').yellow, lambda.Configuration.FunctionName);
                return that.lambda.updateFunctionCode({
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

            return that.lambda.createFunction(params);
          });
      }, function(err) {
        logger.info((err.message).red);
        throw err;
      });
  },

  addLambdaPermission: function() {
    var that = this;

    debug('updateLambdaPermission called');

    return this.lambda.getFunction({FunctionName: this.config.lambda.FunctionName})
      .then(function(lambda) {
        logger.info('found lambda ' + lambda.Configuration.FunctionName + ' ' + lambda.Configuration.FunctionArn);
        var accountId = lambda.Configuration.FunctionArn.split(':')[4];
        return Q.allSettled([that.lambda.removePermission({
          FunctionName: that.config.lambda.FunctionName,
          StatementId: 'ExecuteFromApiGateway'
        })])
        .then(function() {
          return that.lambda.addPermission({
            FunctionName: that.config.lambda.FunctionName,
            Principal: 'apigateway.amazonaws.com',
            StatementId: 'ExecuteFromApiGateway',
            Action: 'lambda:InvokeFunction',
            SourceArn: 'arn:aws:execute-api:' + that.config.config.region + ':' + accountId + ':*'
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
