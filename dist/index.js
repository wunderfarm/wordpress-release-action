module.exports =
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	__webpack_require__.ab = __dirname + "/";
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(546);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
/******/ ({

/***/ 73:
/***/ (function() {

eval("require")("@actions/artifact");


/***/ }),

/***/ 129:
/***/ (function(module) {

module.exports = require("child_process");

/***/ }),

/***/ 168:
/***/ (function() {

eval("require")("@actions/core");


/***/ }),

/***/ 526:
/***/ (function() {

eval("require")("aws-sdk");


/***/ }),

/***/ 546:
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

const core = __webpack_require__(168)
const { execSync } = __webpack_require__(129)
const artifact = __webpack_require__(73)
const fs = __webpack_require__(747);
const AWS = __webpack_require__(526)
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
    execSync(`zip -r ${wfWebname} ./dist`).toString()
    
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

/***/ }),

/***/ 747:
/***/ (function(module) {

module.exports = require("fs");

/***/ })

/******/ });