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

  Currently not supported. Please use AWS CLI or Management Console.
