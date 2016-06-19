import { AWS, expect, sinon } from '../helper'
import * as lib from '../../src/lib/apiGateway/stage'

describe('stage', () => {
  const apiGateway = new AWS.APIGateway()
  const RestApi = class {}
  const restApi = new RestApi()
  const Stage = lib.stage(apiGateway)
  const sb = sinon.sandbox.create()

  before(() => {
    restApi.id = '12345abcde'
  })

  afterEach(() => {
    sb.restore()
  })

  describe('constructor', () => {
    it('should generate a valid object', () => {
      const stage = new Stage(restApi, {
        stageName: 'foo',
        deploymentId: '123abc',
        createdDate: 'Fri, 01 Jan 2016 00:00:00 GMT'
      })

      expect(stage._restApi).to.equal(restApi)
      expect(stage).to.have.property('invokeUrl', 'https://12345abcde.execute-api.us-east-1.amazonaws.com/foo')
      expect(stage).to.have.property('stageName', 'foo')
      expect(stage).to.have.property('deploymentId', '123abc')
      expect(stage).to.have.property('createdDate', 'Fri, 01 Jan 2016 00:00:00 GMT')
    })
  })
})
