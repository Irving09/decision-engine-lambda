'use strict';

const AWS = require('aws-sdk');
const async = require('async');
const schema = require('./payload-schema.json');
const jsonSchemaValidator = require('jsonschema').validate;

const S3 = new AWS.S3({
  accessKeyId: process.env['AWS_S3_ACCESS_KEY_ID'],
  secretAccessKey: process.env['AWS_S3_SECRET_ACCESS_KEY'],
  region: process.env['AWS_S3_REGION']
});

exports.handler = (event, context, lambdaCallback) => {
    let error = validate(event, context);
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
        }
    });

    function validate(event, context) {
        let validationResult = jsonSchemaValidator(event, schema);

        return validationResult.errors.length ? {
            statusCode: 400,
            message: validationResult.errors[0].stack,
            data: event
        } : null;
    }
};