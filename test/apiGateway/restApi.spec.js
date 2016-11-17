import { AWS, expect, sinon } from '../helper'
import target, * as lib from '../../src/lib/apiGateway/restApi'

const stub = {
  deployment: class {
    static create () { return Promise.resolve() }
  },
  stage: class {}
}
target.__Rewire__('deployment', () => stub.deployment)
target.__Rewire__('stage', () => stub.stage)

describe('restApi', () => {
  const apiGateway = new AWS.APIGateway()
  const RestApi = lib.restApi(apiGateway)
  const restApi = new RestApi({
    id: '123abc',
    name: 'test_api'
  })
  const sb = sinon.sandbox.create()

  afterEach(() => {
    sb.restore()
  })

  it('should be a function', () => {
    expect(lib.restApi).to.be.a('function')
  })

  it('should return RestApi class', () => {
    expect(RestApi).to.be.a('function')
    expect(RestApi.name).to.equal('RestApi')
  })

  describe('RestApi.create', () => {
    it('should return promise object', () => {
      sb.stub(apiGateway, 'importRestApi').returns({
        promise: () => Promise.resolve()
      })

      const ret = RestApi.create({})

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with new RestApi object', () => {
      sb.stub(apiGateway, 'importRestApi').returns({
        promise: () => Promise.resolve({name: 'test_api'})
      })

      const ret = RestApi.create({name: 'test_api'})

      return expect(ret).to.become({name: 'test_api'})
    })
  })

  describe('RestApi.findByName', () => {
    it('should return promise object', () => {
      sb.stub(apiGateway, 'getRestApis').returns({
        promise: () => Promise.resolve({items: []})
      })

      const ret = RestApi.findByName('test_api')

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with RestApi object', () => {
      sb.stub(apiGateway, 'getRestApis').returns({
        promise: () => Promise.resolve({
          items: [
            {name: 'test_api'}
          ]
        })
      })

      const ret = RestApi.findByName('test_api')

      return expect(ret).to.become({name: 'test_api'})
    })

    it('should resolve with null if api not found', () => {
      sb.stub(apiGateway, 'getRestApis').returns({
        promise: () => Promise.resolve({
          items: [
            {name: 'dummy'}
          ]
        })
      })

      const ret = RestApi.findByName('test_api')

      return expect(ret).to.become(null)
    })
  })

  describe('constructor', () => {
    it('should generate a valid object', () => {
      expect(restApi).to.have.property('id', '123abc')
      expect(restApi).to.have.property('name', 'test_api')
    })
  })

  describe('createDeployment', () => {
    it('should return promise object', () => {
      const ret = restApi.createDeployment({})

      expect(ret).to.be.an.instanceof(Promise)
    })
  })

  describe('stages', () => {
    it('should return promise object', () => {
      sb.stub(apiGateway, 'getStages').returns({
        promise: () => Promise.resolve({items: []})
      })

      const ret = restApi.stages({})

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with stage objects', () => {
      sb.stub(apiGateway, 'getStages').returns({
        promise: () => Promise.resolve({
          item: [
            {id: '123abc', stageName: 'stage1'},
            {id: '456def', stageName: 'stage2'}
          ]
        })
      })

      const ret = restApi.stages({})

      return expect(ret).to.eventually.have.lengthOf(2)
    })
  })

  describe('update', () => {
    it('should return promise object', () => {
      sb.stub(apiGateway, 'getStages').returns({
        promise: () => Promise.resolve({items: []})
      })
      sb.stub(apiGateway, 'putRestApi').returns({
        promise: () => Promise.resolve()
      })

      const ret = restApi.update({})

      expect(ret).to.be.an.instanceof(Promise)
    })
  })
})
