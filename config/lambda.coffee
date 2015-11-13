###
aglex lambda handler
###
app = require './app'
http = require 'http'
net = require 'net'

exports.handler = (event, context) ->
  if event.body
    event.body = JSON.stringify event.body
    event.headers['content-length'] = event.body.length

  path = event.path
  # reconstruct path
  for key, val of event.pathParams
    path = path.replace "{#{key}}", val
  # reconstruct querystring
  querystring = ("#{key}=#{val}" for key, val of event.queryParams).join '&'
  path += "?#{querystring}" if querystring

  # create request object
  req = new http.IncomingMessage()
  req.method = event.method
  req._remoteAddress = event.remoteAddr
  req.url = path
  req.headers = do ->
    ret = {}
    for key, val of event.headers
      ret[key.toLowerCase()] = val
    ret
  req.connection = req.socket = new net.Socket()

  # create response object
  res = new http.ServerResponse req
  res.end = (chunk, encoding) ->
    data = JSON.parse chunk.toString encoding
    context.done null, data

  try
    # call express app
    app req, res
    req.emit 'data', event.body
    req.emit 'end'
  catch e
    console.log 'req error'
    context.done e, e
