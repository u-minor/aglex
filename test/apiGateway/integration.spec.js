import { AWS, Promise, expect, sinon } from '../helper'
import target, * as lib from '../../src/lib/apiGateway/integration'

const stub = {
  IntegrationResponse: class {
    static create () {}
    update () {}
  }
}
target.__Rewire__('integrationResponse', () => stub.IntegrationResponse)

describe('integration', () => {
  const apiGateway = new AWS.APIGateway()
  const RestApi = class {}
  const restApi = new RestApi()
  const Resource = class {}
  const resource = new Resource()
  const Method = class {}
  const method = new Method()
  const Integration = lib.integration(apiGateway)
  const sb = sinon.sandbox.create()
  let integration

  before(() => {
    restApi.id = '12345abcde'
    resource.id = '123abc'
    resource._restApi = restApi
    method.httpMethod = 'GET'
    method._resource = resource
  })

  beforeEach(() => {
    integration = new Integration(method, {
      request: {}
    })
  })

  afterEach(() => {
    sb.restore()
  })

  it('should be a function', () => {
    expect(lib.integration).to.be.a('function')
  })

  it('should return Integration class', () => {
    expect(Integration).to.be.a('function')
    expect(Integration.name).to.equal('Integration')
  })

  describe('Integration.create', () => {
    it('should return promise object', () => {
      sb.useFakeTimers()
      const ret = Integration.create(method, {request: {}})
      sb.clock.tick(250)

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with new Integration object', () => {
      sb.useFakeTimers()
      sb.stub(apiGateway, 'putIntegrationAsync')
        .resolves({request: {}})
      const ret = Integration.create(method, {request: {}})
      sb.clock.tick(250)

      return expect(ret).to.become({
        _method: method,
        request: {}
      })
    })
  })

  describe('constructor', () => {
    it('should generate a valid object', () => {
      expect(integration._method).to.equal(method)
      expect(integration).to.have.property('request')
      expect(integration.request).to.deep.equal({})
    })

    it('should set IntegrationResponse objects if integrationResponses exists', () => {
      const integration = new Integration(method, {
        request: {},
        integrationResponses: {
          '200': {},
          '500': {}
        }
      })

      expect(integration.integrationResponses).to.have.property('200')
      expect(integration.integrationResponses['200']).to.be.an.instanceof(stub.IntegrationResponse)
      expect(integration.integrationResponses).to.have.property('500')
      expect(integration.integrationResponses['500']).to.be.an.instanceof(stub.IntegrationResponse)
    })
  })

  describe('createIntegrationResponse', () => {
    it('should return promise object', () => {
      sb.stub(stub.IntegrationResponse, 'create')
        .resolves()
      const ret = integration.createIntegrationResponse({statusCode: '200'})

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should set integrationResponse after resolved', () => {
      sb.stub(stub.IntegrationResponse, 'create')
        .resolves(new stub.IntegrationResponse())
      const ret = integration.createIntegrationResponse({statusCode: '200'})

      return ret.then(() => {
        expect(integration.integrationResponses).to.have.property('200')
        expect(integration.integrationResponses['200']).to.be.an.instanceof(stub.IntegrationResponse)
      })
    })

    it('should append new integrationResponse to current object', () => {
      integration.integrationResponses = {
        '200': new stub.IntegrationResponse()
      }
      sb.stub(stub.IntegrationResponse, 'create')
        .resolves(new stub.IntegrationResponse())
      const ret = integration.createIntegrationResponse({statusCode: '500'})

      return ret.then(() => {
        expect(integration.integrationResponses).to.have.property('200')
        expect(integration.integrationResponses['200']).to.be.an.instanceof(stub.IntegrationResponse)
        expect(integration.integrationResponses).to.have.property('500')
        expect(integration.integrationResponses['500']).to.be.an.instanceof(stub.IntegrationResponse)
      })
    })
  })

  describe('update', () => {
    it('should return promise object', () => {
      sb.stub(Integration, 'create')
        .resolves(new Integration(method, {request: {}}))
      const ret = integration.update({request: {}})

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should update to new data', () => {
      sb.stub(Integration, 'create')
        .resolves(new Integration(method, {request: {}}))
      const ret = integration.update({request: {}})

      return expect(ret).to.eventually.be.an.instanceof(Integration)
    })
  })
})
