import { AWS, Promise, check, expect, sinon } from '../helper'
import * as lib from '../../src/lib/apiGateway/deployment'

describe('deployment', () => {
  const apiGateway = new AWS.APIGateway()
  const RestApi = class {}
  const restApi = new RestApi()
  const Deployment = lib.deployment(apiGateway)
  const deployment = new Deployment(restApi, {
    id: '123abc',
    createdDate: 'Fri, 01 Jan 2016 00:00:00 GMT'
  })
  const sb = sinon.sandbox.create()

  before(() => {
    restApi.id = '12345abcde'
  })

  afterEach(() => {
    sb.restore()
  })

  it('should be a function', () => {
    expect(lib.deployment).to.be.a('function')
  })

  it('should return Deployment class', () => {
    expect(Deployment).to.be.a('function')
    expect(Deployment.name).to.equal('Deployment')
  })

  describe('Deployment.create', () => {
    it('should return promise object', () => {
      sb.stub(apiGateway, 'createDeploymentAsync')
        .returns(new Promise(() => {}))
      const ret = Deployment.create(restApi, {
        id: '123abc',
        createdDate: 'Fri, 01 Jan 2016 00:00:00 GMT'
      })

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with new Deployment object', (done) => {
      sb.stub(apiGateway, 'createDeploymentAsync')
        .returns(Promise.resolve({
          id: '123abc',
          createdDate: 'Fri, 01 Jan 2016 00:00:00 GMT'
        }))
      const ret = Deployment.create(restApi, {
        id: '123abc',
        createdDate: 'Fri, 01 Jan 2016 00:00:00 GMT'
      })

      ret.done((data) => check(done, () => {
        expect(data).to.deep.equal({
          _restApi: restApi,
          id: '123abc',
          createdDate: 'Fri, 01 Jan 2016 00:00:00 GMT'
        })
      }))
    })
  })

  describe('constructor', () => {
    it('should generate a valid object', () => {
      expect(deployment._restApi).to.equal(restApi)
      expect(deployment).to.have.property('id', '123abc')
      expect(deployment).to.have.property('createdDate', 'Fri, 01 Jan 2016 00:00:00 GMT')
    })
  })
})
