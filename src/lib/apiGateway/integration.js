import _ from 'lodash'
import Debug from 'debug'
import Promise from 'bluebird'

const debug = Debug('aglex.apiGateway.integration')

import {integrationResponse} from './integrationResponse'

export const integration = api => {
  const IntegrationResponse = integrationResponse(api)

  class Integration {
    constructor (method, data) {
      this._method = method
      _.merge(this, data)

      if (this.integrationResponses) {
        const responses = {}
        _.forEach(this.integrationResponses, (val, key) => {
          responses[key] = new IntegrationResponse(this, val)
        })
        this.integrationResponses = responses
      }
    }

    createIntegrationResponse (params) {
      return IntegrationResponse.create(this, params)
      .then(response => {
        if (!this.integrationResponses) {
          this.integrationResponses = {}
        }
        this.integrationResponses[params.statusCode] = response
      })
    }

    update (params) {
      return Integration.create(this._method, params)
      .then(integration => {
        _.forEach(this, (val, key) => {
          delete this[key]
        })
        _.forEach(integration, (val, key) => {
          this[key] = val
        })
        return this
      })
    }
  }

  Integration.create = (method, params) => {
    const obj = _.merge({
      httpMethod: method.httpMethod,
      resourceId: method._resource.id,
      restApiId: method._resource._restApi.id
    }, params)

    return Promise.delay(200)
    .then(() => api.putIntegrationAsync(obj))
    .then(data => {
      debug(data)
      return new Integration(method, data)
    })
  }

  return Integration
}
