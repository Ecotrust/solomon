#travis ci tests
![travis-ci Tests](https://api.travis-ci.org/Ecotrust/solomon.png)


# Server Install Requirements
```bash
Download and install virtualbox
Download and install vagrant (vagrantup.com)
Pull down the source code from Github
cd into the source directory with your terminal
```

# Server Setup
```bash
vagrant plugin install vagrant-omnibus # for chef
vagrant up
easy_install pip #(if you do not already have)
pip install fabric #(if you do not already have)
fab vagrant bootstrap
fab vagrant createsuperuser
fab vagrant loaddata
fab vagrant runserver
```


## Provision a fresh Server with Chef and Fabric
Create a node file with the name scripts/cookbook/node_staging.json from the template in scripts/cookbook/node_staging.json.template.  Set the postgresql password and add your ssh public key to scripts/node_staging.json.  Tested with Ubuntu 12.04 (precise pangolin).

These commands install all the prerequisites for running marine planner, including postgresql/postgis, python and all the required modules in a virtual environment as well as gunicorn and nginx to serve the static files.

```bash
fab staging:root@hostname prepare
fab staging:username@hostname deploy
```

###Sample config file
```javascript
{
    "user": "www-data",
    "servername": "staging.example.com",
    "dbname": "marine-planner",
    "staticfiles": "/usr/local/apps/marine-planner/mediaroot",
    "mediafiles": "/usr/local/apps/marine-planner/mediaroot",
    "users": [
        {
            "name": "jsmith",
            "key": "ssh-rsa AAAAB3sdkfjhsdkhjfdjkhfffdj.....fhfhfjdjdfhQ== jsmith@machine.local"
        }
    ],
    "postgresql": {
        "password": {
            "postgres": "some random password here"
        }
    },
    "run_list": [
        "marine-planner::default"
    ]
}
```

After the prepare command runs you will no longer be able to login as root with a password.  The prepare command creates one or more users with sudo access based on the list of users specified in the json file.


# Install Requirements
From the geosurvey project directory
```bash
sudo npm install -g yo grunt-cli bower
npm install && bower install --dev
npm install generator-angular generator-karma
```

# Backing up and restoring databases

```bash
pg_dump -U vagrant --clean --no-acl -Fc geosurvey> geosurvey.dump
```

```bash
pg_restore --verbose --clean --no-acl --no-owner -U vagrant -d geosurvey geosurvey.dump
```
# Launching Server
Run all of these in seperate tabs/windows

The app will be served on port 9000.  A browser window will open automatically.
```bash
grunt server
```
# Running Tests

With the server running in port 9000, run the following commands for continuous test running.

Unit tests will run whenever you save a file:

```bash
grunt c-unit
```

End to end tests will run whenever you save a file:


```bash
grunt c-e2e
```


# Using the angular app generator

Add a new route, view, controller, unit test:
```bash
yo angular:route myRoute
```

Because the app is being served out of the django app we need to specify a path for the controls and templates.  Here is an axample route:

```javascript
.when('/RespondantDetail', {
  templateUrl: '/static/survey/views/RespondantDetail.html',
  controller: 'RespondantDetailCtrl'
})
```

#Heroku
##requirements
1. Install the heroku toolbelt.
2. Install git > 1.8

##create the heroku app if it doesn't exist
```bash
heroku create appname
```

##login to heroku
```bash
heroku login
```

##set environment vars and install addons.
```bash
heroku config:add DJANGO_SECRET_KEY=SECRET!
heroku addons:add sendgrid
heroku addons:add redistogo
heroku addons:add pgbackups

```

Or run the script from scripts/heroku-env.sh, which is available on google drive for each deployment.

#Deploy

First push the server directory as a subtree from the master branch to heroku.  Then you can use a subtree split to push an alternate branch.

##push the app from the project directory
```bash
git subtree push --prefix server/ heroku master
```

##push an alternate branch from the project directory
```bash
git push heroku `git subtree split --prefix server testbranch`:master
```

##django install
```bash
heroku run python manage.py syncdb --settings=config.environments.heroku
heroku run python manage.py migrate --settings=config.environments.heroku
```

##load some data
```bash
heroku run python manage.py loaddata apps/survey/fixtures/surveys.json --settings=config.environments.heroku
heroku run python manage.py loaddata apps/places/fixtures/marco.json.gz --settings=config.environments.heroku
```

##open the app
```bash
heroku open
```

#manage the heroku database

##dump a backup
This will dump a compressed binary backup of the current database to a file that can be retrieved as "latest.dump".
```bash
heroku pgbackups:capture --expire
curl -o `date +%Y%m%d%H%M`.dump `heroku pgbackups:url`
```

##restore a backup
To restore to the vagrant instance, log in to the vm and execute the following
```bash
pg_restore --verbose --clean --no-acl --no-owner -d geosurvey 201309170950.dump
```

Transfer the dump file to a web accessible space.  To find the database url, use the pg:info command.
```bash
heroku pg:info
heroku pgbackups:restore DATABASE_URL 'http://www.example.org/latest.dump'
```

