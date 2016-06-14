import { AWS, Promise, check, expect, sinon } from '../helper'
import target, * as lib from '../../src/lib/apiGateway/resource'

const stub = {
  method: class {
    static create () {}
  }
}
target.__Rewire__('method', () => stub.method)

describe('resource', () => {
  const apiGateway = new AWS.APIGateway()
  const RestApi = class {}
  const api = new RestApi()
  const Resource = lib.resource(apiGateway)
  const res = new Resource(api, {
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
      sb.stub(apiGateway, 'createResourceAsync').returns(new Promise(() => {}))
      const ret = Resource.create(api, {path: '/'})

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with new Resource object', (done) => {
      sb.stub(apiGateway, 'createResourceAsync').returns(Promise.resolve({
        id: '12345abcde',
        path: '/'
      }))
      const ret = Resource.create(api, {path: '/'})

      ret.done((data) => check(done, () => {
        expect(data).to.deep.equal({
          _restApi: {},
          id: '12345abcde',
          path: '/'
        })
      }))
    })
  })

  describe('constructor', () => {
    it('should generate a valid object', () => {
      expect(res._restApi).to.equal(api)
      expect(res).to.have.property('id', '12345abcde')
      expect(res).to.have.property('path', '/')
    })
  })

  describe('createMethod', () => {
    it('should return promise object', () => {
      sb.stub(stub.method, 'create').returns(new Promise(() => {}))
      const ret = res.createMethod({})

      expect(ret).to.be.an.instanceof(Promise)
    })
  })

  describe('methods', () => {
    it('should return promise object', () => {
      sb.stub(apiGateway, 'getMethodAsync').returns(new Promise(() => {}))
      const ret = res.methods()

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with method objects', () => {
      const func = sb.stub(apiGateway, 'getMethodAsync')
      func.onFirstCall().returns(Promise.resolve({
        httpMethod: 'GET',
        _resource: {
          path: '/dummy'
        }
      }))
      func.onSecondCall().returns(Promise.resolve({
        httpMethod: 'POST',
        _resource: {
          path: '/dummy'
        }
      }))
      const ret = res.methods()

      expect(ret).to.eventually.be.an('array')
      expect(ret).to.eventually.have.lengthOf(2)
    })
  })

  describe('delete', () => {
    it('should return promise object', () => {
      sb.stub(apiGateway, 'deleteResourceAsync').returns(new Promise(() => {}))
      const ret = res.delete({})

      expect(ret).to.be.an.instanceof(Promise)
    })
  })
})
