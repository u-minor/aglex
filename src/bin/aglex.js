#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import Debug from 'debug'
import Yargs from 'yargs'
import yaml from 'js-yaml'

const debug = Debug('aglex.bin')

const yargs = Yargs.usage('Usage: $0 <command> ... [options]')
  .command('generate', 'Commands to generate something', yargs => {
    argv = yargs
      .usage('Usage: $0 generate <subcommand> [options]')
      .command('config', 'Generate configuration yaml template', yargs => {
        argv = yargs
          .usage('Usage: $0 generate config')
          .help('help').alias('help', 'h')
          .argv
      })
      .command('lambda-handler', 'Generate lambda handler code', yargs => {
        argv = yargs
          .usage('Usage: $0 generate lambda-handler')
          .help('help').alias('help', 'h')
          .argv
      })
      .option('config', {alias: 'c', demand: true, nargs: 1, type: 'string', describe: 'YAML config file'})
      .help('help').alias('help', 'h')
      .argv
  })
  .command('apigateway', 'Commands for API Gateway', yargs => {
    argv = yargs
      .usage('Usage: $0 apigateway <subcommand> [options]')
      .command('update', 'Create/update API')
      .command('stages', 'Gets stage information')
      .command('deploy', 'Deploy API', yargs => {
        argv = yargs
          .usage('Usage: $0 apigateway update [options]')
          .option('config', {alias: 'c', demand: true, nargs: 1, type: 'string', describe: 'YAML config file'})
          .option('stage', {alias: 's', demand: true, nargs: 1, type: 'string', describe: 'Stage name'})
          .option('desc', {alias: 'd', demand: false, nargs: 1, type: 'string', describe: 'Deployment description'})
          .option('stagedesc', {demand: false, nargs: 1, type: 'string', describe: 'Stage description'})
          .help('help').alias('help', 'h')
          .argv
      })
      .demand(2, 'must provide a valid subcommand')
      .option('config', {alias: 'c', demand: true, nargs: 1, type: 'string', describe: 'YAML config file'})
      .help('help').alias('help', 'h')
      .argv
  })
  .command('lambda', 'Commands for Lambda', yargs => {
    argv = yargs
      .usage('Usage: $0 lambda <subcommand> [options]')
      .command('update', 'Create/update Lambda function', yargs => {
        argv = yargs
          .usage('Usage: $0 lambda update [options]')
          .option('config', {alias: 'c', demand: true, nargs: 1, type: 'string', describe: 'YAML config file'})
          .option('zip', {alias: 'z', demand: true, nargs: 1, type: 'string', describe: 'Lambda zip file'})
          .help('help').alias('help', 'h')
          .argv
      })
      .command('add-permission', 'Add execute-api permission to the function', yargs => {
        argv = yargs
          .usage('Usage: $0 lambda add-permission [options]')
          .option('config', {alias: 'c', demand: true, nargs: 1, type: 'string', describe: 'YAML config file'})
          .help('help').alias('help', 'h')
          .argv
      })
      .demand(2, 'must provide a valid subcommand')
      .option('config', {alias: 'c', demand: true, nargs: 1, type: 'string', describe: 'YAML config file'})
      .help('help').alias('help', 'h')
      .argv
  })
  .demand(1, 'must provide a valid command')
  .option('config', {alias: 'c', demand: true, nargs: 1, type: 'string', describe: 'YAML config file'})
  .help('help').alias('help', 'h')
var argv = yargs.argv

const config = ((file => {
  if (!file) {
    return ''
  }
  let data
  const cwd = process.cwd()
  process.chdir(path.dirname(argv.config))
  data = yaml.safeLoad(fs.readFileSync(path.basename(argv.config), 'utf8'))
  process.chdir(cwd)
  return data
}))(argv.config)

import Aglex from '../lib/aglex'
const aglex = Aglex(config, 'info')

switch (argv._[0]) {
  case 'generate':
    switch (argv._[1]) {
      case 'config':
        console.log(aglex.generateConfig())
        break
      case 'lambda-handler':
        console.log(aglex.generateLambdaHandler())
        break
      default:
        yargs.showHelp()
    }
    break
  case 'apigateway':
    switch (argv._[1]) {
      case 'deploy':
        console.log('Deploying API ...')
        aglex.deployApi(argv.desc, argv.stage, argv.stagedesc).then(data => {
          console.log('Completed.')
        }, err => {
          debug(err)
          process.exit(1)
        })
        break
      case 'stages':
        console.log('Getting stage info for API ...')
        aglex.getApiStages().then(stages => {
          for (let stage of stages) {
            console.log(`${stage.stageName}: ${stage.description} (${stage.invokeUrl})`)
          }
          console.log('Completed.')
        }, err => {
          debug(err)
          process.exit(1)
        })
        break
      case 'update':
        console.log('Updating API ...')
        aglex.updateApi().then(() => {
          console.log('Completed.')
        }, err => {
          debug(err)
          process.exit(1)
        })
        break
      default:
        yargs.showHelp()
    }
    break
  case 'lambda':
    switch (argv._[1]) {
      case 'update':
        console.log('Updating lambda function ...')
        aglex.updateLambda(argv.zip).then(() => {
          console.log('Completed.')
        }, err => {
          debug(err)
          process.exit(1)
        })
        break
      case 'add-permission':
        console.log('Adding execute-api permission to the lambda function ...')
        aglex.addLambdaPermission().then(() => {
          console.log('Completed.')
        }, err => {
          debug(err)
          process.exit(1)
        })
        break
      default:
        yargs.showHelp()
    }
    break
  default:
    yargs.showHelp()
}
