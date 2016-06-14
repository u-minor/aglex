import { AWS, Promise, expect, sinon } from '../helper'
import target, * as lib from '../../src/lib/apiGateway/restApi'

const stub = {
  deployment: class {
    static create () {}
  },
  resource: class {
    static create () {}
  },
  stage: class {}
}
target.__Rewire__('deployment', () => stub.deployment)
target.__Rewire__('resource', () => stub.resource)
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
      sb.stub(apiGateway, 'createRestApiAsync')
        .returns(new Promise(() => {}))
      const ret = RestApi.create({name: 'test_api'})

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with new RestApi object', () => {
      sb.stub(apiGateway, 'createRestApiAsync')
        .returns(Promise.resolve({
          name: 'test_api'
        }))
      const ret = RestApi.create({name: 'test_api'})

      expect(ret).to.become({name: 'test_api'})
    })
  })

  describe('RestApi.findByName', () => {
    it('should return promise object', () => {
      sb.stub(apiGateway, 'getRestApisAsync')
        .returns(new Promise(() => {}))
      const ret = RestApi.findByName('test_api')

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with RestApi object', () => {
      sb.stub(apiGateway, 'getRestApisAsync')
        .returns(Promise.resolve({
          items: [
            {name: 'test_api'}
          ]
        }))
      const ret = RestApi.findByName('test_api')

      expect(ret).to.become({name: 'test_api'})
    })

    it('should resolve with null if api not found', () => {
      sb.stub(apiGateway, 'getRestApisAsync')
        .returns(Promise.resolve({
          items: [
            {name: 'dummy'}
          ]
        }))
      const ret = RestApi.findByName('test_api')

      expect(ret).to.become(null)
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
      sb.stub(stub.deployment, 'create')
        .returns(new Promise(() => {}))
      const ret = restApi.createDeployment({})

      expect(ret).to.be.an.instanceof(Promise)
    })
  })

  describe('createResource', () => {
    it('should return promise object', () => {
      sb.stub(stub.resource, 'create')
        .returns(new Promise(() => {}))
      const ret = restApi.createResource({})

      expect(ret).to.be.an.instanceof(Promise)
    })
  })

  describe('resources', () => {
    it('should return promise object', () => {
      sb.stub(apiGateway, 'getResourcesAsync')
        .returns(new Promise(() => {}))
      const ret = restApi.resources({})

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with resource objects', () => {
      sb.stub(apiGateway, 'getResourcesAsync')
        .returns(Promise.resolve({
          items: [
            {id: '123abc', path: '/'},
            {id: '456def', path: '/dummy'}
          ]
        }))
      const ret = restApi.resources({})

      expect(ret).to.eventually.be.an('array')
      expect(ret).to.eventually.have.lengthOf(2)
    })
  })

  describe('stages', () => {
    it('should return promise object', () => {
      sb.stub(apiGateway, 'getStagesAsync')
        .returns(new Promise(() => {}))
      const ret = restApi.stages({})

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with stage objects', () => {
      sb.stub(apiGateway, 'getStagesAsync')
        .returns(Promise.resolve({
          item: [
            {id: '123abc', stageName: 'stage1'},
            {id: '456def', stageName: 'stage2'}
          ]
        }))
      const ret = restApi.stages({})

      expect(ret).to.eventually.be.an('array')
      expect(ret).to.eventually.have.lengthOf(2)
    })
  })
})
