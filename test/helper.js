import _ from 'lodash'
import Promise from 'bluebird'
import chai, {expect} from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import chaiAsPromised from 'chai-as-promised'
import checkChai from 'check-chai'
chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(checkChai)

const check = chai.check
const AWS = {
  config: {
    update: () => {}
  },

  APIGateway: class {
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

export { _, AWS, Promise, check, expect, sinon }
