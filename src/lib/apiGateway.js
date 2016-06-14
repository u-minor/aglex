import AWS from 'aws-sdk'
import Promise from 'bluebird'
import {restApi} from './apiGateway/restApi'

export default () => {
  const apiGateway = Promise.promisifyAll(new AWS.APIGateway())

  return {
    RestApi: restApi(apiGateway)
  }
}
