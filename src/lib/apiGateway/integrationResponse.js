import _ from 'lodash'
import Debug from 'debug'
import Promise from 'bluebird'

const debug = Debug('aglex.apiGateway.integrationResponse')

export const integrationResponse = api => {
  class IntegrationResponse {
    constructor (integration, data) {
      this._integration = integration
      _.merge(this, data)
    }

    update (params) {
      return this.delete()
      .then(() => IntegrationResponse.create(this._integration, params))
      .then(integrationResponse => {
        _.forEach(this, (val, key) => {
          delete this[key]
        })
        _.forEach(integrationResponse, (val, key) => {
          this[key] = val
        })
        return this
      })
    }

    delete () {
      return Promise.delay(250)
      .then(() => api.deleteIntegrationResponseAsync({
        httpMethod: this._integration._method.httpMethod,
        resourceId: this._integration._method._resource.id,
        restApiId: this._integration._method._resource._restApi.id,
        statusCode: this.statusCode
      }))
    }
  }

  IntegrationResponse.create = (integration, params) => {
    const obj = _.merge({
      httpMethod: integration._method.httpMethod,
      resourceId: integration._method._resource.id,
      restApiId: integration._method._resource._restApi.id
    }, params)

    return Promise.delay(250)
    .then(() => api.putIntegrationResponseAsync(obj))
    .then(data => {
      debug(data)
      return new IntegrationResponse(integration, data)
    })
  }

  return IntegrationResponse
}
