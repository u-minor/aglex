import fs from 'fs'
import path from 'path'
import Debug from 'debug'
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
  }

  updateApi () {
    debug('updateApi called')
    const lib = aglexLib(this.config, this.logLevel)
    return lib.getLambda()
    .then(lambda => lib.updateApi())
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

  generateLambdaHandler () {
    return fs.readFileSync(path.resolve(__dirname, '../../config/lambda.js'), 'utf8')
  }
}

export default (config, logLevel) => new Aglex(config, logLevel)
