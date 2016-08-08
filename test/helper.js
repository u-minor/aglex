import _ from 'lodash'
import Promise from 'bluebird'
import chai, {expect} from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'

require('sinon-as-promised')(Promise)
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
    createDeploymentAsync () {}
    createResourceAsync () {}
    createRestApiAsync () {}
    createStageAsync () {}
    deleteIntegrationResponseAsync () {}
    deleteMethodAsync () {}
    deleteMethodResponseAsync () {}
    deleteResourceAsync () {}
    getMethodAsync () {}
    getResourcesAsync () {}
    getRestApisAsync () {}
    getStagesAsync () {}
    putIntegrationAsync () {}
    putIntegrationResponseAsync () {}
    putMethodAsync () {}
    putMethodResponseAsync () {}
  },
  Credentials: () => {},
  IAM: () => AWS._stub_.IAM,
  Lambda: () => AWS._stub_.Lambda,
  SharedIniFileCredentials: () => {},

  _stub_: {
    IAM: {
      getRoleAsync: () => {}
    },
    Lambda: {
      config: {},
      addPermissionAsyncB: () => {},
      createFunctionAsyncB: () => {},
      getFunctionAsyncB: () => {},
      removePermissionAsyncB: () => {},
      updateFunctionCodeAsyncB: () => {},
      updateFunctionConfigurationAsyncB: () => {}
    }
  }
}

export { _, AWS, Promise, expect, sinon }
