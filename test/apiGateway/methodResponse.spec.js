import { AWS, Promise, expect, sinon } from '../helper'
import * as lib from '../../src/lib/apiGateway/methodResponse'

describe('methodResponse', () => {
  const apiGateway = new AWS.APIGateway()
  const RestApi = class {}
  const restApi = new RestApi()
  const Resource = class {}
  const resource = new Resource()
  const Method = class {}
  const method = new Method()
  const MethodResponse = lib.methodResponse(apiGateway)
  const methodResponse = new MethodResponse(method, {
    statusCode: '200'
  })
  const sb = sinon.sandbox.create()

  before(() => {
    restApi.id = '12345abcde'
    resource.id = '123abc'
    resource._restApi = restApi
    method.httpMethod = 'GET'
    method._resource = resource
  })

  afterEach(() => {
    sb.restore()
  })

  it('should be a function', () => {
    expect(lib.methodResponse).to.be.a('function')
  })

  it('should return MethodResponse class', () => {
    expect(MethodResponse).to.be.a('function')
    expect(MethodResponse.name).to.equal('MethodResponse')
  })

  describe('MethodResponse.create', () => {
    it('should return promise object', () => {
      sb.stub(apiGateway, 'putMethodResponseAsync')
        .resolves()
      const ret = MethodResponse.create(method, {statusCode: '200'})

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with new MethodResponse object', () => {
      sb.stub(apiGateway, 'putMethodResponseAsync')
        .resolves({statusCode: '200'})
      const ret = MethodResponse.create(method, {statusCode: '200'})

      return ret.then(data => {
        expect(data).to.deep.equal({
          _method: method,
          statusCode: '200'
        })
      })
    })
  })

  describe('constructor', () => {
    it('should generate a valid object', () => {
      expect(methodResponse._method).to.equal(method)
      expect(methodResponse).to.have.property('statusCode', '200')
    })
  })

  describe('delete', () => {
    it('should return promise object', () => {
      sb.stub(apiGateway, 'deleteMethodResponseAsync')
        .resolves()
      const ret = methodResponse.delete({})

      expect(ret).to.be.an.instanceof(Promise)
      return ret
    })
  })

  describe('update', () => {
    it('should return promise object', () => {
      sb.stub(apiGateway, 'deleteMethodResponseAsync')
        .resolves()
      const ret = methodResponse.update({})

      expect(ret).to.be.an.instanceof(Promise)
      return ret
    })

    it('should delete old data and create new data', () => {
      sb.stub(apiGateway, 'deleteMethodResponseAsync')
        .resolves()
      sb.stub(apiGateway, 'putMethodResponseAsync')
        .resolves({'200': {}})
      const ret = methodResponse.update({})

      return ret.then(data => {
        expect(data).to.be.an.instanceof(MethodResponse)
        expect(apiGateway.deleteMethodResponseAsync).to.have.been.calledOnce
        expect(apiGateway.putMethodResponseAsync).to.have.been.calledOnce
      })
    })
  })
})
