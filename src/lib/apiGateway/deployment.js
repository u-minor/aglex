import _ from 'lodash'
import Debug from 'debug'

const debug = Debug('aglex.apiGateway.deployment')

export const deployment = api => {
  class Deployment {
    constructor (restApi, data) {
      this._restApi = restApi
      _.merge(this, data)
    }
  }

  Deployment.create = (restApi, params) => {
    const obj = _.merge({
      restApiId: restApi.id
    }, params)

    return api.createDeployment(obj).promise()
    .then(data => {
      debug(data)
      return new Deployment(restApi, data)
    })
  }

  return Deployment
}
