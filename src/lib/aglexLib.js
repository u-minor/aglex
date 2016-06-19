import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import AWS from 'aws-sdk'
import Debug from 'debug'
import Promise from 'bluebird'
import logger from 'winston'
import apiGateway from './apiGateway'
import util from './util'

require('colors')
const debug = Debug('aglex.lib')

class AglexLib {
  constructor (conf, logLevel) {
    logger.remove(logger.transports.Console)
    logger.add(logger.transports.Console, {showLevel: false, colorize: false})
    logger.level = logLevel || 'none'

    AWS.config.update({region: conf.config.region || 'us-east-1'})
    if (conf.config.accessKeyId && conf.config.secretAccessKey) {
      AWS.config.credentials = new AWS.Credentials(conf.config.accessKeyId, conf.config.secretAccessKey)
    } else if (conf.config.profile) {
      AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: conf.config.profile})
    } else {
      AWS.config.credentials = new AWS.SharedIniFileCredentials()
    }

    this.apiGateway = apiGateway()
    this.lambda = Promise.promisifyAll(new AWS.Lambda(), {suffix: 'AsyncB'})
    this.config = conf
    this.lambdaFunction = undefined

    util.normalizeResources(this.config.apiGateway.resources)
    util.normalizeMethods(this.config.apiGateway.resources, this.config.apiGateway.methodDefinitions)
  }

  checkIntegration (method) {
    debug('checkIntegration called - method:%s resource:%s', method.httpMethod, method._resource.path)

    return this.checkIntegrationRequest(method)
    .then(() => this.checkMethodResponses(method))
    .then(() => this.checkIntegrationResponses(method.methodIntegration))
  }

  checkIntegrationRequest (method) {
    const integrationConfig = this.config.apiGateway.resources[method._resource.path][method.httpMethod].request

    debug('checkIntegrationRequest called - method:%s resource:%s', method.httpMethod, method._resource.path)

    if (!method.methodIntegration) {
      logger.info((`create integration request for ${method.httpMethod}:${method._resource.path} ...`).green)
      return method.createIntegration(integrationConfig)
    }

    let needUpdate = false
    _.forEach(integrationConfig, (val, key) => {
      if (key === 'integrationHttpMethod') {
        key = 'httpMethod'
      }
      if (!_.isEqual(method.methodIntegration[key], val)) {
        needUpdate = true
      }
    })

    if (needUpdate) {
      logger.info((`update integration request for ${method.httpMethod}:${method._resource.path}`).yellow)
      return method.updateIntegration(integrationConfig)
    }

    return Promise.resolve()
  }

  checkIntegrationResponses (integration) {
    const method = integration._method
    const resource = method._resource
    const resConfig = this.config.apiGateway.resources[resource.path][method.httpMethod].responses
    const arr = []

    debug('checkIntegrationResponses called - method:%s resource:%s', method.httpMethod, method._resource.path)

    if (!integration.integrationResponses) {
      _.forEach(resConfig, (rval, rkey) => {
        logger.info((`create integration response status:${rkey} for ${method.httpMethod}:${resource.path} ...`).green)
        const resParams = {}
        _.forEach(rval.responseHeaders, (hval, hkey) => {
          resParams[`method.response.header.${hkey}`] = hval
        })
        const obj = {
          statusCode: rkey,
          responseParameters: resParams,
          responseTemplates: rval.responseTemplates || {'application/json': ''}
        }
        if (rval.selectionPattern) {
          obj.selectionPattern = rval.selectionPattern
        }

        arr.push(() => integration.createIntegrationResponse(obj))
      })
      return reducePromises(arr)
    }

    _.forEach(resConfig, (obj, statusCode) => {
      // check difference
      let needUpdate = false
      const ir = integration.integrationResponses[statusCode]
      const resParams = {}
      _.forEach(obj.responseHeaders, (hval, hkey) => {
        resParams[`method.response.header.${hkey}`] = hval
      })
      _.defaults(obj, {
        responseTemplates: {'application/json': ''}
      })

      if (!_.isEqual(ir.selectionPattern, obj.selectionPattern)) {
        needUpdate = true
      }
      if (!_.isEqual(ir.responseParameters, resParams)) {
        needUpdate = true
      }
      const templates = _.cloneDeep(ir.responseTemplates)
      _.forEach(templates, (val, key) => {
        if (val === null) {
          templates[key] = ''
        }
      })
      if (!_.isEqual(templates, obj.responseTemplates)) {
        needUpdate = true
      }
      if (needUpdate) {
        logger.info((`update integration response status:${statusCode} for ${method.httpMethod}:${resource.path}`).yellow)
        arr.push(() => ir.update({
          statusCode,
          selectionPattern: obj.selectionPattern,
          responseParameters: resParams,
          responseTemplates: obj.responseTemplates
        }))
      }
    })
    return reducePromises(arr)
  }

  checkMethodResponses (method) {
    debug('checkMethodResponses called - method:%s resource:%s', method.httpMethod, method._resource.path)

    if (!method.methodResponses) {
      return this.createMethodResponses(method)
    }

    const resource = method._resource
    const resConfig = this.config.apiGateway.resources[resource.path][method.httpMethod].responses
    let p = Promise.resolve()

    // delete unused methodResponse
    _.forEach(method.methodResponses, (methodResponse, statusCode) => {
      if (!resConfig[statusCode]) {
        logger.info((`delete method response status:${statusCode} for ${method.httpMethod}:${resource.path} ...`).red)
        p = p.then(() => methodResponse.delete().then(() => {
          delete method.methodResponses[statusCode]
        }))
      }
    })

    // check difference
    _.forEach(resConfig, (resConfig, statusCode) => {
      _.defaults(resConfig, {
        responseModels: {'application/json': 'Empty'}
      })
      const resParams = {}
      _.forEach(resConfig.responseHeaders, (hval, hkey) => {
        resParams[`method.response.header.${hkey}`] = false
      })
      const methodResponse = method.methodResponses[statusCode]

      if (!methodResponse) {
        p = p.then(() => {
          logger.info((`create method response status:${statusCode} for ${method.httpMethod}:${resource.path} ...`).green)
          return method.createMethodResponse({
            statusCode,
            responseModels: resConfig.responseModels || {'application/json': 'Empty'},
            responseParameters: resParams
          })
        })
        return
      }

      let needUpdate = false
      if (!_.isEqual(methodResponse.responseModels, resConfig.responseModels)) {
        needUpdate = true
      }
      if (!_.isEqual(methodResponse.responseParameters, resParams)) {
        needUpdate = true
      }
      if (needUpdate) {
        p = p.then(() => {
          logger.info((`update method response status:${statusCode} for ${method.httpMethod}:${resource.path}`).yellow)
          return methodResponse.update({
            statusCode,
            responseModels: resConfig.responseModels,
            responseParameters: resParams
          })
        })
      }
    })
    return p
  }

  checkMethods (resource) {
    debug('checkMethods called - resource:%s', resource.path)

    return resource.methods()
    .then(methods => this.deleteMethods(resource, methods))
    .then(methods => this.createMethods(resource, methods))
    .then(methods => {
      const arr = []
      for (let method of methods) {
        arr.push(() => this.checkIntegration(method))
      }
      return reducePromises(arr)
    })
  }

  checkResources (api) {
    debug('checkResources called')

    return api.resources()
    .then(resources => this.deleteResources(api, resources))
    .then(resources => this.createResources(api, resources))
  }

  createMethodResponses (method) {
    const resource = method._resource
    const resConfig = this.config.apiGateway.resources[resource.path][method.httpMethod].responses
    let p = Promise.resolve()

    _.forEach(resConfig, (rval, rkey) => {
      p = p.then(() => {
        logger.info((`create method response status:${rkey} for ${method.httpMethod}:${resource.path} ...`).green)
        const resParams = {}
        _.forEach(rval.responseHeaders, (hval, hkey) => {
          resParams[`method.response.header.${hkey}`] = false
        })

        return method.createMethodResponse({
          statusCode: rkey,
          responseModels: rval.responseModels || {'application/json': 'Empty'},
          responseParameters: resParams
        })
      })
    })
    return p
  }

  createMethods (resource, methods) {
    const config = this.config.apiGateway
    const arr = []

    _.forEach(config.resources[resource.path], (methodConfig, methodName) => {
      if (_.find(methods, {httpMethod: methodName})) {
        return
      }

      const reqParams = {}
      _.forEach(resource.path.match(/\{.+?\}/g), match => {
        reqParams[`method.request.path.${match.replace(/[{}]/g, '')}`] = true
      })
      logger.info((`create method ${methodName} for ${resource.path}`).green)
      arr.push(() => resource.createMethod({
        authorizationType: methodConfig.authorizationType || 'NONE',
        httpMethod: methodName,
        apiKeyRequired: methodConfig.apiKeyRequired || false,
        requestModels: methodConfig.requestModels || null,
        requestParameters: reqParams || null
      }).then(method => methods.push(method)))
    })

    return reducePromises(arr).then(() => methods)
  }

  createResources (api, resources) {
    const config = this.config.apiGateway

    // create unregistered resource
    const resourceHash = {}
    let p = Promise.resolve()
    let added = false

    _.forEach(resources, resource => {
      resourceHash[resource.path] = resource
    })
    _.forEach(Object.keys(config.resources).sort(), resource => {
      if (!_.find(resources, {path: resource})) {
        logger.info((`create resource ${resource}`).green)
        p = p.then(() => api.createResource({
          parentId: resourceHash[path.dirname(resource)].id,
          pathPart: path.basename(resource)
        })
        .then(resource => {
          resourceHash[resource.path] = resource
          return
        }))
        added = true
      }
    })
    if (added) {
      return p.then(() => api.resources())
    }
    return resources
  }

  deleteMethods (resource, methods) {
    const config = this.config.apiGateway
    const promises = []
    const activeMethods = []

    // delete unused method
    _.forEach(methods, method => {
      if (config.resources[resource.path][method.httpMethod]) {
        activeMethods.push(method)
      } else {
        logger.info((`delete method ${method.httpMethod} for ${resource.path}`).red)
        promises.push(() => method.delete())
      }
    })

    return reducePromises(promises).then(() => activeMethods)
  }

  deleteResources (api, resources) {
    const config = this.config.apiGateway

    // delete unused resource
    let p = Promise.resolve()
    let deleted = false

    _.forEach(resources, resource => {
      if (!config.resources[resource.path]) {
        logger.info((`delete resource ${resource.path}`).red)
        p = p.then(() => resource.delete())
        deleted = true
      }
    })

    if (deleted) {
      return p.then(() => api.resources())
    }
    return resources
  }

  deployApi (description, stageName, stageDescription) {
    debug('deployApi called')

    return this.apiGateway.RestApi.findByName(this.config.apiGateway.name)
    .then(api => {
      if (!api) {
        logger.info((`cannot find api ${this.config.apiGateway.name}`).red)
        throw new Error('Error')
      }
      return api.createDeployment({
        stageName,
        description,
        stageDescription
      })
    })
  }

  getApi () {
    debug('getApi called')

    return this.apiGateway.RestApi.findByName(this.config.apiGateway.name)
    .then(api => {
      if (api) {
        logger.info(`found restApi ${api.name} ${api.id}`)
        return api
      }

      logger.info((`create restApi ${this.config.apiGateway.name}`).green)
      return this.apiGateway.RestApi.create({
        name: this.config.apiGateway.name,
        description: this.config.apiGateway.description
      })
    })
  }

  getApiStages () {
    debug('getApiStages called')

    return this.apiGateway.RestApi.findByName(this.config.apiGateway.name)
    .then(api => {
      if (!api) {
        logger.info((`cannot find api ${this.config.apiGateway.name}`).red)
        throw new Error('Error')
      }
      return api.stages()
    })
  }

  getLambda () {
    debug('getLambda called')

    return this.lambda.getFunctionAsyncB({
      FunctionName: this.config.lambda.FunctionName
    })
    .then(lambda => {
      logger.info(`found lambda ${lambda.Configuration.FunctionName} ${lambda.Configuration.FunctionArn}`)
      util.normalizeRequestTemplates(this.config.apiGateway.resources, this.config.config.region, lambda.Configuration.FunctionArn)
      this.lambdaFunction = lambda
      return lambda
    }, err => {
      logger.info((`cannot find lambda ${this.config.lambda.FunctionName}`).red)
      throw err
    })
  }

  updateLambda (file) {
    debug('updateLambda called')

    const iam = Promise.promisifyAll(new AWS.IAM())
    return iam.getRoleAsync({
      RoleName: this.config.lambda.RoleName
    })
    .then(data => {
      logger.info('found lambda execution role %s', data.Role.Arn)
      // replace RoleName -> Role (ARN)
      this.config.lambda.Role = data.Role.Arn
      delete this.config.lambda.RoleName

      return this.lambda.getFunctionAsyncB({
        FunctionName: this.config.lambda.FunctionName
      })
      .then(lambda => {
        logger.info(`found lambda ${lambda.Configuration.FunctionName}`)
        logger.info(('update configuration for %s').yellow, lambda.Configuration.FunctionName)
        return this.lambda.updateFunctionConfigurationAsyncB(this.config.lambda)
        .then(() => {
          logger.info(('update function code for %s').yellow, lambda.Configuration.FunctionName)
          return this.lambda.updateFunctionCodeAsyncB({
            FunctionName: this.config.lambda.FunctionName,
            ZipFile: fs.readFileSync(file)
          })
        })
      }, err => {
        if (err.statusCode !== 404) {
          throw err
        }

        logger.info(('create lambda %s').green, this.config.lambda.FunctionName)
        const params = _.merge({
          Runtime: 'nodejs',
          Code: {
            ZipFile: fs.readFileSync(file)
          }
        }, this.config.lambda)

        return this.lambda.createFunctionAsyncB(params)
      })
    }, err => {
      logger.info((err.message).red)
      throw err
    })
  }

  addLambdaPermission () {
    debug('updateLambdaPermission called')

    return this.lambda.getFunctionAsyncB({
      FunctionName: this.config.lambda.FunctionName
    })
    .then(lambda => {
      logger.info(`found lambda ${lambda.Configuration.FunctionName} ${lambda.Configuration.FunctionArn}`)
      const accountId = lambda.Configuration.FunctionArn.split(':')[4]
      return this.lambda.removePermissionAsyncB({
        FunctionName: this.config.lambda.FunctionName,
        StatementId: 'ExecuteFromApiGateway'
      })
      .then(() => {}, () => {})
      .then(() => this.lambda.addPermissionAsyncB({
        FunctionName: this.config.lambda.FunctionName,
        Principal: 'apigateway.amazonaws.com',
        StatementId: 'ExecuteFromApiGateway',
        Action: 'lambda:InvokeFunction',
        SourceArn: `arn:aws:execute-api:${this.lambda.config.region}:${accountId}:*`
      }))
    }, err => {
      logger.info((`cannot find lambda ${this.config.lambda.FunctionName}`).red)
      throw err
    })
  }
}

var reducePromises = arr => Promise.reduce(arr, (_, task) => task(), null)

export default (config, api) => new AglexLib(config, api)
