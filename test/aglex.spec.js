import { expect, sinon } from './helper'

import Promise from 'bluebird'
import Aglex from '../src/lib/aglex'

const lib = sinon.stub()
Aglex.__Rewire__('aglexLib', lib)

describe('aglex', () => {
  it('should be a function', () => {
    expect(Aglex).to.be.a('function')
  })

  it('should return a valid object', () => {
    const ret = Aglex({key: 'val'}, 'none')
    expect(ret.config).to.deep.equal({key: 'val'})
    expect(ret.logLevel).to.equal('none')
  })

  describe('addLambdaPermission', () => {
    const aglex = Aglex({key: 'val'}, 'none')
    const stub = sinon.stub().returns(new Promise(() => {}))

    before(() => {
      lib.returns({addLambdaPermission: stub})
    })

    after(() => {
      lib.reset()
    })

    it('should be a function', () => {
      expect(aglex.addLambdaPermission).to.be.a('function')
    })

    it('should call aglexLib.addLambdaPermission', () => {
      aglex.addLambdaPermission()

      expect(lib).to.have.been.calledOnce
      expect(lib).to.have.been.calledWith({key: 'val'}, 'none')
      expect(stub).to.have.been.calledOnce
    })

    it('should return a promise object', () => {
      const ret = aglex.addLambdaPermission()

      expect(ret).to.be.an.instanceof(Promise)
    })
  })

  describe('deployApi', () => {
    const aglex = Aglex({key: 'val'}, 'none')
    const stub = sinon.stub().returns(new Promise(() => {}))

    before(() => {
      lib.returns({deployApi: stub})
    })

    after(() => {
      lib.reset()
    })

    it('should be a function', () => {
      expect(aglex.deployApi).to.be.a('function')
    })

    it('should call aglexLib.deployApi', () => {
      aglex.deployApi('desc', 'stage', 'stage desc')

      expect(lib).to.have.been.calledOnce
      expect(lib).to.have.been.calledWith({key: 'val'}, 'none')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('desc', 'stage', 'stage desc')
    })

    it('should return a promise object', () => {
      const ret = aglex.deployApi('desc', 'stage', 'stage desc')

      expect(ret).to.be.an.instanceof(Promise)
    })
  })

  describe('generateConfig', () => {
    const aglex = Aglex({key: 'val'}, 'none')

    it('should be a function', () => {
      expect(aglex.generateConfig).to.be.a('function')
    })

    it('should return a config yaml', () => {
      const ret = aglex.generateConfig()

      expect(ret).to.be.a('string')
      expect(ret).to.contain('aglex config')
    })
  })

  describe('generateLambdaHandler', () => {
    const aglex = Aglex({key: 'val'}, 'none')

    it('should be a function', () => {
      expect(aglex.generateLambdaHandler).to.be.a('function')
    })

    it('should return a handler js script', () => {
      const ret = aglex.generateLambdaHandler()

      expect(ret).to.be.a('string')
      expect(ret).to.contain('exports.handler = function(event, context) {')
    })

    it('should return a handler coffee script when param is provided', () => {
      const ret = aglex.generateLambdaHandler(true)

      expect(ret).to.be.a('string')
      expect(ret).to.contain('exports.handler = (event, context) ->')
    })
  })

  describe('getApiStages', () => {
    const aglex = Aglex({key: 'val'}, 'none')
    const stub = sinon.stub().resolves([
      {stageName: 'stage1', description: 'stage1 desc', invokeUrl: 'http://test.api/stage1'},
      {stageName: 'stage2', description: 'stage2 desc', invokeUrl: 'http://test.api/stage2'}
    ])

    before(() => {
      lib.returns({getApiStages: stub})
    })

    after(() => {
      lib.reset()
    })

    it('should be a function', () => {
      expect(aglex.getApiStages).to.be.a('function')
    })

    it('should call aglexLib.getApiStages', () => {
      aglex.getApiStages()

      expect(lib).to.have.been.calledOnce
      expect(lib).to.have.been.calledWith({key: 'val'}, 'none')
      expect(stub).to.have.been.calledOnce
    })

    it('should resolve with a valid object', () => {
      const ret = aglex.getApiStages()

      expect(ret).to.become([
        {stageName: 'stage1', description: 'stage1 desc', invokeUrl: 'http://test.api/stage1'},
        {stageName: 'stage2', description: 'stage2 desc', invokeUrl: 'http://test.api/stage2'}
      ])
    })
  })

  describe('updateApi', () => {
    const aglex = Aglex({key: 'val'}, 'none')

    before(() => {
      lib.returns({
        checkMethods: sinon.stub().resolves(null),
        checkResources: sinon.stub().resolves(['res1', 'res2']),
        getApi: sinon.stub().resolves({}),
        getLambda: sinon.stub().resolves()
      })
    })

    after(() => {
      lib.reset()
    })

    it('should be a function', () => {
      expect(aglex.updateApi).to.be.a('function')
    })

    it('should call aglexLib.updateApi', () => {
      aglex.updateApi()

      expect(lib).to.have.been.calledOnce
      expect(lib).to.have.been.calledWith({key: 'val'}, 'none')
    })

    it('should return a promise object', () => {
      const ret = aglex.updateApi()

      expect(ret).to.be.an.instanceof(Promise)
      expect(ret).to.become(null)
    })
  })

  describe('updateLambda', () => {
    const aglex = Aglex({key: 'val'}, 'none')
    const stub = sinon.stub().returns(new Promise(() => {}))

    before(() => {
      lib.returns({updateLambda: stub})
    })

    after(() => {
      lib.reset()
    })

    it('should be a function', () => {
      expect(aglex.updateLambda).to.be.a('function')
    })

    it('should call aglexLib.updateLambda', () => {
      aglex.updateLambda('dummy-file')

      expect(lib).to.have.been.calledOnce
      expect(lib).to.have.been.calledWith({key: 'val'}, 'none')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('dummy-file')
    })

    it('should return a promise object', () => {
      const ret = aglex.updateLambda('dummy-file')

      expect(ret).to.be.an.instanceof(Promise)
    })
  })
})
