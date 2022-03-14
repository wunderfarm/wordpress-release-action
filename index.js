const core = require('@actions/core')
const github = require('@actions/github')
const {
    execSync
} = require('child_process')
const fs = require('fs')
const AWS = require('aws-sdk')
const wfWebname = core.getInput('wf-webname')
const wfClient = core.getInput('wf-client') ? core.getInput('wf-client') : wfWebname
const appName = core.getInput('app-name') ? core.getInput('app-name') : core.getInput('wf-webname')
const deploymentDomains = core.getInput('deployment-domains')
const deploymentEnvironment = core.getInput('deployment-environment') ? core.getInput('deployment-environment') : 'production'
const databaseHost = core.getInput('database-host')
const databaseSlavehost = core.getInput('database-slavehost')
const databaseName = core.getInput('database-name')
const databaseUser = core.getInput('database-user')
const databasePassword = core.getInput('database-password')
const phpTimeout = core.getInput('php-timeout')
const phpVersion = core.getInput('php-version')
const memoryLimit = core.getInput('memory-limit')
const uploadMaxFilesize = core.getInput('upload-max-filesize')
const forceHttps = core.getInput('force-https')
const appWpmlSiteKey = core.getInput('app-wpml-site-key')
const wfAuthUser = core.getInput('wf-auth-user')
const wfAuthPassword = core.getInput('wf-auth-password')
const appAwsAccessKeyId = core.getInput('app-aws-access-key-id')
const appAwsSecretAccessKey = core.getInput('app-aws-secret-access-key')
const awsS3Bucket = core.getInput('aws-s3-bucket')
const awsAccessKeyId = core.getInput('aws-access-key-id')
const awsSecretAccessKey = core.getInput('aws-secret-access-key')
const awsRegion = core.getInput('aws-region')
const awsOpsworksStackId = core.getInput('aws-opsworks-stack-id')
const awsRdsDbArn = core.getInput('aws-rds-arn')

AWS.config = new AWS.Config()
AWS.config.accessKeyId = awsAccessKeyId
AWS.config.secretAccessKey = awsSecretAccessKey
AWS.config.region = awsRegion ? awsRegion : 'eu-west-1'
const s3 = new AWS.S3()
const opsworks = new AWS.OpsWorks({
    apiVersion: '2013-02-18'
})

async function getAwsOpsworksApp() {
    return new Promise(function (resolve) {
        opsworks.describeApps({
            StackId: awsOpsworksStackId
        }, function (err, data) {
            if (err) {
                core.setFailed(err.toString())
                throw err
            } else {
                let app = data.Apps.find(app => app.Shortname === appName)
                resolve(app)
            }
        })
    })
}

function deployApp(awsOpsworksAppId) {
    if (awsOpsworksAppId) {
        let githubRef = github.context.ref
        let commitSha = github.context.sha
        let eventPayload = github.context.payload
        let message = ''
        if (typeof (eventPayload.release) !== 'undefined') {
            message = 'Release: ' + eventPayload.release.name + ' - "' + eventPayload.release.body + '" '
        } else if (typeof (eventPayload.commits) !== 'undefined') {
            message = 'Commit: "' + eventPayload.commits[0].message + '" '
        }
        message = message + 'Ref: ' + githubRef + ' (' + commitSha.substring(0, 7) + ')'
        console.log(execSync('composer validate').toString())
        console.log(execSync(`composer install --prefer-dist --no-progress --no-suggest`).toString())
        console.log(execSync(`composer update johnpbloch/wordpress wunderfarm/* --with-dependencies`).toString())
        console.log(execSync(`sudo npm install -g n`).toString())
        if (fs.existsSync('./.nvmrc')) {
            console.log(execSync(`sudo n auto`).toString())
        } else {
            console.log(execSync(`sudo n v10.15`).toString())
        }
        console.log(execSync(`npm ci`).toString())
        console.log(execSync(`npm run build`).toString())
        execSync(`mkdir dist`).toString()
        execSync(`cp -R vendor dist`).toString()
        execSync(`cp -R wp dist`).toString()
        execSync(`cp -R wp-content dist`).toString()
        execSync(`cp -R index.php dist`).toString()
        execSync(`cp -R wp-config.* dist`).toString()
        execSync(`cp -R robots.txt dist 2>/dev/null || :`).toString()
        execSync(`cp -R packages dist 2>/dev/null || :`).toString()
        execSync(`zip -rq ${appName} ./dist`).toString()

        let filename = appName + '.zip'
        let file = fs.readFileSync(filename)

        let s3params = {
            Bucket: awsS3Bucket,
            Tagging: 'client=' + wfClient + '',
            Key: awsOpsworksStackId + '/' + appName + '_' + awsOpsworksAppId + '/' + filename,
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
            console.log(`File uploaded successfully to S3. ${data.Location}`)

            opsworks.createDeployment(deploymentParams, function (err, data) {
                if (err) {
                    core.setFailed(err.toString())
                    throw err
                }
                console.log(`OpsWorks App successfully deployed. ${data.DeploymentId}`)
            })
        })
    }
}

async function runAction() {
    var app
    try {

        let appDomains = deploymentDomains.split(',')

        let appEnvironmentVars = [{
                Key: 'WF_WEBNAME',
                Value: wfWebname,
                Secure: false
            },{
                Key: 'WF_ENV',
                Value: deploymentEnvironment,
                Secure: false
            },
            {
                Key: 'DB_HOST',
                Value: databaseHost,
                Secure: false
            },
            {
                Key: 'DB_USER',
                Value: databaseUser,
                Secure: false
            },
            {
                Key: 'DB_PASSWORD',
                Value: databasePassword,
                Secure: true
            }
        ]

        if (databaseSlavehost) {
            appEnvironmentVars.push({
                Key: 'DB_SLAVEHOST',
                Value: databaseSlavehost,
                Secure: false
            })
        }

        if (phpTimeout) {
            appEnvironmentVars.push({
                Key: 'php_timeout',
                Value: phpTimeout,
                Secure: false
            })
        }

        if (phpVersion) {
            appEnvironmentVars.push({
                Key: 'php_version',
                Value: phpVersion,
                Secure: false
            })
        }

        if (memoryLimit) {
            appEnvironmentVars.push({
                Key: 'memory_limit',
                Value: memoryLimit,
                Secure: false
            })
        }

        if (uploadMaxFilesize) {
            appEnvironmentVars.push({
                Key: 'upload_max_filesize',
                Value: uploadMaxFilesize,
                Secure: false
            })
        }

        if (forceHttps) {
            appEnvironmentVars.push({
                Key: 'FORCE_HTTPS',
                Value: forceHttps,
                Secure: false
            })
        }

        if (wfAuthUser && wfAuthPassword) {
            appEnvironmentVars.push({
                Key: 'WF_AUTHUSER',
                Value: wfAuthUser,
                Secure: false
            })
            appEnvironmentVars.push({
                Key: 'WF_AUTHPASSWORD',
                Value: wfAuthPassword,
                Secure: true
            })
        }
        
        if (appAwsAccessKeyId && appAwsSecretAccessKey) {
            appEnvironmentVars.push({
                Key: 'APP_AWS_ACCESS_KEY_ID',
                Value: appAwsAccessKeyId,
                Secure: false
            })
            appEnvironmentVars.push({
                Key: 'APP_AWS_SECRET_ACCESS_KEY',
                Value: appAwsSecretAccessKey,
                Secure: true
            })
        }

        if (appWpmlSiteKey) {
            appEnvironmentVars.push({
                Key: 'APP_WPML_SITE_KEY',
                Value: appWpmlSiteKey,
                Secure: true
            })
        }

        app = await getAwsOpsworksApp()

        if (typeof (app) !== 'undefined') {

            console.log(`OpsWorks App already setup. ${app.AppId}`)

            let appParams = {
                AppId: app.AppId,
                Name: appName,
                Type: 'other',
                AppSource: {
                    Type: ' other'
                },
                DataSources: [{
                    Arn: awsRdsDbArn,
                    DatabaseName: databaseName,
                    Type: 'RdsDbInstance'
                }],
                Environment: appEnvironmentVars,
                Domains: appDomains
            }

            opsworks.updateApp(appParams, function (err) {
                if (err) {
                    core.setFailed(err.toString())
                    throw err
                }
                console.log(`OpsWorks App successfully updated. ${app.AppId}`)
                deployApp(app.AppId)
            })

        } else {

            let appParams = {
                Name: appName,
                Shortname: appName,
                StackId: awsOpsworksStackId,
                Type: 'other',
                AppSource: {
                    Type: ' other'
                },
                DataSources: [{
                    Arn: awsRdsDbArn,
                    DatabaseName: databaseName,
                    Type: 'RdsDbInstance'
                }],
                Environment: appEnvironmentVars,
                Domains: appDomains
            }

            opsworks.createApp(appParams, function (err, data) {
                if (err) {
                    core.setFailed(err.toString())
                    throw err
                }
                console.log(`New OpsWorks App successfully created. ${data.AppId}`)
                deployApp(data.AppId)
            })
        }

    } catch (e) {
        core.setFailed(e.message)
    }
}

try {
    runAction()
} catch (error) {
    core.setFailed(error.message)
}
