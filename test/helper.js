import _ from 'lodash'
import chai, {expect} from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'

require('sinon-as-promised')
chai.use(chaiAsPromised)
chai.use(sinonChai)

const AWS = {
  config: {
    update: () => {}
  },

  APIGateway: class {
    constructor () {
      this.config = {
        region: 'us-east-1'
      }
    }
    createDeployment () {}
    getRestApis () {}
    getStages () {}
    importRestApi () {}
    putRestApi () {}
  },
  Credentials: () => {},
  IAM: () => AWS._stub_.IAM,
  Lambda: () => AWS._stub_.Lambda,
  SharedIniFileCredentials: () => {},

  _stub_: {
    IAM: {
      getRole: () => {}
    },
    Lambda: {
      config: {},
      addPermission: () => {},
      createFunction: () => {},
      getFunction: () => {},
      removePermission: () => {},
      updateFunctionCode: () => {},
      updateFunctionConfiguration: () => {}
    }
  }
}

export { _, AWS, expect, sinon }
