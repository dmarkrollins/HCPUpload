const path = require('path')
const https = require('https')
const fs = require('fs')
const md5 = require('md5')

class S3Util {
    static SSLSetup(aws) {
        // const certPath = './s3.pem'
        const certPath = './HCPDemo8rootCertificate.pem'
        // const resolvedPath = path.resolve(__dirname, '../')
        // const absCertPath = resolvedPath + certPath
        
        console.log('cert exists', fs.existsSync(certPath))
        
        const customAgent = new https.Agent({
            ca: fs.readFileSync(certPath),
            rejectUnauthorized: false,
        })

        aws.config.update({
            httpOptions: { agent: customAgent, maxSockets: 25 },
        })
    }

    static EncryptS3Creds(userid, password) {
        const b64Uname = new Buffer(userid).toString('base64')
        const md5Pword = md5(password)

        return {
            accessKey: b64Uname,
            secretKey: md5Pword,
        }
    }
}

module.exports = S3Util