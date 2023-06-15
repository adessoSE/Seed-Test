# Seed-Test

Behaviour-driven development (BDD) extends the Test-Driven Development (TDD) approach by the ‘desired behaviour’ of a software. It is designed to ensure a collaboration between business analysts and developers with explicitly written down scenarios.

* Check out the [Tutorial (english)](https://github.com/adessoAG/Seed-Test/wiki/Tutorial_eng) / [Tutorial (german)](https://github.com/adessoAG/Seed-Test/wiki/Tutorial_deu)

## What is Seed-Test?

Seed-Test is a website user interface testing tool, which uses approaches of behaviour-driven development and the notation of Gherkin to enable developers and business users to execute automated tests for their website. It can be tested on the official [website](https://seed-test-frontend.herokuapp.com/).

We are greateful for any testing and feedback, so please help us by filling out this [feedback form](https://seed-test-frontend.herokuapp.com/feedback)

<div style="text-align:center"><a href="https://gifyu.com/image/SnEf3"><img src="https://s12.gifyu.com/images/ezgif.com-video-to-gif8134348e0cec5a97.gif" alt="ezgif.com-video-to-gif8134348e0cec5a97.gif" border="0" /></a></div>

## Bugs, Problems ...

Please contact us via mail seed-test@adesso.de

## Installation

Seed-Test can be installed via docker or by hand.

### 🐳 Docker

Seed-Test can be run by docker which makes the installation very handy.
It will download NodeJs and the browsers with their correct driver on it's own.

#### Prerequisites

For this [docker](https://www.docker.com/products/docker-desktop/) needs to be installed.

#### Installing Seed

After installing docker you just simply need to clone the repository and launch the runDocker script matching your OS:

Windows:

```
runDocker.bat
```

Linux:

```
runDocker.sh
```

And that's it! 

Seed-Test can now be accessed via `http://localhost:4200/login`

#### ⚠️ Warning:

Seed-Test now runs within docker with default values which means the following:

- No emails can be send to reset the password:
  To get this working you need to create and link an email account.
- GitHub functionalities don't work:
  To get GitHub functionalities to work you need to create and link a [GitHub OAuth App](https://docs.github.com/de/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app).
- Salt and secrets are defaults:They should be changed for generating secure passwords!
- The mongoDB used has a default username and password. This should be changed for a secure database:To change this change the values in the docker-compose.yml

To know how to change this look at the configure section below.

#### ⚙️ Configuration:

Seed-Test's front- and backend can be configured sepreratly.

##### Backend:

To configure the backend create a file with the name ".env" in the /backend directory.
Now you can configure the backend by adding parameters shown in the .env.example file.

##### Frontend:

To configure the frontend create a file with the name ".env" in the /frontend directory.
Now you can configure the frontend by adding parameters shown in the .env.example file.

The dockerRun script needs to be run after any changes to the ".env" files.

### 🤙 By hand:

Seed-Test can be installed on your machine by hand.
This requires some more steps to be done.

#### Prerequisites

To install docker by hand [NodeJS](https://nodejs.org/en/) needs to be installed.

| Browser |                                                                                                                                                                                                                                                                |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome* | Download and install[Google Chrome](). Download the version of the [chromedriver](https://chromedriver.chromium.org/downloads) that matches your version of Google Chrome. Extract the "chromedriver.exe" and set a path to it.                                      |
| Edge    | Download and install[Microsoft Edge](https://www.microsoft.com/en-us/edge/download?form=MA13FJ). Download the corresponding [edgedriver](https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/), unpack it and set a path to the "msedgedriver.exe". |
| Firefox | Download and install[Mozilla Firefox](https://www.mozilla.org/de/firefox/new/). Download the [geckodriver](https://github.com/mozilla/geckodriver/releases) in the assets, unpack it and set a path to the "geckodriver.exe".                                        |

*Seed-Test uses Google Chrome by default for executing selenium.

#### Installing Seed

To install and use the application localy, clone or download the repository as a zip.

The required node modules are not installed yet. To do so, open up a console in the frontend and backend folder and install them:

```
cd backend
npm install
```

and

```
cd frontend
npm install
```

Create a file called `.env` in the /backend folder.
Now do the steps described in the [Database](https://github.com/adessoSE/Seed-Test/blob/Standalone-Docker/README.md#database) section bellow.

You will need two terminals to run the frontend server and backend server. Switch to the corresponding folder and start it:

```
cd frontend
npm start
```

and

```
cd backend
npm start
```

Once everything is running, you can access the website by typing this into a browser window:

```
http://localhost:4200/login
```

If you would like to use our webdriver updater, open a new terminal switch to the backend folder and start it. Make sure, you assigned the environment variables WEBDRIVER_DIR and WEBDRIVER_EXEC_PERIOD.

```
cd backend
npm run start:wd_updater
```

#### ⚠️ Warning:

Seed-Test now runs with default values which means the following:

- No emails can be send to reset the password:
  To get this working you need to create and link an email account.
- GitHub functionalities don't work:
  To get GitHub functionalities to work you need to create and link a [GitHub OAuth App](https://docs.github.com/de/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app).
- Salt and secrets are defaults:They should be changed for generating secure passwords!

To know how to change this look at the configure section below.

#### ⚙️ Configuration:

Seed-Test's front- and backend can be configured sepreratly.

##### Backend:

To configure the backend create a file with the name ".env" in the /backend directory.
Now you can configure the backend by adding parameters shown in the .env.example file.

##### Frontend:

To configure the frontend create a file with the name ".env" in the /frontend directory.
Now you can configure the frontendby adding parameters shown in the .env.example file.

## Database

Seed-Test uses a MongoDB. You can either create your own locally or in the cloud.
For installation details check out our [Database Tutorial](https://github.com/adessoAG/Seed-Test/wiki/Database)

Once you have set up the database, insert the uri into the DATABASE_URI variable inside the .env file of your backend folder.
Save it!

Then you can set up the database through this command:

```
npm run database
```

This command creates the collections 'Stories' and 'stepTypes' and inserts the current stepTypes into the collection.
The Stories collection can stay empty. It will be automatically filled while accessing the web-app.

### License

Copyright (c) 2018 adesso SE Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
