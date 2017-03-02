'use strict';

const AWS = require('aws-sdk');
const async = require('async');
const schema = require('./payload-schema.json');
const credentials = require('./config.js');
const jsonSchemaValidator = require('jsonschema').validate;

const S3 = new AWS.S3(credentials['inno']);
const LAMBDA = new AWS.Lambda(credentials['kon']);

exports.handler = function(event, context, globalCallback) {
  let error = validate(event);
  if (error) return globalCallback(JSON.stringify(error), null);

  let tasks = [];

  event.data.forEach(function (client) {
    let id = client.id;
    let s3parameters = {
      Bucket: 'decision-engine-client',
      Key: id.toString(),
      ContentType: 'application/json',
      Body: JSON.stringify(client)
    };

    tasks.push(function(asyncCallback) {
      S3.putObject(s3parameters, function(err) {
        if (err) {
          S3.putObject(errorLog(id, 'Failed to put object in S3'), function() {
              asyncCallback(err, null)
          });
        } else {
            asyncCallback(null, client);
        }
      });
    });
  });

  async.parallel(tasks, function (err, results) {
    if (err) {
      globalCallback(JSON.stringify(err), null);
    } else {
      const response = {
        statusCode: 200,
        message: 'OK. Clients created',
        data: results
      };

      let lambdaParameters = {
        FunctionName: 'helloworld',
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify(event)
      };
      LAMBDA.invoke(lambdaParameters, function(err) {
        if (err) {
            S3.putObject(errorLog(id, 'Failed to put object in S3'), function() {
              globalCallback(JSON.stringify(err), null);
            });
        } else {
            globalCallback(null, response);
        }
      });
    }
  });

  function validate(event) {
    let validationResult = jsonSchemaValidator(event, schema);

    return validationResult.errors.length ? {
        statusCode: 400,
        message: validationResult.errors[0].stack,
        data: event
      } : null;
  }

  function errorLog(clientId, message) {
    return {
      Bucket: 'decision-engine-error-logs',
      Key: `${clientId} - ${(new Date()).toString()}`,
      ContentType: 'application/json',
      Body: JSON.stringify({
          lambdaFunctionName: context.functionName,
          awsRequestId: context.awsRequestId,
          requestPayload: event,
          message: message
      })
    };
  }
};