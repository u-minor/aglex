import { AWS, expect, sinon } from './helper'
import apiGateway from '../src/lib/apiGateway'

const restApi = sinon.stub()
apiGateway.__Rewire__('AWS', AWS)
apiGateway.__Rewire__('restApi', restApi)

describe('apiGateway', () => {
  it('should be a function', () => {
    expect(apiGateway).to.be.a('function')
  })

  it('should return a valid object', () => {
    const ret = apiGateway()
    expect(ret).to.have.property('RestApi')
    expect(restApi).to.have.been.calledOnce
  })
})
