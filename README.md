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

**UPDATE**: now 2.x uses [aws-serverless-express] and new config yaml.


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

- Generate a small lambda handler code
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
     swagger: 2.0
     info:
  -    title: YOUR_API_NAME
  -    description: YOUR_API_DESCRIPTION
  +    title: myapp
  +    description: myapp
     basePath: /prod
     schemes:
       - https
  ```

4. Generate lambda handler code and install [aws-serverless-express]

  ```bash
  $ aglex generate lambda-handler > lambda.js
  $ npm install -S aws-serverless-express
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

## See Also

 * [aws-serverless-express] is developed by AWS to make it easy to run Express apps on Lambda.

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
[aws-serverless-express]: https://github.com/awslabs/aws-serverless-express
