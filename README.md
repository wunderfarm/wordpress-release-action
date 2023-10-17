# WF WordPress Release Action

This action builds WF WordPress projects, uploads the zipped artifacts to an AWS S3 Bucket and triggers the app creation and deployment on the desired AWS OpsWorks Stack.

## Inputs

### `wf-webname`
**Required** The unique name of the web. Default `"example2020"`.

### `wf-client`
**Required** The unique name of the client. (e.g. `"example2020"`)`.

### `app-name`
Optional OpsWorks app-name of the web. (e.g. `"example_production"`)`.

### `aws-s3-bucket`
**Required** The AWS S3 Bucket Name.

### `database-host`
**Required** The database host to use.

### `database-slavehost`
The database slavehost to use.

### `database-name`
**Required** The database name to use (e.g. example2020_production).

### `database-user`
**Required** The database user to use (e.g. example).

### `database-password`
**Required** The database password to use.

### `deployment-environment`
The deployment environment to use (e.g. staging). Default `"production"`.

### `deployment-domains`:
**Required** The deployment domain to use (e.g. `"www.example.com,test.example.com"`)

### `php-timeout`
Optional PHP timeout value

### `php-version`
Optional PHP Version

### `memory-limit`
Optional PHP memory limit

### `upload-max-filesize`
Optional maximum PHP upload filesize

### `force-https`
Optional HTTPS redirect

### `redirect-html`
Optional .html redirect

### `app-wpml-site-key`
Optional WPML site key

### `wf-auth-user`
Optional HTTP auth user

### `wf-auth-password`
Optional HTTP auth password

### `app-aws-access-key-id`
Optional App specific AWS Access Key ID (set up as an OpsWorks environment variable).

### `app-aws-secret-access-key`
Optional App specific AWS Secred Access Key (set up as an OpsWorks environment variable).

### `aws-access-key-id`
**Required** The AWS S3 Access Key ID for the deployment process.

### `aws-secret-access-key`
**Required** The AWS S3 Secred Access Key for the deployment process.

### `aws-region`
The AWS S3 Region. Default `"eu-west-1"`

### `aws-opsworks-stack-id`
**Required** The AWS Opsworks Stack ID.

### `aws-rds-arn`
**Required** The AWS RDS instance ARN. 

### `remote-api-uri`
Optional remote api uri

### `remote-api-user`
Optional remote api user

### `remote-api-password`
Optional remote api password

## Example usage
```yaml
uses: wunderfarm/wordpress-release-action@v4
with:
  wf-webname: 'example2020'
  wf-client: 'example2020'
  app-name: 'example_production'
  aws-s3-bucket: ${{ secrets.AWS_S3_BUCKET }}
  database-host: ${{ secrets.APP_DB_HOST }}
  database-slavehost: ${{ secrets.APP_DB_SLAVEHOST }}
  database-name: 'example2020_production'
  database-user: ${{ secrets.APP_DB_USER }}
  database-password: ${{ secrets.APP_DB_PASSWORD }}
  deployment-environment: 'staging'
  deployment-domains: 'www.example.com,test.example.com'
  php-timeout: '60'
  php-version: '8.0'
  memory-limit: '256M'
  upload-max-filesize: '64M'
  force-https: 'true'
  app-wpml-site-key: ${{ secrets.APP_WPML_SITE_KEY }}
  secondary-domains:  'www.example2.com,test.example2.com'
  wf-auth-user: ${{ secrets.WF_AUTHUSER }}
  wf-auth-password: ${{ secrets.WF_AUTHPASSWORD }}
  app-aws-access-key-id: ${{ secrets.APP_AWS_ACCESS_KEY_ID }}
  app-aws-secret-access-key: ${{ secrets.APP_AWS_SECRET_ACCESS_KEY }}
  aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
  aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  aws-region: 'eu-west-1'
  aws-opsworks-stack-id: ${{ secrets.AWS_STACK_ID }}
  aws-rds-arn: ${{ secrets.AWS_RDS_ARN }}
  remote-api-uri: ${{ secrets.REMOTE_API_URI }}
  remote-api-user: ${{ secrets.REMOTE_API_USER }}
  remote-api-password: ${{ secrets.REMOTE_API_PASSWORD }}
```

## Package for distribution

GitHub Actions will run the entry point from the action.yml. Packaging assembles the code into one file that can be checked in to Git, enabling fast and reliable execution and preventing the need to check in node_modules.

Actions are run from GitHub repos.  Packaging the action will create a packaged action in the dist folder.

Run package

```bash
npm run package
```

Since the packaged index.js is run from the dist folder.

```bash
git add dist
```

## Create a release branch

Users shouldn't consume the action from master since that would be latest code and actions can break compatibility between major versions.

Checkin to the v1 release branch

```bash
$ git checkout -b v1
$ git commit -a -m "v1 release"
```

```bash
$ git push origin v1
```

Your action is now published!

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)
