# ChifanHero Parse Server

Chifanher Server using the [parse-server](https://github.com/ParsePlatform/parse-server) module on Express.

Read the full Parse Server guide here: https://github.com/ParsePlatform/parse-server/wiki/Parse-Server-Guide

# Production
## AWS environment setting
1. t2.small or higher level machine is required.
2. `~/.ebextension/app.config` is necessary and should be added to git. (In order to resolve dependency issues)

## AWS Elastic Beanstalk Command Line Interface (EB CLI) use guide
### Install the EB CLI in a Virtual Environment
You can avoid requirement version conflicts with other pip packages by installing the EB CLI in a virtual environment.
To install the EB CLI in a virtual environment
1. Install virtualenv with pip.
```
$ pip install --user virtualenv
```
2. Create a virtual environment.
```
$ virtualenv ~/eb-ve
```
3. Activate the virtual environment.
```
$ source ~/eb-ve/bin/activate
```
4. Install the EB CLI.
```
(eb-ve)~$ pip install --upgrade awsebcli
```
5. Verify that the EB CLI is installed correctly.
```
$ eb --version
EB CLI 3.7.8 (Python 3.4.1)
```
You can use the deactivate command to exit the virtual environment. Whenever you start a new session, run the activation command again.

### Use EB CLI to deploy and manage code changes
1. Create a directory for your project and change your working directory into that directory.
2. Run `eb init` to log in and select the application you created through the quick launch link.
3. Run `eb labs download`. This  will download the code that is running on the AWS Elastic Beanstalk environment to your local folder.
4. Make necessary changes to the code.
5. Run `eb deploy` to deploy the code to AWS Elastic Beanstalk.

## Work with github
github link:
```
https://github.com/ChifanHero/ChifanHeroParseServer
```
`master`branch is for production, `staging`branch is for staging

## API spec
### Endpoint
http://chifanhero.us-east-1.elasticbeanstalk.com/parse

### Headers
`X-Parse-Application-Id: Z6ND8ho1yR4aY3NSq1zNNU0kPc0GDOD1UZJ5rgxM`

`X-Parse-Master-Key: KheL2NaRmyVKr11LZ7yC0uvMHxNv8RpX389oUf8F`

# Dev
1. Make sure you have at least Node 4.3. `node --version`
2. Change directory to this repo
3. `npm install`
4. Install mongo locally using http://docs.mongodb.org/master/tutorial/install-mongodb-on-os-x/
5. Run the server with:`npm start`
6. Endpoint will be `localhost:1337/parse`
