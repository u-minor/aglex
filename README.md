# aglex: APIGateway Lambda Express

Aglex is a support tool for building serverless web applications using [Amazon API Gateway](https://aws.amazon.com/api-gateway/), [AWS Lambda](https://aws.amazon.com/lambda/) and [Express](http://expressjs.com/).

Express is the most famous web framework for Node.js.
You can use the same way to develop your API Gateway-Lambda web app.

This tool provides following features.

- generate a small handler code for lambda which fake http request object and launch express app
- create/update lambda function
- add execute-api permission to the function
- create/update API

## Quick start

1. Install aglex

  ```
  npm install aglex -g
  ```

2. Start your app with express-generator.

  ```
  npm install express-generator -g
  express myapp
  cd myapp && npm install
  ```

  Modify `routes/users.js` to respond JSON data.

  ```diff
  6c6
  <   res.send('respond with a resource');
  ---
  >   res.json({message: 'respond with a resource'});
  ```

3. Generate config yaml

  ```
  aglex generate config > aglex.yml
  ```

  Edit it to match your environment.

  ```diff
  20,22c20,22
  <   FunctionName: YOUR_LAMBDA_FUNCTION_NAME
  <   Description: YOUR_LAMBDA_DESCRIPTION
  <   RoleName: YOUR_LAMBDA_EXECUTION_ROLE
  ---
  >   FunctionName: myapp
  >   Description: myapp
  >   RoleName: lambda_basic_execution
  26,27c26,27
  <   name: YOUR_API_NAME
  <   description: YOUR_API_DESCRIPTION
  ---
  >   name: myapp
  >   description: myapp
  53c53
  <     /path/to/static/endpoint:
  ---
  >     /users:
  55,58d54
  <     /path/to/dynamic/endpoint/{param}:
  <       - GET
  <       - PUT
  <       - OPTIONS
  ```

4. Generate lambda handler

  ```
  aglex generate lambda-handler > lambda.js
  ```

5. Create lambda zip

  ```
  zip -r lambda.zip app.js lambda.js routes views node_modules
  ```

  > Use Gulp/Grunt if you want to do more tasks.

5. Create/update your lambda function

  ```
  aglex --config aglex.yml lambda update --zip lambda.zip
  ```

6. Add execute permission to your lambda function (first time only)

  ```
  aglex --config aglex.yml lambda add-permission
  ```

7. Create/update API

  ```
  aglex --config aglex.yml apigateway update
  ```

8. Create stage and deploy API

  ```
  aglex --config aglex.yml apigateway deploy --stage dev
  ```

## using with gulp

For an example of a project gulpfile.js in JavaScript, see [./examples/gulpfile.js](examples/gulpfile.js);

Below is the simple gulpfile example using CoffeeScript.

- create `aglex-{env}.yml` for each env.
- use [node-config](https://www.npmjs.com/package/config) to switch env.
- `gulp updateLambda --env={env}` to create/update Lambda function.
- `gulp addLambdaPermission --env={env}` to add lambda execution to the IAM role. (one-time-only)
- `gulp updateApi --env={env}` to create/update API definitions.
- `gulp deployApi --env={env}` to deploy API.

```gulpfile.coffee
fs = require 'fs'
gulp = require 'gulp'
gutil = require 'gulp-util'
coffee = require 'gulp-coffee'
argv = require('yargs').argv
yaml = require 'js-yaml'

try
  aglexConfig = yaml.safeLoad fs.readFileSync("aglex-#{argv.env or 'development'}.yml", 'utf8')
  aglex = require('aglex') aglexConfig, 'info'
catch e

sourceFiles = ['src/**/*.coffee']
specFiles = ['test/**/*.spec.coffee']
watching = false

gulp.task 'serve', ->
  gls = require 'gulp-live-server'
  server = gls 'src/www.coffee', env: {NODE_ENV: 'staging'}
  server.start 'node_modules/coffee-script/bin/coffee'

  gulp.watch sourceFiles, ->
    console.log 'restart server'
    server.start.bind(server)()

gulp.task 'build', ->
  runSequence = require 'run-sequence'

  runSequence 'clean', 'updateLambda'

gulp.task 'clean', (done) ->
  del = require 'del'

  del 'build', done
  return

gulp.task 'coffee', ->
  gulp.src 'src/**/*.coffee'
  .pipe coffee bare: true
  .pipe gulp.dest 'build'

gulp.task 'copyPackages', ->
  pkg = require './package.json'

  gulp.src "node_modules/@(#{Object.keys(pkg.dependencies).join '|'})/**"
  .pipe gulp.dest 'build/node_modules'

gulp.task 'copyConfig', ->
  rename = require 'gulp-rename'

  gulp.src "config/#{argv.env or 'development'}.yml"
  .pipe rename 'default.yml'
  .pipe gulp.dest 'build/config'

gulp.task 'zip', ['coffee', 'copyConfig', 'copyPackages'], ->
  zip = require 'gulp-zip'

  gulp.src 'build/**'
  .pipe zip 'lambda.zip'
  .pipe gulp.dest 'dist'

gulp.task 'updateLambda', ['zip'], (done) ->
  aglex.updateLambda('dist/lambda.zip').then ->
    done()
  return

gulp.task 'addLambdaPermission', (done) ->
  aglex.addLambdaPermission().then ->
    done()
  return

gulp.task 'updateApi', (done) ->
  aglex.updateApi().then ->
    done()
  return

gulp.task 'deployApi', (done) ->
  unless argv.stage
    console.log 'Please use --stage STAGENAME'
    return
  aglex.deployApi(argv.desc, argv.stage, argv.stagedesc).then ->
    done()
  return

gulp.task 'watch', ->
  watching = true
  gulp.watch sourceFiles, ['lint']
  gulp.watch specFiles, ['lint:test', 'test']

gulp.task 'lint', ->
  coffeelint = require 'gulp-coffeelint'

  gulp.src sourceFiles
  .pipe coffeelint()
  .pipe coffeelint.reporter()

gulp.task 'lint:test', ->
  coffeelint = require 'gulp-coffeelint'

  gulp.src specFiles
  .pipe coffeelint()
  .pipe coffeelint.reporter()

gulp.task 'coverage', ->
  istanbul = require 'gulp-coffee-istanbul'
  mocha = require 'gulp-mocha'

  gulp.src sourceFiles
  .pipe istanbul includeUntested: false
  .pipe istanbul.hookRequire()
  .on 'finish', ->
    gulp.src specFiles
    .pipe mocha
      reporter: 'spec'
    .on 'error', (err) ->
      gutil.log err.toString()
      if watching then this.emit 'end' else process.exit 1
    .pipe istanbul.writeReports
      dir: 'coverage'
      reporters: ['text', 'lcov']

gulp.task 'coverage:ci', ->
  istanbul = require 'gulp-coffee-istanbul'
  mocha = require 'gulp-mocha'

  gulp.src sourceFiles
  .pipe istanbul includeUntested: false
  .pipe istanbul.hookRequire()
  .on 'finish', ->
    fs = require 'fs'
    fs.mkdir 'reports', ->
      gulp.src specFiles
      .pipe mocha
        reporter: 'xunit'
        reporterOptions:
          output: 'reports/mocha.xml'
      .on 'error', (err) ->
        gutil.log err.toString()
        if watching then this.emit 'end' else process.exit 1
      .pipe istanbul.writeReports
        dir: 'coverage'
        reporters: ['text-summary', 'lcov', 'cobertura']

gulp.task 'test', ['coverage']
gulp.task 'test:ci', ['coverage:ci']
```
