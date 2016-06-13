var fs = require('fs');
var path = require('path');
var _ = require('lodash');

module.exports = {
  normalizeMethods: function(resources, methodDefinitions) {
    var that = this;

    _.forEach(resources, function(resource, path) {
      if (_.isArray(resource)) {
        var tmp = {};
        _.forEach(resource, function(method) {
          tmp[method] = methodDefinitions[method] || methodDefinitions._DEFAULT_ || {};
        });
        resources[path] = tmp;
      }
    });
  },

  normalizeRequestTemplates: function(resources, region, lambdaArn) {
    var reqTemplate = fs.readFileSync(path.resolve(__dirname, '../config/requestTemplate.txt'), 'utf8');
    var that = this;

    var lambdaInvokationArn = 'arn:aws:apigateway:' +
      region + ':lambda:path/2015-03-31/functions/' +
      lambdaArn + '/invocations';

    _.forEach(resources, function(resource, path) {
      _.forEach(resource, function(definition, method) {
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
          });
          resource[method] = definition;
        }

        _.forEach(definition.request.requestTemplates, function(val, key) {
          if (_.isPlainObject(val) && val.file) {
            if (fs.statSync(val.file).isFile()) {
              definition.request.requestTemplates[key] = fs.readFileSync(val.file, 'utf8');
            }
          }
        });
      });
    });
  },

  normalizeResources: function(resources) {
    _.defaults(resources, {'/': {}});
    _.forEach(resources, function(res, key) {
      var path = '';
      _.forEach(_.tail(key.split('/')), function(fragment) {
        path += '/' + fragment;
        if (!resources[path]) {
          resources[path] = {};
        }
      });
    });
  }
};
