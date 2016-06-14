import fs from 'fs'
import path from 'path'
import Debug from 'debug'
import Promise from 'bluebird'
import aglexLib from './aglexLib'

const debug = Debug('aglex.core')

class Aglex {
  constructor (config, logLevel) {
    this.config = config
    this.logLevel = logLevel
  }

  deployApi (description, stageName, stageDescription) {
    debug('deployApi called')
    const lib = aglexLib(this.config, this.logLevel)
    return lib.deployApi(description, stageName, stageDescription)
  }

  getApiStages () {
    debug('getApiStages called')
    const lib = aglexLib(this.config, this.logLevel)
    return lib.getApiStages()
    .then(stages => {
      const data = {}
      for (let stage of stages) {
        data[stage.stageName] = stage.description
      }
      return data
    })
  }

  updateApi () {
    debug('updateApi called')
    const lib = aglexLib(this.config, this.logLevel)
    return lib.getLambda()
    .then(lambda => lib.getApi())
    .then(api => lib.checkResources(api))
    .then(resources => {
      return Promise.reduce(resources, (_, resource) => lib.checkMethods(resource), null)
    })
  }

  updateLambda (file) {
    debug('updateLambda called')
    const lib = aglexLib(this.config, this.logLevel)
    return lib.updateLambda(file)
  }

  addLambdaPermission () {
    debug('addLambdaPermission called')
    const lib = aglexLib(this.config, this.logLevel)
    return lib.addLambdaPermission()
  }

  generateConfig () {
    return fs.readFileSync(path.resolve(__dirname, '../../config/config.yml'), 'utf8')
  }

  generateLambdaHandler (coffee) {
    let content = fs.readFileSync(path.resolve(__dirname, '../../config/lambda.coffee'), 'utf8')
    if (!coffee) {
      content = require('coffee-script').compile(content, {bare: true})
    }
    return content.trim()
  }
}

export default (config, logLevel) => new Aglex(config, logLevel)
