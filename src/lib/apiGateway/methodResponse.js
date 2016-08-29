import _ from 'lodash'
import Debug from 'debug'
import Promise from 'bluebird'

const debug = Debug('aglex.apiGateway.methodResponse')

export const methodResponse = api => {
  class MethodResponse {
    constructor (method, data) {
      this._method = method
      _.merge(this, data)
    }

    delete () {
      return Promise.delay(250)
      .then(() => api.deleteMethodResponseAsync({
        httpMethod: this._method.httpMethod,
        resourceId: this._method._resource.id,
        restApiId: this._method._resource._restApi.id,
        statusCode: this.statusCode
      }))
    }

    update (params) {
      return this.delete()
      .then(() => MethodResponse.create(this._method, params))
      .then(methodResponse => {
        _.forEach(this, (val, key) => {
          delete this[key]
        })
        _.forEach(methodResponse, (val, key) => {
          this[key] = val
        })
        return this
      })
    }
  }

  MethodResponse.create = (method, params) => {
    const obj = _.merge({
      httpMethod: method.httpMethod,
      resourceId: method._resource.id,
      restApiId: method._resource._restApi.id
    }, params)

    return Promise.delay(250)
    .then(() => api.putMethodResponseAsync(obj))
    .then(data => {
      debug(data)
      return new MethodResponse(method, data)
    })
  }

  return MethodResponse
}
