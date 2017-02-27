'use strict';

const AWS = require('aws-sdk');
const async = require('async');
const schema = require('./payload-schema.json');
const config = require('./config.js');
const jsonSchemaValidator = require('jsonschema').validate;

const S3 = new AWS.S3(config.S3);
const LAMBDA = new AWS.Lambda(config.LAMBDA);

exports.handler = (event, context, lambdaCallback) => {
    let error = validate(event);
    if (error) return lambdaCallback(JSON.stringify(error), null);

    let tasks = [];

    event.data.forEach(function(client) {
        let id = client['id'];
        let parameters = {
            Bucket: 'decision-engine/clients',
            Key: id.toString(),
            ContentType: 'application/json',
            Body: JSON.stringify(client)
        };

        tasks.push(function(asyncCallback) {
            S3.putObject(parameters, function(err) {
                if (err) {
                    return asyncCallback(err, null);
                }
                asyncCallback(null, client);
            });
        });
    });

    async.parallel(tasks, function(err, results) {
        if (err) {
            lambdaCallback(err, null);
        } else {
            const response = {
                statusCode: 200,
                message: 'OK. Clients created',
                data: results
            };

            lambdaCallback(null, response);
            let parameters = {
                FunctionName: 'helloworld',
                InvocationType: 'RequestResponse',
                Payload: JSON.stringify(response)
            };
            LAMBDA.invoke(parameters, function(err, data) {
              if (err) {
                // could not invoke lambda
              } else {
                  // successfully triggered lambda
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
};