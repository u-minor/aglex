![aglex][aglex-img]

Aglex is a support tool for building serverless web applications using [Amazon API Gateway], [AWS Lambda] and [Express].

[![Build Status][npm-img]][npm-url]
[![Build Status][travis-img]][travis-url]
[![Coverage Status][coveralls-img]][coveralls-url]
[![Dependency Status][gemnasium-img]][gemnasium-url]
[![bitHound Code][bithound-img]][bithound-url]

**No more new frameworks for Lambda + API Gateway!**

[Express] is the most famous web framework for [Node.js].
Now you can use the same way to develop your API Gateway-Lambda web app.

## Installation

Global install

```bash
$ npm install aglex -g
```

or install and add to current package.

```bash
$ npm install aglex --save-dev
```

## Features

Aglex is not a web framework, just a small CLI tool which provides following features.

- Generate a small handler code for lambda which fake http request object and launch express app
- Create, update lambda function
- Add execute-api permission to the function
- Create, update and deploy API

## Quick start

1. Start your app with express-generator.

  ```bash
  $ npm install express-generator -g
  $ express myapp
  $ cd myapp && npm install
  ```

2. Modify `routes/users.js` to respond JSON data.

  ```diff
  @@ -3,7 +3,7 @@

   /* GET users listing. */
   router.get('/', function(req, res, next) {
  -  res.send('respond with a resource');
  +  res.json({message: 'respond with a resource'});
   });

   module.exports = router;
  ```

3. Generate config yaml

  ```bash
  $ aglex generate config > aglex.yml
  ```

  Edit it to match your environment.

  ```diff
  @@ -18,14 +18,14 @@
     Runtime: nodejs4.3
     MemorySize: 128
     Timeout: 60
  -  FunctionName: YOUR_LAMBDA_FUNCTION_NAME
  -  Description: YOUR_LAMBDA_DESCRIPTION
  -  RoleName: YOUR_LAMBDA_EXECUTION_ROLE # Role ARN will generate from RoleName automatically
  +  FunctionName: myapp
  +  Description: myapp
  +  RoleName: lambda-myapp # Role ARN will generate from RoleName automatically

   ## API Gateway configuration
   apiGateway:
  -  name: YOUR_API_NAME
  -  description: YOUR_API_DESCRIPTION
  +  name: myapp
  +  description: myapp

     ## Method template definitions for each httpMethod
     methodDefinitions:
  @@ -51,10 +51,5 @@

     ## API resources
     resources:
  -    /path/to/static/endpoint:
  +    /users:
         - GET
  -    /path/to/dynamic/endpoint/{param}:
  -      - GET
  -      - PUT
  -      - OPTIONS
  ```

4. Generate small lambda handler code

  ```bash
  $ aglex generate lambda-handler > lambda.js
  ```

5. Create lambda zip

  ```bash
  $ zip -r lambda.zip app.js lambda.js routes views node_modules
  ```

  > Use Gulp/Grunt if you want to do more tasks.

6. Create/update your lambda function

  ```bash
  $ aglex --config aglex.yml lambda update --zip lambda.zip
  ```

  > Create IAM Role for Lambda function `lambda-myapp` before execution.

7. Add execute permission to your lambda function (first time only)

  ```bash
  $ aglex --config aglex.yml lambda add-permission
  ```

8. Create/update API

  ```bash
  $ aglex --config aglex.yml apigateway update
  ```

9. Create stage and deploy API

  ```bash
  $ aglex --config aglex.yml apigateway deploy --stage dev
  ```

For more information, please see wiki docs.

[aglex-img]: https://raw.githubusercontent.com/u-minor/aglex/master/logo.png
[npm-img]: https://img.shields.io/npm/v/aglex.svg
[npm-url]: https://npmjs.org/package/aglex
[travis-img]: https://img.shields.io/travis/u-minor/aglex/master.svg
[travis-url]: https://travis-ci.org/u-minor/aglex
[coveralls-img]: https://img.shields.io/coveralls/u-minor/aglex/master.svg
[coveralls-url]: https://coveralls.io/r/u-minor/aglex?branch=master
[gemnasium-img]: https://img.shields.io/gemnasium/u-minor/aglex.svg
[gemnasium-url]: https://gemnasium.com/u-minor/aglex
[bithound-img]: https://img.shields.io/bithound/code/github/u-minor/aglex.svg
[bithound-url]: https://www.bithound.io/github/u-minor/aglex
[Amazon API Gateway]: https://aws.amazon.com/api-gateway/
[AWS Lambda]: https://aws.amazon.com/lambda/
[Express]: http://expressjs.com/
[Node.js]: https://nodejs.org/
