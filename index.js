const core = require('@actions/core')
const github = require('@actions/github')
const { execSync } = require('child_process')
const artifact = require('@actions/artifact')
const fs = require('fs');
const AWS = require('aws-sdk')
const s3 = new AWS.S3()
const opsworks = new AWS.OpsWorks();

const artifactClient = artifact.create()
const rootDirectory = '.'
const options = {
    continueOnError: false
}

try {
    const wfWebname = core.getInput('wf-webname');
    const awsS3Bucket = core.getInput('aws-s3-bucket');
    const awsAccessKeyId = core.getInput('aws-access-key-id');
    const awsSecretAccessKey = core.getInput('aws-secret-access-key');
    const awsRegion = core.getInput('aws-region');
    const awsOpsworksStackId = core.getInput('aws-opsworks-stack-id');
    const awsOpsworksAppId = core.getInput('aws-opsworks-app-id');
    let branchName = github.context.ref;
    let commitSha = github.context.sha;
    if (branchName.indexOf('refs/heads/') > -1) {
        branchName = branchName.slice('refs/heads/'.length);
    }
    console.log(execSync('composer validate').toString())
    console.log(execSync(`composer install --prefer-dist --no-progress --no-suggest`).toString())
    console.log(execSync(`composer update johnpbloch/wordpress wunderfarm/* --with-dependencies`).toString())
    console.log(execSync(`sudo npm install -g n`).toString())
    console.log(execSync(`sudo n v10.15`).toString())
    console.log(execSync(`npm ci`).toString())
    console.log(execSync(`npm run build`).toString())
    execSync(`mkdir dist`).toString()
    execSync(`cp -R vendor dist`).toString()
    execSync(`cp -R wp dist`).toString()
    execSync(`cp -R wp-content dist`).toString()
    execSync(`cp -R .htaccess dist`).toString()
    execSync(`cp -R index.php dist`).toString()
    execSync(`cp -R wp-config.* dist`).toString()
    execSync(`zip -rq ${wfWebname} ./dist`).toString()
    
    let filename = wfWebname + '.zip'
    artifactClient.uploadArtifact(wfWebname, [filename], rootDirectory, options)

    AWS.config = new AWS.Config();
    AWS.config.accessKeyId = awsAccessKeyId
    AWS.config.secretAccessKey = awsSecretAccessKey
    AWS.config.region = awsRegion ? awsRegion : 'eu-west-1'

    let file = fs.readFileSync(filename)
    let s3params = {
        Bucket: awsS3Bucket,
        Key: wfWebname + '/' + branchName + '/' + filename,
        Body: file
    }
    s3.upload(s3params, function (err, data) {
        if (err) {
            core.setFailed(err.toString());
            throw err
        }
        console.log(`File uploaded successfully. ${data.Location}`);
    })
    
    let opsworksParams = {
        Command: {
            Name: 'deploy'
        },
        StackId: awsOpsworksStackId,
        AppId: awsOpsworksAppId,
        Comment: 'Branch:' + branchName + ' Commit: ' + commitSha
    }
    opsworks.createDeployment(opsworksParams, function (err, data) {
        if (err) {
            core.setFailed(err.toString());
            throw err
        }
        console.log(`App successfully deployed. ${data.DeploymentId}`);
    })
} catch (error) {
    core.setFailed(error.message)
}