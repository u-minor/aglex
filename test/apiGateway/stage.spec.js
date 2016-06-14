import { expect, sinon } from '../helper'
import {Stage} from '../../src/lib/apiGateway/stage'

describe('stage', () => {
  const RestApi = class {}
  const restApi = new RestApi()
  const stage = new Stage(restApi, {
    stageName: 'foo',
    deploymentId: '123abc',
    createdDate: 'Fri, 01 Jan 2016 00:00:00 GMT'
  })
  const sb = sinon.sandbox.create()

  before(() => {
    restApi.id = '12345abcde'
  })

  afterEach(() => {
    sb.restore()
  })

  describe('constructor', () => {
    it('should generate a valid object', () => {
      expect(stage._restApi).to.equal(restApi)
      expect(stage).to.have.property('stageName', 'foo')
      expect(stage).to.have.property('deploymentId', '123abc')
      expect(stage).to.have.property('createdDate', 'Fri, 01 Jan 2016 00:00:00 GMT')
    })
  })
})
