import { _, AWS, expect, sinon } from './helper'

import AglexLib from '../src/lib/aglexLib'
const apiGateway = sinon.stub()
AglexLib.__Rewire__('AWS', AWS)
AglexLib.__Rewire__('apiGateway', apiGateway)
AglexLib.__Rewire__('util', {
  normalizeApiDefinition: () => {}
})

describe('aglexLib', () => {
  let aglexLib
  const sb = sinon.sandbox.create()
  const stub = {}
  const conf = {
    config: {},
    lambda: {
      FunctionName: 'testLambda'
    },
    apiGateway: {
      info: {
        title: 'testApi',
        description: 'desc'
      },
      paths: {}
    }
  }
  const apiObj = {
    id: '123abc',
    name: 'testApi',
    createDeployment: () => Promise.resolve({}),
    stages: () => Promise.resolve([]),
    update: () => Promise.resolve(apiObj)
  }

  before(() => {
    apiGateway.returns({RestApi: {}})
  })

  after(() => {
    apiGateway.reset()
  })

  afterEach(() => {
    sb.restore()
  })

  it('should be a function', () => {
    expect(AglexLib).to.be.a('function')
  })

  it('should return a valid object', () => {
    aglexLib = AglexLib(conf)

    expect(aglexLib.config).to.deep.equal(conf)
    expect(aglexLib.apiGateway).to.be.an('object')
    expect(aglexLib.lambda).to.be.an('object')
    expect(aglexLib.lambdaFunction).to.be.undefined
  })

  it('should use AWS.Credentials if accessKey and secretKey exists', () => {
    sb.stub(AWS, 'Credentials')
    const c = _.cloneDeep(conf)
    c.config = {
      accessKeyId: 'ACCESS_KEY',
      secretAccessKey: 'SECRET_KEY'
    }
    aglexLib = AglexLib(c)

    expect(AWS.Credentials).to.have.been.called
  })

  it('should use AWS.SharedIniFileCredentials if profile exists', () => {
    sb.stub(AWS, 'SharedIniFileCredentials')
    const c = _.cloneDeep(conf)
    c.config = {
      profile: 'dummy'
    }
    aglexLib = AglexLib(c)

    expect(AWS.SharedIniFileCredentials).to.have.been.called
  })

  describe('addLambdaPermission', () => {
    const sb = sinon.sandbox.create()

    before(() => {
      apiGateway.returns({RestApi: stub})
      aglexLib = AglexLib(conf, 'none')
    })

    after(() => {
      apiGateway.reset()
    })

    afterEach(() => {
      sb.restore()
    })

    it('should be a function', () => {
      expect(aglexLib.addLambdaPermission).to.be.a('function')
    })

    it('should return a promise object', () => {
      sb.stub(AWS._stub_.Lambda, 'getFunction').returns({
        promise: () => new Promise(() => {})
      })

      const ret = aglexLib.addLambdaPermission()

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with a valid object', () => {
      sb.stub(AWS._stub_.Lambda, 'getFunction').returns({
        promise: () => Promise.resolve({
          Configuration: {
            FunctionArn: 'arn:aws:lambda:local:12345:function:testLambda',
            FunctionName: 'testLambda'
          }
        })
      })
      sb.stub(AWS._stub_.Lambda, 'removePermission').returns({
        promise: () => Promise.resolve()
      })
      sb.stub(AWS._stub_.Lambda, 'addPermission').returns({
        promise: () => Promise.resolve({Statement: ''})
      })

      const ret = aglexLib.addLambdaPermission()

      return expect(ret).to.become({Statement: ''})
    })

    it('should resolve with a valid object even when removePermission failed', () => {
      sb.stub(AWS._stub_.Lambda, 'getFunction').returns({
        promise: () => Promise.resolve({
          Configuration: {
            FunctionArn: 'arn:aws:lambda:local:12345:function:testLambda',
            FunctionName: 'testLambda'
          }
        })
      })
      sb.stub(AWS._stub_.Lambda, 'removePermission').returns({
        promise: () => Promise.reject()
      })
      sb.stub(AWS._stub_.Lambda, 'addPermission').returns({
        promise: () => Promise.resolve({Statement: ''})
      })

      const ret = aglexLib.addLambdaPermission()

      return expect(ret).to.become({Statement: ''})
    })

    it('should reject if lambda not found', () => {
      sb.stub(AWS._stub_.Lambda, 'getFunction').returns({
        promise: () => Promise.reject(new Error('Function not found'))
      })

      const ret = aglexLib.addLambdaPermission()

      return expect(ret).to.rejectedWith('Function not found')
    })
  })

  describe('deployApi', () => {
    before(() => {
      apiGateway.returns({RestApi: stub})
      aglexLib = AglexLib(conf, 'none')
    })

    after(() => {
      apiGateway.reset()
    })

    it('should be a function', () => {
      expect(aglexLib.deployApi).to.be.a('function')
    })

    it('should return a promise object', () => {
      stub.findByName = sinon.stub()
        .returns(new Promise(() => {}))

      const ret = aglexLib.deployApi('desc', 'stage', 'stage desc')

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with a valid object', () => {
      stub.findByName = sinon.stub()
        .withArgs('testApi')
        .resolves(apiObj)

      const ret = aglexLib.deployApi('desc', 'stage', 'stage desc')

      return expect(ret).to.become({})
    })

    it('should resolve with a new api object', () => {
      stub.findByName = sinon.stub()
        .withArgs('testApi')
        .resolves(null)

      const ret = aglexLib.deployApi('desc', 'stage', 'stage desc')

      return expect(ret).to.rejectedWith(Error)
    })

    it('should throw error if API failed', () => {
      stub.findByName = sinon.stub()
        .rejects({})

      const ret = aglexLib.deployApi('desc', 'stage', 'stage desc')

      return expect(ret).to.rejectedWith({})
    })
  })

  describe('updateApi', () => {
    before(() => {
      apiGateway.returns({RestApi: stub})
      aglexLib = AglexLib(conf, 'none')
    })

    after(() => {
      apiGateway.reset()
    })

    it('should be a function', () => {
      expect(aglexLib.updateApi).to.be.a('function')
    })

    it('should return a promise object', () => {
      stub.findByName = sinon.stub()
        .returns(new Promise(() => {}))

      const ret = aglexLib.updateApi()

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with a current api object', () => {
      stub.findByName = sinon.stub()
        .withArgs('test')
        .resolves(apiObj)

      const ret = aglexLib.updateApi()

      return expect(ret).to.become(apiObj)
    })

    it('should resolve with a new api object', () => {
      stub.findByName = sinon.stub()
        .withArgs('test')
        .resolves(null)
      stub.create = sinon.stub()
        .withArgs(conf.apiGateway)
        .resolves(apiObj)

      const ret = aglexLib.updateApi()

      return expect(ret).to.become(apiObj)
    })

    it('should throw error if API failed', () => {
      stub.findByName = sinon.stub()
        .rejects({})

      const ret = aglexLib.updateApi()

      return expect(ret).to.rejectedWith({})
    })
  })

  describe('getApiStages', () => {
    before(() => {
      apiGateway.returns({RestApi: stub})
      aglexLib = AglexLib(conf, 'none')
    })

    after(() => {
      apiGateway.reset()
    })

    it('should be a function', () => {
      expect(aglexLib.getApiStages).to.be.a('function')
    })

    it('should return a promise object', () => {
      stub.findByName = sinon.stub()
        .returns(new Promise(() => {}))

      const ret = aglexLib.getApiStages()

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with an stage array', () => {
      stub.findByName = sinon.stub()
        .withArgs('test')
        .resolves(apiObj)

      const ret = aglexLib.getApiStages()

      return expect(ret).to.become([])
    })

    it('should reject if api not found', () => {
      stub.findByName = sinon.stub()
        .withArgs('test')
        .resolves(null)

      const ret = aglexLib.getApiStages()

      return expect(ret).to.rejectedWith(Error)
    })

    it('should throw error if API failed', () => {
      stub.findByName = sinon.stub()
        .rejects({})

      const ret = aglexLib.getApiStages()

      return expect(ret).to.rejectedWith({})
    })
  })

  describe('getLambda', () => {
    const sb = sinon.sandbox.create()

    before(() => {
      apiGateway.returns({RestApi: stub})
      aglexLib = AglexLib(conf, 'none')
    })

    after(() => {
      apiGateway.reset()
    })

    afterEach(() => {
      sb.restore()
    })

    it('should be a function', () => {
      expect(aglexLib.getLambda).to.be.a('function')
    })

    it('should return a promise object', () => {
      sb.stub(AWS._stub_.Lambda, 'getFunction').returns({
        promise: () => new Promise(() => {})
      })

      const ret = aglexLib.getLambda()

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with a valid object', () => {
      sb.stub(AWS._stub_.Lambda, 'getFunction').returns({
        promise: () => Promise.resolve({
          Configuration: {
            FunctionArn: 'arn:aws:lambda:local:12345:function:testLambda',
            FunctionName: 'testLambda'
          }
        })
      })

      const ret = aglexLib.getLambda()

      return expect(ret).to.become({
        Configuration: {
          FunctionArn: 'arn:aws:lambda:local:12345:function:testLambda',
          FunctionName: 'testLambda'
        }
      })
    })

    it('should reject if lambda not found', () => {
      sb.stub(AWS._stub_.Lambda, 'getFunction').returns({
        promise: () => Promise.reject(new Error('Function not found'))
      })

      const ret = aglexLib.getLambda()

      return expect(ret).to.rejectedWith('Function not found')
    })
  })

  describe('updateLambda', () => {
    const sb = sinon.sandbox.create()

    before(() => {
      AglexLib.__Rewire__('fs', {readFileSync: () => {}})
      apiGateway.returns({RestApi: stub})
      aglexLib = AglexLib(conf, 'none')
    })

    after(() => {
      apiGateway.reset()
      AglexLib.__ResetDependency__('fs')
    })

    afterEach(() => {
      sb.restore()
    })

    it('should be a function', () => {
      expect(aglexLib.updateLambda).to.be.a('function')
    })

    it('should return a promise object', () => {
      sb.stub(AWS._stub_.IAM, 'getRole')
        .returns({promise: () => new Promise(() => {})})

      const ret = aglexLib.updateLambda('file')

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with a current lambda object', () => {
      sb.stub(AWS._stub_.IAM, 'getRole').returns({
        promise: () => Promise.resolve({
          Role: {
            Arn: 'arn:aws:iam::12345:role/test_role'
          }
        })
      })
      sb.stub(AWS._stub_.Lambda, 'getFunction').returns({
        promise: () => Promise.resolve({
          Configuration: {
            FunctionArn: 'arn:aws:lambda:local:12345:function:testLambda',
            FunctionName: 'testLambda'
          }
        })
      })
      sb.stub(AWS._stub_.Lambda, 'updateFunctionConfiguration').returns({
        promise: () => Promise.resolve()
      })
      sb.stub(AWS._stub_.Lambda, 'updateFunctionCode').returns({
        promise: () => Promise.resolve({
          FunctionName: 'testLambda'
        })
      })

      const ret = aglexLib.updateLambda('file')

      return expect(ret).to.become({FunctionName: 'testLambda'})
    })

    it('should resolve with a new lambda object', () => {
      sb.stub(AWS._stub_.IAM, 'getRole').returns({
        promise: () => Promise.resolve({
          Role: {
            Arn: 'arn:aws:iam::12345:role/test_role'
          }
        })
      })
      sb.stub(AWS._stub_.Lambda, 'getFunction').returns({
        promise: () => Promise.reject({statusCode: 404})
      })
      sb.stub(AWS._stub_.Lambda, 'createFunction').returns({
        promise: () => Promise.resolve({FunctionName: 'testLambda'})
      })

      const ret = aglexLib.updateLambda('file')

      return expect(ret).to.become({FunctionName: 'testLambda'})
    })

    it('should throw error if getRole failed', () => {
      sb.stub(AWS._stub_.IAM, 'getRole').returns({
        promise: () => Promise.reject({})
      })

      const ret = aglexLib.updateLambda('file')

      return expect(ret).to.rejectedWith({})
    })

    it('should throw error if getFunction failed', () => {
      sb.stub(AWS._stub_.IAM, 'getRole').returns({
        promise: () => Promise.resolve({
          Role: {
            Arn: 'arn:aws:iam::12345:role/test_role'
          }
        })
      })
      sb.stub(AWS._stub_.Lambda, 'getFunction').returns({
        promise: () => Promise.reject({statusCode: 500})
      })

      const ret = aglexLib.updateLambda('file')

      return expect(ret).to.rejectedWith({statusCode: 500})
    })
  })
})
