var path = require('path');
var async = require('async');
var fs = require('fs');
var AWS = require('aws-sdk'); 
var Utils = require('./s3Utils')

const S3_BUCKET_NAME=''
const S3_ACCESS_KEY=''
const S3_SECRET_KEY='' 
const S3_ENDPOINT=''

const accessKeyId = ''
const secretAccessKey = ''

const keys = Utils.EncryptS3Creds(S3_ACCESS_KEY, S3_SECRET_KEY)

console.log(keys)

Utils.SSLSetup(AWS)

const s3 = new AWS.S3({
    accessKeyId: keys.accessKey,
    secretAccessKey: keys.secretKey,
    endpoint: S3_ENDPOINT
}); 

const bucketName = "testBucket";
const contentType = 'video/mp4'

function uploadMultipart(absoluteFilePath, fileName, uploadCb) {
  s3.createMultipartUpload({ 
    Bucket: bucketName, 
    Key: fileName, 
    ContentType: contentType,
    Metadata: { ContentType: contentType }
  }, (mpErr, multipart) => {
    if(!mpErr){
      console.log("multipart created", multipart.UploadId);
      fs.readFile(absoluteFilePath, (err, fileData) => {

        var partSize = 1024 * 1024 * 5;
        var parts = Math.ceil(fileData.length / partSize);

        async.timesSeries(parts, (partNum, next) => {

          var rangeStart = partNum*partSize;
          var end = Math.min(rangeStart + partSize, fileData.length);

          console.log("uploading ", fileName, " % ", (partNum/parts).toFixed(2));

          partNum++;  
          async.retry((retryCb) => {
            s3.uploadPart({
              Body: fileData.slice(rangeStart, end),
              Bucket: bucketName,
              Key: fileName,
              PartNumber: partNum,
              UploadId: multipart.UploadId
            }, (err, mData) => {
              retryCb(err, mData);
            });
          }, (err, data)  => {
            //console.log(data);
            next(err, {ETag: data.ETag, PartNumber: partNum});
          });

        }, (err, dataPacks) => {
            console.log('about to do multi part', bucketName)
            s3.completeMultipartUpload({
                Bucket: bucketName,
                Key: fileName,
                MultipartUpload: {
                Parts: dataPacks
                },
                UploadId: multipart.UploadId
            }, uploadCb);
        });
      });
    }else{
      uploadCb(mpErr);
    }
  });
}

function uploadFile(absoluteFilePath, uploadCb) {
  var fileName = path.basename(absoluteFilePath);
  var stats = fs.statSync(absoluteFilePath)
  var fileSizeInBytes = stats["size"]
  
  console.log('file size', stats['size'])

  if(fileSizeInBytes < (1024*1024*5)) {
    console.log('under 5MB about to push')
    async.retry((retryCb) => {
      fs.readFile(absoluteFilePath, (err, fileData) => {
        s3.putObject({
          Bucket: bucketName, 
          Key: fileName, 
          Body: fileData
        }, retryCb);        
      });
    }, uploadCb);
  }else{
    uploadMultipart(absoluteFilePath, fileName, uploadCb)
  }
}

uploadFile('/Users/drollin2/Desktop/Sample.mp4', function(err, data){
    if (err) {
        console.log(err)
        return
    }
    console.log('upload success!')
})
