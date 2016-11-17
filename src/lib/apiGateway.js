import AWS from 'aws-sdk'
import {restApi} from './apiGateway/restApi'

export default () => {
  const apiGateway = new AWS.APIGateway()

  return {
    RestApi: restApi(apiGateway)
  }
}
