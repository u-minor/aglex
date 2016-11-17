import { expect } from './helper'

import util from '../src/lib/util'

describe('util', () => {
  describe('normalizeApiDefinition', () => {
    it('should be a function', () => {
      expect(util.normalizeApiDefinition).to.be.a('function')
    })

    it('should generate request templates for lambda', () => {
      const resources = {
        paths: {
          '/{proxy+}': {
            'x-amazon-apigateway-any-method': {
              'x-amazon-apigateway-integration': {
                type: 'aws_proxy',
                uri: 'LAMBDA_INVOCATION_ARN'
              }
            }
          },
          '/other': {
            GET: {}
          }
        }
      }
      util.normalizeApiDefinition(resources, 'local', 'arn:aws:lambda:local:12345:function:testLambda')
      expect(resources).to.deep.equal({
        paths: {
          '/{proxy+}': {
            'x-amazon-apigateway-any-method': {
              'x-amazon-apigateway-integration': {
                type: 'aws_proxy',
                uri: 'arn:aws:apigateway:local:lambda:path/2015-03-31/functions/arn:aws:lambda:local:12345:function:testLambda/invocations'
              }
            }
          },
          '/other': {
            GET: {}
          }
        }
      })
    })
  })
})
