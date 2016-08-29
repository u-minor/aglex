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
      sb.useFakeTimers()
      sb.stub(apiGateway, 'putMethodResponseAsync')
        .resolves()
      const ret = MethodResponse.create(method, {statusCode: '200'})
      sb.clock.tick(250)

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with new MethodResponse object', () => {
      sb.useFakeTimers()
      sb.stub(apiGateway, 'putMethodResponseAsync')
        .resolves({statusCode: '200'})
      const ret = MethodResponse.create(method, {statusCode: '200'})
      sb.clock.tick(250)

      return expect(ret).to.become({
        _method: method,
        statusCode: '200'
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
      sb.useFakeTimers()
      sb.stub(apiGateway, 'deleteMethodResponseAsync')
        .resolves()
      const ret = methodResponse.delete({})
      sb.clock.tick(250)

      expect(ret).to.be.an.instanceof(Promise)
    })
  })

  describe('update', () => {
    it('should return promise object', () => {
      sb.stub(methodResponse, 'delete')
        .returns(new Promise(() => {}))
      const ret = methodResponse.update({})

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should delete old data and create new data', () => {
      sb.stub(methodResponse, 'delete')
        .resolves()
      sb.stub(MethodResponse, 'create')
        .resolves(new MethodResponse(method, {statusCode: '200'}))
      const ret = methodResponse.update({})

      return expect(ret).to.eventually.be.an.instanceof(MethodResponse)
    })
  })
})
