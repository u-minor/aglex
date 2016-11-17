import _ from 'lodash'

export default {
  normalizeApiDefinition (definition, region, lambdaArn) {
    const lambdaInvokationArn = `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`

    _.forEach(definition.paths, (resource, path) => {
      _.forEach(resource, (method, methodName) => {
        if (method['x-amazon-apigateway-integration'] && method['x-amazon-apigateway-integration'].type === 'aws_proxy') {
          method['x-amazon-apigateway-integration'].uri = lambdaInvokationArn
        }
      })
    })
  }
}
