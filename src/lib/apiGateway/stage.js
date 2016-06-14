import _ from 'lodash'

export class Stage {
  constructor (restApi, data) {
    this._restApi = restApi
    _.merge(this, data)
  }
}
