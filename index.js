const core = require('@actions/core')
const { execSync } = require('child_process')
const artifact = require('@actions/artifact')
const fs = require('fs');
const AWS = require('aws-sdk')
const s3 = new AWS.S3()
const artifactClient = artifact.create()
const rootDirectory = '.'
const options = {
    continueOnError: false
}

try {
    const wfWebname = core.getInput('wf-webname')
    const awsS3Bucket = core.getInput('aws-s3-bucket');
    const awsAccessKeyId = core.getInput('aws-access-key-id');
    const awsSecretAccessKey = core.getInput('aws-secret-access-key');
    const awsRegion = core.getInput('aws-region');

    console.log(execSync(`composer validate`, {maxBuffer: 50 * 1024 * 1024}).toString())
    console.log(execSync(`composer install --prefer-dist --no-progress --no-suggest`, {maxBuffer: 50 * 1024 * 1024}).toString())
    console.log(execSync(`composer update johnpbloch/wordpress wunderfarm/* --with-dependencies`, {maxBuffer: 50 * 1024 * 1024}).toString())
    console.log(execSync(`sudo npm install -g n`, {maxBuffer: 50 * 1024 * 1024}).toString())
    console.log(execSync(`sudo n v10.15`, {maxBuffer: 50 * 1024 * 1024}).toString())
    console.log(execSync(`npm ci`, {maxBuffer: 50 * 1024 * 1024}).toString())
    console.log(execSync(`npm run build`, {maxBuffer: 50 * 1024 * 1024}).toString())
    execSync(`mkdir dist`, {maxBuffer: 50 * 1024 * 1024}).toString()
    execSync(`cp -R vendor dist`, {maxBuffer: 50 * 1024 * 1024}).toString()
    execSync(`cp -R wp dist`, {maxBuffer: 50 * 1024 * 1024}).toString()
    execSync(`cp -R wp-content dist`, {maxBuffer: 50 * 1024 * 1024}).toString()
    execSync(`cp -R .htaccess dist`, {maxBuffer: 50 * 1024 * 1024}).toString()
    execSync(`cp -R index.php dist`, {maxBuffer: 50 * 1024 * 1024}).toString()
    execSync(`cp -R wp-config.* dist`, {maxBuffer: 50 * 1024 * 1024}).toString()
    execSync(`zip -rq ${wfWebname} ./dist`, {maxBuffer: 50 * 1024 * 1024}).toString()
    
    let filename = wfWebname + '.zip'
    artifactClient.uploadArtifact(wfWebname, [filename], rootDirectory, options)

    AWS.config = new AWS.Config();
    AWS.config.accessKeyId = awsAccessKeyId
    AWS.config.secretAccessKey = awsSecretAccessKey
    AWS.config.region = awsRegion ? awsRegion : 'eu-west-1'

    let file = fs.readFileSync(filename)
    let params = {
        Bucket: awsS3Bucket,
        Key: wfWebname + '/' + filename,
        Body: file
    }
    s3.upload(params, function (err, data) {
        if (err) {
            core.setFailed(err.toString());
            throw err
        }
        console.log(`File uploaded successfully. ${data.Location}`);
    })
} catch (error) {
    core.setFailed(error.message)
}