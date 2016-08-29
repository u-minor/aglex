import _ from 'lodash'
import Debug from 'debug'
import Promise from 'bluebird'

const debug = Debug('aglex.apiGateway.method')

import {integration} from './integration'
import {methodResponse} from './methodResponse'

export const method = api => {
  const Integration = integration(api)
  const MethodResponse = methodResponse(api)

  class Method {
    constructor (resource, data) {
      this._resource = resource
      _.merge(this, data)

      if (this.methodIntegration) {
        this.methodIntegration = new Integration(this, this.methodIntegration)
      }
      if (this.methodResponses) {
        const responses = {}
        _.forEach(this.methodResponses, (val, key) => {
          responses[key] = new MethodResponse(this, val)
        })
        this.methodResponses = responses
      }
    }

    createIntegration (params) {
      return Integration.create(this, params).then(integration => {
        this.methodIntegration = integration
      })
    }

    createMethodResponse (params) {
      return MethodResponse.create(this, params).then(response => {
        if (!this.methodResponses) {
          this.methodResponses = {}
        }
        this.methodResponses[params.statusCode] = response
      })
    }

    delete () {
      return Promise.delay(250)
      .then(() => api.deleteMethodAsync({
        httpMethod: this.httpMethod,
        resourceId: this._resource.id,
        restApiId: this._resource._restApi.id
      }))
    }

    updateIntegration (params) {
      return this.methodIntegration.update(params)
    }

    updateMethodResponse (params) {
      return this.methodResponses[params.statusCode].update(params)
    }
  }

  Method.create = (resource, params) => {
    const obj = _.merge({
      resourceId: resource.id,
      restApiId: resource._restApi.id
    }, params)

    return Promise.delay(250)
    .then(() => api.putMethodAsync(obj))
    .then(data => {
      debug(data)
      return new Method(resource, data)
    })
  }

  return Method
}
