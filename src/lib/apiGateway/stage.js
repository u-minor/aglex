import _ from 'lodash'

export const stage = api => {
  class Stage {
    constructor (restApi, data) {
      this._restApi = restApi
      _.merge(this, data)
      this.invokeUrl = `https://${restApi.id}.execute-api.${api.config.region}.amazonaws.com/${this.stageName}`
    }
  }

  return Stage
}
