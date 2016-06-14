import fs from 'fs'
import path from 'path'
import _ from 'lodash'

export default {
  normalizeMethods (resources, methodDefinitions) {
    _.forEach(resources, (resource, path) => {
      if (_.isArray(resource)) {
        const tmp = {}
        _.forEach(resource, method => {
          tmp[method] = methodDefinitions[method] || methodDefinitions._DEFAULT_ || {}
        })
        resources[path] = tmp
      }
    })
  },

  normalizeRequestTemplates (resources, region, lambdaArn) {
    const reqTemplate = fs.readFileSync(path.resolve(__dirname, '../../config/requestTemplate.txt'), 'utf8')

    const lambdaInvokationArn = `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`

    _.forEach(resources, (resource, path) => {
      _.forEach(resource, (definition, method) => {
        if (definition.request.type === 'Lambda') {
          definition = _.defaultsDeep({
            request: {
              type: 'AWS',
              integrationHttpMethod: 'POST',
              uri: lambdaInvokationArn
            }
          }, definition, {
            request: {
              requestTemplates: {
                'application/json': reqTemplate
              }
            }
          })
          resource[method] = definition
        }

        _.forEach(definition.request.requestTemplates, (val, key) => {
          if (_.isPlainObject(val) && val.file) {
            if (fs.statSync(val.file).isFile()) {
              definition.request.requestTemplates[key] = fs.readFileSync(val.file, 'utf8')
            }
          }
        })
      })
    })
  },

  normalizeResources (resources) {
    _.defaults(resources, {'/': {}})
    _.forEach(resources, (res, key) => {
      let path = ''
      _.forEach(_.tail(key.split('/')), fragment => {
        path += `/${fragment}`
        if (!resources[path]) {
          resources[path] = {}
        }
      })
    })
  }
}
