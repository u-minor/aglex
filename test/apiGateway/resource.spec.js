import { AWS, Promise, expect, sinon } from '../helper'
import target, * as lib from '../../src/lib/apiGateway/resource'

const stub = {
  method: class {
    static create () { return Promise.resolve() }
  }
}
target.__Rewire__('method', () => stub.method)

describe('resource', () => {
  const apiGateway = new AWS.APIGateway()
  const RestApi = class {}
  const restApi = new RestApi()
  const Resource = lib.resource(apiGateway)
  const res = new Resource(restApi, {
    id: '12345abcde',
    path: '/',
    resourceMethods: {
      GET: {},
      POST: {}
    }
  })
  const sb = sinon.sandbox.create()

  afterEach(() => {
    sb.restore()
  })

  it('should be a function', () => {
    expect(lib.resource).to.be.a('function')
  })

  it('should return Resource class', () => {
    expect(Resource).to.be.a('function')
    expect(Resource.name).to.equal('Resource')
  })

  describe('Resource.create', () => {
    it('should return promise object', () => {
      sb.useFakeTimers()
      sb.stub(apiGateway, 'createResourceAsync')
        .resolves()
      const ret = Resource.create(restApi, {path: '/'})
      sb.clock.tick(250)

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with new Resource object', () => {
      sb.useFakeTimers()
      sb.stub(apiGateway, 'createResourceAsync').returns(Promise.resolve({
        id: '12345abcde',
        path: '/'
      }))
      const ret = Resource.create(restApi, {path: '/'})
      sb.clock.tick(250)

      return expect(ret).to.become({
        _restApi: {},
        id: '12345abcde',
        path: '/'
      })
    })
  })

  describe('constructor', () => {
    it('should generate a valid object', () => {
      expect(res._restApi).to.equal(restApi)
      expect(res).to.have.property('id', '12345abcde')
      expect(res).to.have.property('path', '/')
    })
  })

  describe('createMethod', () => {
    it('should return promise object', () => {
      const ret = res.createMethod({})

      expect(ret).to.be.an.instanceof(Promise)
    })
  })

  describe('methods', () => {
    it('should return promise object', () => {
      sb.stub(apiGateway, 'getMethodAsync')
        .resolves()
      const ret = res.methods()

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with method objects', () => {
      const func = sb.stub(apiGateway, 'getMethodAsync')
      func.onFirstCall().resolves({
        httpMethod: 'GET',
        _resource: {
          path: '/dummy'
        }
      })
      func.onSecondCall().resolves({
        httpMethod: 'POST',
        _resource: {
          path: '/dummy'
        }
      })
      const ret = res.methods()

      return expect(ret).to.eventually.have.lengthOf(2)
    })
  })

  describe('delete', () => {
    it('should return promise object', () => {
      sb.useFakeTimers()
      sb.stub(apiGateway, 'deleteResourceAsync')
        .resolves({})
      const ret = res.delete({})
      sb.clock.tick(250)

      expect(ret).to.be.an.instanceof(Promise)
      return expect(ret).to.become({})
    })
  })
})
