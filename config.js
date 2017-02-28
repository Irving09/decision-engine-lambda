module.exports = {
  inno: {
    accessKeyId: process.env['AWS_S3_ACCESS_KEY_ID'],
    secretAccessKey: process.env['AWS_S3_SECRET_ACCESS_KEY'],
    region: process.env['AWS_S3_REGION']
  },
  kon: {
    accessKeyId: process.env['AWS_LAMBDA_ACCESS_KEY_ID'],
    secretAccessKey: process.env['AWS_LAMBDA_SECRET_ACCESS_KEY'],
    region: process.env['AWS_LAMBDA_REGION']
  }
};