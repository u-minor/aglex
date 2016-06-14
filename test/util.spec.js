import { expect } from './helper'

import util from '../src/lib/util'
util.__Rewire__('fs', {
  readFileSync: () => '{"key": "value"}',
  statSync: () => {
    return {isFile: () => true}
  }
})

describe('util', () => {
  describe('normalizeMethods', () => {
    it('should be a function', () => {
      expect(util.normalizeMethods).to.be.a('function')
    })

    it('should normalize method definitions', () => {
      const resources = {
        '/dummy': [ 'GET', 'OPTIONS' ]
      }
      const methodDefs = {
        GET: {
          request: {
            type: 'Lambda'
          }
        }
      }
      util.normalizeMethods(resources, methodDefs)
      expect(resources).to.deep.equal({
        '/dummy': {
          GET: {
            request: {
              type: 'Lambda'
            }
          },
          OPTIONS: {}
        }
      })
    })

    it('should fallback to definition "_DEFAULT_" if method not exists', () => {
      const resources = {
        '/dummy': [ 'GET' ]
      }
      const methodDefs = {
        _DEFAULT_: {
          request: {
            type: 'Lambda'
          }
        }
      }
      util.normalizeMethods(resources, methodDefs)
      expect(resources).to.deep.equal({
        '/dummy': {
          GET: {
            request: {
              type: 'Lambda'
            }
          }
        }
      })
    })
  })

  describe('normalizeRequestTemplates', () => {
    it('should be a function', () => {
      expect(util.normalizeRequestTemplates).to.be.a('function')
    })

    it('should generate request templates for lambda', () => {
      const resources = {
        '/dummy': {
          GET: {
            request: {
              type: 'Lambda'
            }
          }
        }
      }
      util.normalizeRequestTemplates(resources, 'local', 'arn:aws:lambda:local:12345:function:testLambda')
      expect(resources).to.deep.equal({
        '/dummy': {
          GET: {
            request: {
              integrationHttpMethod: 'POST',
              requestTemplates: {
                'application/json': '{"key": "value"}'
              },
              type: 'AWS',
              uri: 'arn:aws:apigateway:local:lambda:path/2015-03-31/functions/arn:aws:lambda:local:12345:function:testLambda/invocations'
            }
          }
        }
      })
    })

    it('should load request templates from custom file', () => {
      const resources = {
        '/dummy': {
          GET: {
            request: {
              type: 'MOCK',
              requestTemplates: {
                'application/json': {
                  file: 'custom.txt'
                }
              }
            }
          }
        }
      }
      util.normalizeRequestTemplates(resources, 'local', 'arn:aws:lambda:local:12345:function:testLambda')
      expect(resources).to.deep.equal({
        '/dummy': {
          GET: {
            request: {
              type: 'MOCK',
              requestTemplates: {
                'application/json': '{"key": "value"}'
              }
            }
          }
        }
      })
    })
  })

  describe('normalizeResources', () => {
    it('should be a function', () => {
      expect(util.normalizeResources).to.be.a('function')
    })

    it('should normalize resources object', () => {
      const resources = {
        '/path/to/api': {}
      }
      util.normalizeResources(resources)
      expect(resources).to.deep.equal({
        '/': {},
        '/path': {},
        '/path/to': {},
        '/path/to/api': {}
      })
    })
  })
})
