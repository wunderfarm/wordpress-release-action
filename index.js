const core = require('@actions/core')
const github = require('@actions/github')
const { execSync } = require('child_process')
const fs = require('fs')
const AWS = require('aws-sdk')

try {
    const wfWebname = core.getInput('wf-webname')
    const awsS3Bucket = core.getInput('aws-s3-bucket')
    const awsAccessKeyId = core.getInput('aws-access-key-id')
    const awsSecretAccessKey = core.getInput('aws-secret-access-key')
    const awsRegion = core.getInput('aws-region')
    const awsOpsworksStackId = core.getInput('aws-opsworks-stack-id')
    let awsOpsworksAppId;
    AWS.config = new AWS.Config()
    AWS.config.accessKeyId = awsAccessKeyId
    AWS.config.secretAccessKey = awsSecretAccessKey
    AWS.config.region = awsRegion ? awsRegion : 'eu-west-1'
    const s3 = new AWS.S3()
    const opsworks = new AWS.OpsWorks({apiVersion: '2013-02-18'})

    let githubRef = github.context.ref
    let commitSha = github.context.sha
    let eventPayload = github.context.payload
    let message = ''
    if (typeof(eventPayload.release) !== 'undefined') {
        message = 'Release: ' + eventPayload.release.name + ' - "' + eventPayload.release.body + '" '
    } else if (typeof(eventPayload.commits) !== 'undefined') {
        message = 'Commit: "' + eventPayload.commits[0].message + '" '
    }
    message = message + 'Ref: ' + githubRef + ' (' + commitSha.substring(0,7) + ')'
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
    execSync(`cp -R robots.txt dist 2>/dev/null || :`).toString()
    execSync(`zip -rq ${wfWebname} ./dist`).toString()
    
    let filename = wfWebname + '.zip'
    let file = fs.readFileSync(filename)

    opsworks.describeApps({StackId: awsOpsworksStackId}, function(err, data) {
        if (err) {
            core.setFailed(err.toString())
            throw err
        } else {
            data.Apps.some(function(app) {
                if (app.Shortname === wfWebname) {
                    return awsOpsworksAppId = app.AppId
                }
            })
        }
    })

    if (!awsOpsworksAppId) {
        let appParams =  {
            Name: wfWebname,
            Shortname: wfWebname,
            StackId: awsOpsworksStackId,
            Type: 'other',
            Domains: []
        }

        opsworks.createApp(appParams, function (err, data) {
            if (err) {
                core.setFailed(err.toString())
                throw err
            }

            console.log(`App successfully created. ${data.AppId}`)

            awsOpsworksAppId = data.AppId
        })
    }

    let s3params = {
        Bucket: awsS3Bucket,
        Tagging: 'bill='+wfWebname+'&client='+wfWebname+'',
        Key: awsOpsworksStackId + '/' + wfWebname + '_' + awsOpsworksAppId + '/' + filename,
        Body: file
    }

    let deploymentParams = {
        Command: {
            Name: 'deploy'
        },
        StackId: awsOpsworksStackId,
        AppId: awsOpsworksAppId,
        Comment: message
    }

    s3.upload(s3params, function (err, data) {
        if (err) {
            core.setFailed(err.toString())
            throw err
        }
        console.log(`File uploaded successfully. ${data.Location}`)
        
        if (awsOpsworksAppId) {
            opsworks.createDeployment(deploymentParams, function (err, data) {
                if (err) {
                    core.setFailed(err.toString())
                    throw err
                }
                console.log(`App successfully deployed. ${data.DeploymentId}`)
            })
        } else {
            core.setFailed(`Undefined OpsWorks App ID.`)
        }
    })

} catch (error) {
    core.setFailed(error.message)
}