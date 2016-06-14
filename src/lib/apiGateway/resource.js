import _ from 'lodash'
import Debug from 'debug'
import Promise from 'bluebird'

import {method} from './method'

const debug = Debug('aglex.apiGateway.resource')

export const resource = api => {
  const Method = method(api)

  class Resource {
    constructor (restApi, data) {
      this._restApi = restApi
      _.merge(this, data)
    }

    createMethod (params) {
      return Method.create(this, params)
    }

    delete () {
      return api.deleteResourceAsync({
        resourceId: this.id,
        restApiId: this._restApi.id
      })
    }

    methods () {
      const promises = []

      _.forEach(this.resourceMethods, (dummy, method) => {
        const p = api.getMethodAsync({
          httpMethod: method,
          resourceId: this.id,
          restApiId: this._restApi.id
        }).then(data => {
          debug(data)
          return new Method(this, data)
        })
        promises.push(p)
      })

      return Promise.all(promises)
    }
  }

  Resource.create = (restApi, params) => {
    const obj = _.merge({
      restApiId: restApi.id
    }, params)

    return api.createResourceAsync(obj)
    .then(data => {
      debug(data)
      return new Resource(restApi, data)
    })
  }

  return Resource
}
