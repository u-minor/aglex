import { AWS, Promise, check, expect, sinon } from '../helper'
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
        .returns(new Promise(() => {}))
      const ret = MethodResponse.create(method, {statusCode: '200'})

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with new MethodResponse object', (done) => {
      sb.stub(apiGateway, 'putMethodResponseAsync')
        .returns(Promise.resolve({statusCode: '200'}))
      const ret = MethodResponse.create(method, {statusCode: '200'})

      ret.done((data) => check(done, () => {
        expect(data).to.deep.equal({
          _method: method,
          statusCode: '200'
        })
      }))
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
        .returns(new Promise(() => {}))
      const ret = methodResponse.delete({})

      expect(ret).to.be.an.instanceof(Promise)
    })
  })

  describe('update', () => {
    it('should return promise object', () => {
      sb.stub(apiGateway, 'deleteMethodResponseAsync')
        .returns(new Promise(() => {}))
      const ret = methodResponse.update({})

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should delete old data and create new data', (done) => {
      sb.stub(apiGateway, 'deleteMethodResponseAsync')
        .returns(Promise.resolve())
      sb.stub(apiGateway, 'putMethodResponseAsync')
        .returns(Promise.resolve({'200': {}}))
      const ret = methodResponse.update({})

      ret.done((data) => check(done, () => {
        expect(data).to.be.an.instanceof(MethodResponse)
        expect(apiGateway.deleteMethodResponseAsync).to.have.been.calledOnce
        expect(apiGateway.putMethodResponseAsync).to.have.been.calledOnce
      }))
    })
  })
})
