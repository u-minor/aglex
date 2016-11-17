import _ from 'lodash'
import Debug from 'debug'

const debug = Debug('aglex.apiGateway.restApi')

import {deployment} from './deployment'
import {stage} from './stage'

export const restApi = api => {
  const Deployment = deployment(api)
  const Stage = stage(api)

  class RestApi {
    constructor (data) {
      _.merge(this, data)
    }

    createDeployment (params) {
      return Deployment.create(this, params)
    }

    stages () {
      return api.getStages({
        restApiId: this.id
      }).promise()
      .then(data => {
        debug(data)
        const arr = []
        _.forEach(data.item, item => {
          arr.push(new Stage(this, item))
        })
        return _.sortBy(arr, 'stageName')
      })
    }

    update (definition) {
      return api.putRestApi({
        body: JSON.stringify(definition),
        failOnWarnings: true,
        mode: 'overwrite',
        restApiId: this.id
      }).promise()
      .then(data => {
        _.merge(this, data)
        return this
      })
    }
  }

  RestApi.create = definition => api.importRestApi({
    body: JSON.stringify(definition),
    failOnWarnings: true
  }).promise()
  .then(data => {
    debug(data)
    return new RestApi(data)
  })

  RestApi.findByName = name => api.getRestApis().promise()
  .then(data => {
    debug(data)
    const api = _.find(data.items, {name})
    if (!api) {
      return null
    }
    return new RestApi(api)
  })

  return RestApi
}
