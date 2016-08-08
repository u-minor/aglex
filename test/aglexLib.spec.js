import { _, AWS, expect, sinon } from './helper'

import Promise from 'bluebird'
import AglexLib from '../src/lib/aglexLib'
const apiGateway = sinon.stub()
AglexLib.__Rewire__('AWS', AWS)
AglexLib.__Rewire__('apiGateway', apiGateway)
AglexLib.__Rewire__('util', {
  normalizeMethods: () => {},
  normalizeRequestTemplates: () => {},
  normalizeResources: (res) => { res['/'] = {} }
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
      name: 'testApi',
      description: 'desc',
      resources: {}
    }
  }
  const apiObj = {
    id: '123abc',
    name: 'test',
    createDeployment: () => Promise.resolve({}),
    stages: () => Promise.resolve([])
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
      sb.stub(AWS._stub_.Lambda, 'getFunctionAsyncB')
        .returns(new Promise(() => {}))

      const ret = aglexLib.addLambdaPermission()

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with a valid object', () => {
      sb.stub(AWS._stub_.Lambda, 'getFunctionAsyncB')
        .resolves({
          Configuration: {
            FunctionArn: 'arn:aws:lambda:local:12345:function:testLambda',
            FunctionName: 'testLambda'
          }
        })
      sb.stub(AWS._stub_.Lambda, 'removePermissionAsyncB')
        .resolves()
      sb.stub(AWS._stub_.Lambda, 'addPermissionAsyncB')
        .resolves({Statement: ''})

      const ret = aglexLib.addLambdaPermission()

      expect(ret).to.become({Statement: ''})
    })

    it('should reject if lambda not found', () => {
      sb.stub(AWS._stub_.Lambda, 'getFunctionAsyncB')
        .rejects(new Error('Function not found'))

      const ret = aglexLib.addLambdaPermission()

      expect(ret).to.rejectedWith('Function not found')
    })
  })

  describe('checkIntegration', () => {
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
      expect(aglexLib.checkIntegration).to.be.a('function')
    })

    it('should return a promise object', () => {
      sb.stub(aglexLib, 'checkIntegrationRequest')
        .resolves()
      sb.stub(aglexLib, 'checkMethodResponses')
        .resolves()
      sb.stub(aglexLib, 'checkIntegrationResponses')
        .resolves()

      const ret = aglexLib.checkIntegration({
        httpMethod: 'GET',
        _resource: {
          path: '/dummy'
        }
      })

      expect(ret).to.be.an.instanceof(Promise)
    })
  })

  describe('checkIntegrationRequest', () => {
    before(() => {
      conf.apiGateway.resources['/dummy'] = {GET: {request: {type: 'Lambda'}}}
      apiGateway.returns({RestApi: stub})
      aglexLib = AglexLib(conf, 'none')
    })

    after(() => {
      apiGateway.reset()
      conf.apiGateway.resources = {}
    })

    it('should be a function', () => {
      expect(aglexLib.checkIntegrationRequest).to.be.a('function')
    })

    it('should create a new integration if not found', () => {
      const ret = aglexLib.checkIntegrationRequest({
        httpMethod: 'GET',
        createIntegration: () => Promise.resolve(),
        _resource: {
          path: '/dummy'
        }
      })

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should update a current integration if changed', () => {
      const ret = aglexLib.checkIntegrationRequest({
        httpMethod: 'GET',
        methodIntegration: {type: 'MOCK'},
        updateIntegration: () => Promise.resolve(),
        _resource: {
          path: '/dummy'
        }
      })

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should do nothing if not changed', () => {
      const ret = aglexLib.checkIntegrationRequest({
        httpMethod: 'GET',
        methodIntegration: {type: 'Lambda'},
        _resource: {
          path: '/dummy'
        }
      })

      expect(ret).to.be.an.instanceof(Promise)
    })
  })

  describe('checkIntegrationResponses', () => {
    before(() => {
      conf.apiGateway.resources['/dummy'] = {GET: {
        request: {type: 'Lambda'},
        responses: {
          200: {
            responseHeaders: {
              'X-Test-Header': "'test value'"
            }
          }
        }
      }}
      apiGateway.returns({RestApi: stub})
      aglexLib = AglexLib(conf, 'none')
    })

    after(() => {
      apiGateway.reset()
      conf.apiGateway.resources = {}
    })

    it('should be a function', () => {
      expect(aglexLib.checkIntegrationResponses).to.be.a('function')
    })

    it('should create a new integration response if not found', () => {
      const ret = aglexLib.checkIntegrationResponses({
        createIntegrationResponse: () => Promise.resolve(),
        _method: {
          httpMethod: 'GET',
          _resource: {
            path: '/dummy'
          }
        }
      })

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should update a current integration response if changed', () => {
      const ret = aglexLib.checkIntegrationResponses({
        integrationResponses: {
          200: {
            responseParameters: {
              'method.response.header.X-Test-Header': "'old value'"
            },
            update: () => Promise.resolve()
          }
        },
        _method: {
          httpMethod: 'GET',
          _resource: {
            path: '/dummy'
          }
        }
      })

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should do nothing if integration not changed', () => {
      const ret = aglexLib.checkIntegrationResponses({
        integrationResponses: {
          200: {
            responseParameters: {
              'method.response.header.X-Test-Header': "'test value'"
            },
            responseTemplates: {'application/json': ''}
          }
        },
        _method: {
          httpMethod: 'GET',
          _resource: {
            path: '/dummy'
          }
        }
      })

      expect(ret).to.be.an.instanceof(Promise)
    })
  })

  describe('checkMethodResponses', () => {
    const sb = sinon.sandbox.create()

    before(() => {
      conf.apiGateway.resources['/dummy'] = {GET: {
        responses: {
          200: {
            responseHeaders: {
              'X-Test-Header': "'test value'"
            }
          }
        }
      }}
      apiGateway.returns({RestApi: stub})
      aglexLib = AglexLib(conf, 'none')
    })

    after(() => {
      apiGateway.reset()
      conf.apiGateway.resources = {}
    })

    afterEach(() => {
      sb.restore()
    })

    it('should be a function', () => {
      expect(aglexLib.checkMethodResponses).to.be.a('function')
    })

    it('should return a promise object', () => {
      const ret = aglexLib.checkMethodResponses({
        createMethodResponse: () => Promise.resolve(),
        httpMethod: 'GET',
        methodResponses: {},
        _resource: {
          path: '/dummy'
        }
      })

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should delete unused method response', () => {
      const func = sinon.stub().resolves()
      const ret = aglexLib.checkMethodResponses({
        createMethodResponse: () => Promise.resolve(),
        httpMethod: 'GET',
        methodResponses: {
          500: {
            delete: func
          }
        },
        _resource: {
          path: '/dummy'
        }
      })

      return ret.then(() => {
        expect(func).to.have.been.calledOnce
      })
    })

    it('should update method response', () => {
      const func = sinon.stub().resolves()
      const ret = aglexLib.checkMethodResponses({
        httpMethod: 'GET',
        methodResponses: {
          200: {
            update: func
          }
        },
        _resource: {
          path: '/dummy'
        }
      })

      return ret.then(() => {
        expect(func).to.have.been.calledOnce
      })
    })

    it('should create new method response', () => {
      const func = sb.stub(aglexLib, 'createMethodResponses')
        .resolves()
      const ret = aglexLib.checkMethodResponses({
        httpMethod: 'GET',
        _resource: {
          path: '/dummy'
        }
      })

      return ret.then(() => {
        expect(func).to.have.been.calledOnce
      })
    })
  })

  describe('checkMethods', () => {
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
      expect(aglexLib.checkMethods).to.be.a('function')
    })

    it('should return a promise object', () => {
      const ret = aglexLib.checkMethods({
        methods: () => new Promise(() => {})
      })

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should call deleteMethods, createMethods, checkIntegration', () => {
      const func1 = sb.stub(aglexLib, 'deleteMethods')
        .resolves([{}])
      const func2 = sb.stub(aglexLib, 'createMethods')
        .resolves([{}, {}])
      const func3 = sb.stub(aglexLib, 'checkIntegration')
        .resolves()

      return aglexLib.checkMethods({
        methods: () => Promise.resolve([])
      })
      .then(() => {
        expect(func1).to.have.been.calledOnce
        expect(func2).to.have.been.calledOnce
        expect(func3).to.have.been.calledTwice
      })
    })
  })

  describe('checkResources', () => {
    before(() => {
      apiGateway.returns({RestApi: stub})
    })

    after(() => {
      apiGateway.reset()
    })

    beforeEach(() => {
      aglexLib = AglexLib(conf, 'none')
    })

    afterEach(() => {
      conf.apiGateway.resources = {}
    })

    it('should be a function', () => {
      expect(aglexLib.checkResources).to.be.a('function')
    })

    it('should return a promise object', () => {
      const ret = aglexLib.checkResources({
        resources: () => new Promise(() => {})
      })

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with a valid object', () => {
      const ret = aglexLib.checkResources({
        resources: () => Promise.resolve([
          {id: '12345abcde', path: '/'}
        ])
      })

      expect(ret).to.become([{id: '12345abcde', path: '/'}])
    })

    it('should delete unused resources', () => {
      const res = sinon.stub()
      res
        .onFirstCall().resolves([
          {id: '12345abcde', path: '/'},
          {id: '67890eghij', path: '/dummy', delete: () => {}}
        ])
        .onSecondCall().resolves([
          {id: '12345abcde', path: '/'}
        ])
      const ret = aglexLib.checkResources({resources: res})

      expect(ret).to.become([{id: '12345abcde', path: '/'}])
    })

    it('should create new resources', () => {
      conf.apiGateway.resources['/dummy'] = [ 'GET' ]
      const res = sinon.stub()
      res
        .onFirstCall().resolves([
          {id: '12345abcde', path: '/'}
        ])
        .onSecondCall().resolves([
          {id: '12345abcde', path: '/'},
          {id: '67890eghij', path: '/dummy'}
        ])
      const ret = aglexLib.checkResources({
        createResource: () => Promise.resolve({}),
        resources: res
      })

      expect(ret).to.become([
        {id: '12345abcde', path: '/'},
        {id: '67890eghij', path: '/dummy'}
      ])
    })
  })

  describe('createMethodResponses', () => {
    const sb = sinon.sandbox.create()

    before(() => {
      conf.apiGateway.resources['/dummy'] = {GET: {
        responses: {
          200: {
            responseHeaders: {
              'X-Test-Header': "'test value'"
            }
          }
        }
      }}
      apiGateway.returns({RestApi: stub})
      aglexLib = AglexLib(conf, 'none')
    })

    after(() => {
      apiGateway.reset()
      conf.apiGateway.resources = {}
    })

    afterEach(() => {
      sb.restore()
    })

    it('should be a function', () => {
      expect(aglexLib.createMethodResponses).to.be.a('function')
    })

    it('should return a promise object', () => {
      const ret = aglexLib.createMethodResponses({
        createMethodResponse: () => Promise.resolve(),
        httpMethod: 'GET',
        _resource: {
          path: '/dummy'
        }
      })

      expect(ret).to.be.an.instanceof(Promise)
    })
  })

  describe('createMethods', () => {
    const sb = sinon.sandbox.create()

    before(() => {
      apiGateway.returns({RestApi: stub})
    })

    after(() => {
      apiGateway.reset()
    })

    beforeEach(() => {
      aglexLib = AglexLib(conf, 'none')
    })

    afterEach(() => {
      conf.apiGateway.resources = {}
      sb.restore()
    })

    it('should be a function', () => {
      expect(aglexLib.createMethods).to.be.a('function')
    })

    it('should return a promise object', () => {
      const ret = aglexLib.createMethods({}, [])

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should create new methods', () => {
      conf.apiGateway.resources['/dummy'] = {GET: {}}
      const func = sinon.stub().resolves({})
      const ret = aglexLib.createMethods({
        createMethod: func,
        path: '/dummy'
      }, [])

      expect(ret).to.become([{}])
      return ret.then(() => {
        expect(func).to.have.been.calledOnce
      })
    })
  })

  describe('deleteMethods', () => {
    before(() => {
      apiGateway.returns({RestApi: stub})
    })

    after(() => {
      apiGateway.reset()
    })

    beforeEach(() => {
      aglexLib = AglexLib(conf, 'none')
    })

    afterEach(() => {
      conf.apiGateway.resources = {}
    })

    it('should be a function', () => {
      expect(aglexLib.deleteMethods).to.be.a('function')
    })

    it('should return a promise object', () => {
      const ret = aglexLib.deleteMethods({}, [])

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should delete unused methods', () => {
      conf.apiGateway.resources['/dummy'] = {GET: {}}
      const func = sinon.stub().resolves()
      const ret = aglexLib.deleteMethods({path: '/dummy'}, [
        {httpMethod: 'GET', delete: func},
        {httpMethod: 'POST', delete: func}
      ])

      expect(ret).to.become([{httpMethod: 'GET', delete: func}])
      return ret.then(() => {
        expect(func).to.have.been.calledOnce
      })
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
        .withArgs('test')
        .resolves(apiObj)

      const ret = aglexLib.deployApi('desc', 'stage', 'stage desc')

      expect(ret).to.become({})
    })

    it('should resolve with a new api object', () => {
      stub.findByName = sinon.stub()
        .withArgs('test')
        .resolves(null)

      const ret = aglexLib.deployApi('desc', 'stage', 'stage desc')

      expect(ret).to.rejectedWith(Error)
    })
  })

  describe('getApi', () => {
    before(() => {
      apiGateway.returns({RestApi: stub})
      aglexLib = AglexLib(conf, 'none')
    })

    after(() => {
      apiGateway.reset()
    })

    it('should be a function', () => {
      expect(aglexLib.getApi).to.be.a('function')
    })

    it('should return a promise object', () => {
      stub.findByName = sinon.stub()
        .returns(new Promise(() => {}))

      const ret = aglexLib.getApi()

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with a current api object', () => {
      stub.findByName = sinon.stub()
        .withArgs('test')
        .resolves(apiObj)

      const ret = aglexLib.getApi()

      expect(ret).to.become(apiObj)
    })

    it('should resolve with a new api object', () => {
      stub.findByName = sinon.stub()
        .withArgs('test')
        .resolves(null)
      stub.create = sinon.stub()
        .withArgs(conf.apiGateway)
        .resolves(apiObj)

      const ret = aglexLib.getApi()

      expect(ret).to.become(apiObj)
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

      expect(ret).to.become([])
    })

    it('should reject if api not found', () => {
      stub.findByName = sinon.stub()
        .withArgs('test')
        .resolves(null)

      const ret = aglexLib.getApiStages()

      expect(ret).to.rejectedWith(Error)
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
      sb.stub(AWS._stub_.Lambda, 'getFunctionAsyncB')
        .returns(new Promise(() => {}))

      const ret = aglexLib.getLambda()

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with a valid object', () => {
      sb.stub(AWS._stub_.Lambda, 'getFunctionAsyncB')
        .returns(Promise.resolve({
          Configuration: {
            FunctionArn: 'arn:aws:lambda:local:12345:function:testLambda',
            FunctionName: 'testLambda'
          }
        }))

      const ret = aglexLib.getLambda()

      expect(ret).to.become({
        Configuration: {
          FunctionArn: 'arn:aws:lambda:local:12345:function:testLambda',
          FunctionName: 'testLambda'
        }
      })
    })

    it('should reject if lambda not found', () => {
      sb.stub(AWS._stub_.Lambda, 'getFunctionAsyncB')
        .returns(Promise.reject(new Error('Function not found')))

      const ret = aglexLib.getLambda()

      expect(ret).to.rejectedWith('Function not found')
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
      sb.stub(AWS._stub_.IAM, 'getRoleAsync')
        .returns(new Promise(() => {}))

      const ret = aglexLib.updateLambda('file')

      expect(ret).to.be.an.instanceof(Promise)
    })

    it('should resolve with a current lambda object', () => {
      sb.stub(AWS._stub_.IAM, 'getRoleAsync')
        .returns(Promise.resolve({
          Role: {
            Arn: 'arn:aws:iam::12345:role/test_role'
          }
        }))
      sb.stub(AWS._stub_.Lambda, 'getFunctionAsyncB')
        .returns(Promise.resolve({
          Configuration: {
            FunctionArn: 'arn:aws:lambda:local:12345:function:testLambda',
            FunctionName: 'testLambda'
          }
        }))
      sb.stub(AWS._stub_.Lambda, 'updateFunctionConfigurationAsyncB')
        .returns(Promise.resolve())
      sb.stub(AWS._stub_.Lambda, 'updateFunctionCodeAsyncB')
        .returns(Promise.resolve({FunctionName: 'testLambda'}))

      const ret = aglexLib.updateLambda('file')

      expect(ret).to.become({FunctionName: 'testLambda'})
    })

    it('should resolve with a new lambda object', () => {
      sb.stub(AWS._stub_.IAM, 'getRoleAsync')
        .returns(Promise.resolve({
          Role: {
            Arn: 'arn:aws:iam::12345:role/test_role'
          }
        }))
      sb.stub(AWS._stub_.Lambda, 'getFunctionAsyncB')
        .returns(Promise.reject({statusCode: 404}))
      sb.stub(AWS._stub_.Lambda, 'createFunctionAsyncB')
        .returns(Promise.resolve({FunctionName: 'testLambda'}))

      const ret = aglexLib.updateLambda('file')

      expect(ret).to.become({FunctionName: 'testLambda'})
    })
  })
})
