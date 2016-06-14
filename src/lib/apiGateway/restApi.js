import _ from 'lodash'
import Debug from 'debug'

const debug = Debug('aglex.apiGateway.restApi')

import {resource} from './resource'
import {deployment} from './deployment'
import {Stage} from './stage'

export const restApi = api => {
  const Resource = resource(api)
  const Deployment = deployment(api)

  class RestApi {
    constructor (data) {
      _.merge(this, data)
    }

    createDeployment (params) {
      return Deployment.create(this, params)
    }

    createResource (params) {
      return Resource.create(this, params)
    }

    resources () {
      return api.getResourcesAsync({
        restApiId: this.id,
        limit: 500
      }).then(data => {
        const arr = []
        debug(data)
        _.forEach(data.items, item => {
          arr.push(new Resource(this, item))
        })
        return _.sortBy(arr, 'path')
      })
    }

    stages () {
      return api.getStagesAsync({
        restApiId: this.id
      }).then(data => {
        debug(data)
        const arr = []
        _.forEach(data.item, item => {
          arr.push(new Stage(this, item))
        })
        return _.sortBy(arr, 'stageName')
      })
    }
  }

  RestApi.create = params => api.createRestApiAsync(params)
  .then(data => {
    debug(data)
    return new RestApi(data)
  })

  RestApi.findByName = name => api.getRestApisAsync()
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
