import fs from 'fs'
import _ from 'lodash'
import AWS from 'aws-sdk'
import Debug from 'debug'
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
    this.lambda = new AWS.Lambda()
    this.config = conf
    this.lambdaFunction = undefined
  }

  deployApi (description, stageName, stageDescription) {
    debug('deployApi called')

    return this.apiGateway.RestApi.findByName(this.config.apiGateway.info.title)
    .then(api => {
      if (!api) {
        logger.info((`cannot find api ${this.config.apiGateway.info.title}`).red)
        throw new Error('Error')
      }
      logger.info(`found restApi ${api.name} ${api.id}`)
      return api.createDeployment({
        stageName,
        description,
        stageDescription
      })
    }, err => {
      logger.info((err.toString()).red)
      throw err
    })
  }

  updateApi () {
    debug('updateApi called')

    return this.apiGateway.RestApi.findByName(this.config.apiGateway.info.title)
    .then(api => {
      if (api) {
        logger.info(`found restApi ${api.name} ${api.id}, update`)
        return api.update(this.config.apiGateway)
      }

      logger.info((`create restApi ${this.config.apiGateway.info.title}`).green)
      return this.apiGateway.RestApi.create(this.config.apiGateway)
    }, err => {
      logger.info((err.toString()).red)
      throw err
    })
  }

  getApiStages () {
    debug('getApiStages called')

    return this.apiGateway.RestApi.findByName(this.config.apiGateway.info.title)
    .then(api => {
      if (!api) {
        logger.info((`cannot find api ${this.config.apiGateway.info.title}`).red)
        throw new Error('Error')
      }
      logger.info(`found restApi ${api.name} ${api.id}`)
      return api.stages()
    }, err => {
      logger.info((err.toString()).red)
      throw err
    })
  }

  getLambda () {
    debug('getLambda called')

    return this.lambda.getFunction({FunctionName: this.config.lambda.FunctionName}).promise()
    .then(lambda => {
      logger.info(`found lambda ${lambda.Configuration.FunctionName} ${lambda.Configuration.FunctionArn}`)
      util.normalizeApiDefinition(this.config.apiGateway, this.config.config.region, lambda.Configuration.FunctionArn)
      this.lambdaFunction = lambda
      return lambda
    }, err => {
      logger.info((err.toString()).red)
      throw err
    })
  }

  updateLambda (file) {
    debug('updateLambda called')

    const iam = new AWS.IAM()
    return iam.getRole({RoleName: this.config.lambda.RoleName}).promise()
    .then(data => {
      logger.info('found lambda execution role %s', data.Role.Arn)
      // replace RoleName -> Role (ARN)
      this.config.lambda.Role = data.Role.Arn
      delete this.config.lambda.RoleName

      return this.lambda.getFunction({FunctionName: this.config.lambda.FunctionName}).promise()
    }, err => {
      logger.info((err.toString()).red)
      throw err
    })
    .then(lambda => {
      logger.info(`found lambda ${lambda.Configuration.FunctionName}`)
      logger.info(('update configuration for %s').yellow, lambda.Configuration.FunctionName)
      return this.lambda.updateFunctionConfiguration(this.config.lambda).promise()
      .then(() => {
        logger.info(('update function code for %s').yellow, lambda.Configuration.FunctionName)
        return this.lambda.updateFunctionCode({
          FunctionName: this.config.lambda.FunctionName,
          ZipFile: fs.readFileSync(file)
        }).promise()
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

      return this.lambda.createFunction(params).promise()
    })
  }

  addLambdaPermission () {
    debug('updateLambdaPermission called')

    return this.lambda.getFunction({FunctionName: this.config.lambda.FunctionName}).promise()
    .then(lambda => {
      logger.info(`found lambda ${lambda.Configuration.FunctionName} ${lambda.Configuration.FunctionArn}`)
      const accountId = lambda.Configuration.FunctionArn.split(':')[4]
      return this.lambda.removePermission({
        FunctionName: this.config.lambda.FunctionName,
        StatementId: 'ExecuteFromApiGateway'
      }).promise()
      .catch(() => {})
      .then(() => this.lambda.addPermission({
        FunctionName: this.config.lambda.FunctionName,
        Principal: 'apigateway.amazonaws.com',
        StatementId: 'ExecuteFromApiGateway',
        Action: 'lambda:InvokeFunction',
        SourceArn: `arn:aws:execute-api:${this.lambda.config.region}:${accountId}:*`
      }).promise())
    }, err => {
      logger.info((err.toString()).red)
      throw err
    })
  }
}

export default (config, api) => new AglexLib(config, api)
