import { AWS, Promise, expect, sinon } from '../helper'
import * as lib from '../../src/lib/apiGateway/integrationResponse'

describe('integrationResponse', () => {
  const apiGateway = new AWS.APIGateway()
  const RestApi = class {}
  const restApi = new RestApi()
  const Resource = class {}
  const resource = new Resource()
  const Method = class {}
  const method = new Method()
  const Integration = class {}
  const integration = new Integration()
  const IntegrationResponse = lib.integrationResponse(apiGateway)
  const integrationResponse = new IntegrationResponse(integration, {
    statusCode: '200'
  })
  const sb = sinon.sandbox.create()

  before(() => {
    restApi.id = '12345abcde'
    resource.id = '123abc'
    resource._restApi = restApi
    method.httpMethod = 'GET'
    method._resource = resource
    integration._method = method
  })

  afterEach(() => {
    sb.restore()
  })

  it('should be a function', () => {
    expect(lib.integrationResponse).to.be.a('function')
  })

  it('should return IntegrationResponse class', () => {
    expect(IntegrationResponse).to.be.a('function')
    expect(IntegrationResponse.name).to.equal('IntegrationResponse')
  })

  describe('IntegrationResponse.create', () => {
    it('should return promise object', () => {
      sb.useFakeTimers()
      sb.stub(apiGateway, 'putIntegrationResponseAsync')
        .resolves()
      const ret = IntegrationResponse.create(integration, {statusCode: '200'})
      sb.clock.tick(250)

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with new IntegrationResponse object', () => {
      sb.useFakeTimers()
      sb.stub(apiGateway, 'putIntegrationResponseAsync')
        .resolves({statusCode: '200'})
      const ret = IntegrationResponse.create(integration, {statusCode: '200'})
      sb.clock.tick(250)

      return expect(ret).to.become({
        _integration: integration,
        statusCode: '200'
      })
    })
  })

  describe('constructor', () => {
    it('should generate a valid object', () => {
      expect(integrationResponse._integration).to.equal(integration)
      expect(integrationResponse).to.have.property('statusCode', '200')
    })
  })

  describe('delete', () => {
    it('should return promise object', () => {
      sb.useFakeTimers()
      sb.stub(apiGateway, 'deleteIntegrationResponseAsync')
        .resolves()
      const ret = integrationResponse.delete({})
      sb.clock.tick(250)

      expect(ret).to.be.an.instanceof(Promise)
    })
  })

  describe('update', () => {
    it('should return promise object', () => {
      sb.stub(integrationResponse, 'delete')
        .returns(new Promise(() => {}))
      const ret = integrationResponse.update({})

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should delete old data and create new data', () => {
      sb.stub(integrationResponse, 'delete')
        .resolves()
      sb.stub(IntegrationResponse, 'create')
        .resolves(new IntegrationResponse(integration, {statusCode: '200'}))
      const ret = integrationResponse.update({})

      return expect(ret).to.eventually.be.an.instanceof(IntegrationResponse)
    })
  })
})
