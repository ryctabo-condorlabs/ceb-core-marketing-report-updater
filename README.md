# marketing-report

Generate the Marketing Report based on Events generated from the source of data.

This is a subscriber from the following Areas (projects): 

 - [COMPLIANCE (compliance-changes-queue)](https://github.com/cebroker/compliance-changes-queue)
 - [USER (user-changes-queue)](https://github.com/cebroker/user-changes-queue)
 - [LICENSE (license-changes-queue)](https://github.com/cebroker/daemon-checker)
    
![Project](https://storage.cebroker.com/CEBroker/657f0573-744a-4a53-a499-4e14371e6d5c)   


The generate worker processes the Event Types:

 - LICENSE

    For every event type starting with `LICENSE`, it filters the cycles whose renewal end date is >= (sysdate - 4years)
    and them validates what operation it should do an UPDATE or an INSERT into the mysql database.

    - When it's a new license:
        - and the Date of this event is lower than the las processed compliance event, it reschedules the compliance event. 
        - and the Date of this event is lower than the las processed user event, it reschedules the user event.

    - It stores in redis:
        - LICENSE:[pk_license] => Hash with information of the last License event (`eventDate` and the `eventObject`).
        - LICENSE:[pk_license]:LOCK => Int used for the semaphore algorith; it's incremented when the process of an event started and decremented when finished.

 - USER

    For every event type starting with `USER`, it updates user information based on the owner id's it has.
    - It stores in redis:
        - USER:[userID] => Hash with information of the last User event (`eventDate` and the `eventObject`).
        - USER:[userID]:LOCK => Int used for the semaphore algorith; it's incremented when the process of an event started and decremented when finished.
        - OWNER:[ownerID]:USER => Int with the userID that will be used later when processing a LICENSE event to determinate if the last user event needs to be rescheduled.

 - COMPLIANCE.SCHEDULE

    Turn the outdated flag ON for each cycle found for the given ownerID.
    - It stores in redis:
        - OWNER:[ownerID] => Hash with information of the last User event (`eventDate` and the `eventObject`).
        - OWNER:[ownerID]:LOCK => Int used for the semaphore algorith; it's incremented when the process of an event started and decremented when finished.

 - COMPLIANCE.CALCULATE

    Updates compliance information for every cycle for the given ownerID and Turn the outdated flag OFF.
    - It stores in redis:
        - OWNER:[ownerID] => Hash with information of the last User event (`eventDate` and the `eventObject`).
        - OWNER:[ownerID]:LOCK => Int used for the semaphore algorith; it's incremented when the process of an event started and decremented when finished.

# Tech stack

## Development

-   mysql: Mysql database driver.
-   aws sqs: Amazon Queue Service.

## Infrastructue Details

-   Nodejs version v6.9.4.
-   Server CentOS Linux release 7.2.1511 (Core).
-   Git version 1.8.3.1.
-   One queue on AWS SQS.

# Team in charge

CEB-CORE development team

# Installing and Running this app

## Environment variables

-   NODE_ENV: Should be in lowercase and the possible values are: development/production/test/demo.
-   SENDGRID_API_KEY: Sendgrid key, this is generated from your sendgrid account on https://app.sendgrid.com/settings/api_keys

## Setup in Development Env

1. Install docker: https://docs.docker.com/engine/installation/
2. Clone repo: `git clone https://github.com/cebroker/marketing-report.git`
3. Run services from the root folder:

`cd marketing-report`

`docker-compose up --build -d`


## IT Requirements to Deploy this project

1 AWS Configuration with the region **us-east-1**

1.1   `AWS SQS` with the following queue names:

    -   marketing-report

retrieve the **QUEUE URL** of each queue for example:

    -   "marketing-report": "https://sqs.us-west-2.amazonaws.com/123/marketing-report"

1.2   `IAM user` with a custom role policy for only those 2 queues and retrieve the credentials info:

    -   accessKeyId
    -   secretAccessKey
    -   region
    
    **Note:** the json below is an example of the custom policy generated for test site enviroment:
    
	{
		"Version": "2012-10-17",
		"Statement": [
			{
				"Sid": "Stmt1471968019000",
				"Effect": "Allow",
				"Action": [
					"sqs:ChangeMessageVisibility",
					"sqs:ChangeMessageVisibilityBatch",
					"sqs:DeleteMessage",
					"sqs:DeleteMessageBatch",
					"sqs:GetQueueAttributes",
					"sqs:GetQueueUrl",
					"sqs:PurgeQueue",
					"sqs:ReceiveMessage",
					"sqs:SendMessage",
					"sqs:SendMessageBatch",
					"sqs:SetQueueAttributes"
				],
				"Resource": [
					"arn:aws:sqs:us-east-1:123:marketing-report"
				]
			}
		]
	}
   
3 Server CENTOS 7

The installation of the nodejs, git and other dependecy will be installed with the bootstrap.sh script later, so do not work on that configuration at this point, just keep in mind this server info:

    -   IP of the server
    -   User
    -   Password
    
4 After you have all of that information, please get to the dev guy involved to set it on the application enviroment configuration file you are going to release. You can check the configuration files per enviromnet for each worker and server in these directorys:

-  [generate/config](https://github.com/cebroker/marketing-report/tree/master/generate/config)
-  [clean/config](https://github.com/cebroker/marketing-report/tree/master/clean/config)

## Deployment of this project (Test/Production)

To Deploy this project to a CENTOS server we are going to follow these steps:

1   Create the user

    adduser zcebjobs
    passwd zcebjobs

-   Type the command `visudo`, and it will open you a file, on the section `Allow root to run any commands anywhere`  add this line user:
    
    `zcebjobs    ALL=(ALL)       ALL`
    
-   Include the user root at the group called zcebjobs

    `usermod -G zcebjobs root`

2   Set up the variables on the shell script [bootstrap.sh](https://github.com/cebroker/marketing-report/blob/master/bootstrap.sh)  that will be executed

-   Set the script variables:

    -   SERVER_USER: The created user that you will use to configure the server (zcebjobs).
    -   GITHUB_REPO: The project repo url with this format `https://[GITHUBUSER]:[PASS]@github.com/cebroker/marketing-report.git`.

-   Set the enviroment variables:

    -   NODE_ENV: Should be in lowercase and the possible values are: development/production/test/demo.
    -   SENDGRID_API_KEY: Sendgrid key, this is generated from your sendgrid account on https://app.sendgrid.com/settings/api_keys

3   Run the bootstrap script:          

-    Login as the user `zcebjobs` and Create the file `deploy.sh` and copy the content of the file `bootstrap.sh`

-   Give permissions to the file to run as shell

    `chmod +x deploy.sh`

-   Run the script    

    `sudo sh deploy.sh`

**Note:** After the process finishes please make sure that the server logs on pm2 doesn't appear a message like `server-0 (err): { [Error: EACCES: permission denied, open 'logs/ocr-api-responses-09-14-2016-d6de08f6a0.log']` run this command as root to solve it: `sudo chown -R zcebjobs:root ~/.npm`          

## How to Release changes

- Login in to the centos server as `zcebjobs`

- Go to the project directory
    
      cd /var/www/ceb-core-marketing-report

- Pull the recent master changes from the repo `This depends on the enviroment your are deploying (dev-branch, integration(test-site) or master(production)`

      git checkout master
      git pull

- Download the node dependecies

      cd generate
      npm install
      cd ..

      cd clean
      npm install
      cd ..      

- Start and save the pm2 processes

      pm2 stop all
      pm2 start pm2.process.yml    
      pm2 save
