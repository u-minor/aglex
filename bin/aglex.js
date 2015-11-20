#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var debug = require('debug')('aglex.bin');
var yaml = require('js-yaml');
var yargs = require('yargs')
  .usage('Usage: $0 <command> ... [options]')
  .command('generate', 'Commands to generate something', function(yargs) {
    argv = yargs
      .usage('Usage: $0 generate <subcommand> [options]')
      .command('config', 'Generate configuration yaml template', function(yargs) {
        argv = yargs
          .usage('Usage: $0 generate config')
          .help('help').alias('help', 'h')
          .argv;
      })
      .command('lambda-handler', 'Generate lambda handler code', function(yargs) {
        argv = yargs
          .usage('Usage: $0 generate lambda-handler [options]')
          .option('coffee', {demand: false, describe: 'Generate CoffeeScript code'})
          .help('help').alias('help', 'h')
          .argv;
      })
      .option('config', {alias: 'c', demand: true, nargs: 1, type: 'string', describe: 'YAML config file'})
      .help('help').alias('help', 'h')
      .argv;
  })
  .command('apigateway', 'Commands for API Gateway', function(yargs) {
    argv = yargs
      .usage('Usage: $0 apigateway <subcommand> [options]')
      .command('update', 'Create/update API')
      .command('stages', 'Gets stage information')
      .command('deploy', 'Deploy API', function(yargs) {
        argv = yargs
          .usage('Usage: $0 apigateway update [options]')
          .option('config', {alias: 'c', demand: true, nargs: 1, type: 'string', describe: 'YAML config file'})
          .option('stage', {alias: 's', demand: true, nargs: 1, type: 'string', describe: 'Stage name'})
          .option('desc', {alias: 'd', demand: false, nargs: 1, type: 'string', describe: 'Deployment description'})
          .option('stagedesc', {demand: false, nargs: 1, type: 'string', describe: 'Stage description'})
          .help('help').alias('help', 'h')
          .argv;
      })
      .demand(2, 'must provide a valid subcommand')
      .option('config', {alias: 'c', demand: true, nargs: 1, type: 'string', describe: 'YAML config file'})
      .help('help').alias('help', 'h')
      .argv;
  })
  .command('lambda', 'Commands for Lambda', function(yargs) {
    argv = yargs
      .usage('Usage: $0 lambda <subcommand> [options]')
      .command('update', 'Create/update Lambda function', function(yargs) {
        argv = yargs
          .usage('Usage: $0 lambda update [options]')
          .option('config', {alias: 'c', demand: true, nargs: 1, type: 'string', describe: 'YAML config file'})
          .option('zip', {alias: 'z', demand: true, nargs: 1, type: 'string', describe: 'Lambda zip file'})
          .help('help').alias('help', 'h')
          .argv;
      })
      .command('add-permission', 'Add execute-api permission to the function', function(yargs) {
        argv = yargs
          .usage('Usage: $0 lambda add-permission [options]')
          .option('config', {alias: 'c', demand: true, nargs: 1, type: 'string', describe: 'YAML config file'})
          .help('help').alias('help', 'h')
          .argv;
      })
      .demand(2, 'must provide a valid subcommand')
      .option('config', {alias: 'c', demand: true, nargs: 1, type: 'string', describe: 'YAML config file'})
      .help('help').alias('help', 'h')
      .argv;
  })
  .demand(1, 'must provide a valid command')
  .option('config', {alias: 'c', demand: true, nargs: 1, type: 'string', describe: 'YAML config file'})
  .help('help').alias('help', 'h');
var argv = yargs.argv;

var config = (function(file) {
  if (!file) {
    return '';
  }
  var data, cwd = process.cwd();
  process.chdir(path.dirname(argv.config));
  data = yaml.safeLoad(fs.readFileSync(path.basename(argv.config), 'utf8'));
  process.chdir(cwd);
  return data;
})(argv.config);

var aglex = require('../lib/aglex')(config, 'info');

switch (argv._[0]) {
  case 'generate':
    switch (argv._[1]) {
      case 'config':
        console.log(aglex.generateConfig());
        break;
      case 'lambda-handler':
        console.log(aglex.generateLambdaHandler(argv.coffee));
        break;
      default:
        yargs.showHelp();
    }
    break;
  case 'apigateway':
    switch (argv._[1]) {
      case 'deploy':
        console.log('Deploying API ...');
        aglex.deployApi(argv.desc, argv.stage, argv.stagedesc).then(function(data) {
          console.log('Completed.');
        }, function(err) {
          debug(err);
          console.log('Failed.');
        });
        break;
      case 'stages':
        console.log('Getting stage info for API ...');
        aglex.getApiStages().then(function(data) {
          _.forEach(data, function(val, key) {
            console.log(key + ': ' + val);
          });
          console.log('Completed.');
        }, function(err) {
          debug(err);
          console.log('Failed.');
        });
        break;
      case 'update':
        console.log('Updating API ...');
        aglex.updateApi().then(function() {
          console.log('Completed.');
        }, function(err) {
          debug(err);
          console.log('Failed.');
        });
        break;
      default:
        yargs.showHelp();
    }
    break;
  case 'lambda':
    switch (argv._[1]) {
      case 'update':
        console.log('Updating lambda function ...');
        aglex.updateLambda(argv.zip).then(function() {
          console.log('Completed.');
        }, function(err) {
          debug(err);
          console.log('Failed.');
        });
        break;
      case 'add-permission':
        console.log('Adding execute-api permission to the lambda function ...');
        aglex.addLambdaPermission().then(function() {
          console.log('Completed.');
        }, function(err) {
          debug(err);
          console.log('Failed.');
        });
        break;
      default:
        yargs.showHelp();
    }
    break;
  default:
    yargs.showHelp();
}
