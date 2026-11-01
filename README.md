# Seed-Test

Behaviour-driven development (BDD) extends the Test-Driven Development (TDD) approach by the ‘desired behaviour’ of a software. It is designed to ensure a collaboration between business analysts and developers with explicitly written down scenarios.

- Check out the [Tutorial (english)](https://github.com/adessoAG/Seed-Test/wiki/Tutorial_eng) / [Tutorial (german)](https://github.com/adessoAG/Seed-Test/wiki/Tutorial_deu)

## What is Seed-Test?

Seed-Test is a website user interface testing tool, which uses approaches of behaviour-driven development and the notation of Gherkin to enable developers and business users to execute automated tests for their website.

<div style="text-align:center"><a href="https://gifyu.com/image/SnEf3"><img src="https://s12.gifyu.com/images/ezgif.com-video-to-gif8134348e0cec5a97.gif" alt="ezgif.com-video-to-gif8134348e0cec5a97.gif" border="0" /></a></div>

## Bugs, Problems ...

Please contact us via mail seed-test@adesso.de

Seed-Test can be installed via docker or by hand.

## 🚀Give Seed-Test Demo a Try!

Seed-Test offers a handy demo version that's ready for you to dive into. If you're just looking to test out Seed-Test, you can easily do so by installing this demo.

#### Prerequisites

Before you begin, make sure you have [Docker](https://www.docker.com/products/docker-desktop/) installed. A Docker-API-compatible runtime such as Podman (`podman machine start`) also works.

#### Installation

Follow these simple steps to get up and running:

- Open your terminal and run this command:

  ```
  docker run -p 4200:4200 -p 8080:8080 seedtest/seed-test-demo:latest
  ```

**Try Seed-Test in Your Browser**

Now, you can experience Seed-Test in your web browser at http://localhost:4200.

An example user account is ready for you to explore.

- <b>E-Mail:</b> `seed@test.de`
- <b>Password:</b> `seedtest`

<b>Have Fun! 🚀🌟</b>

#### ⚠️ Important Note

Please note that Seed-Test's demo version is for testing purposes only and should not be used in a production environment. For production use, consider using the full version of Seed-Test. Check out the Installation section bellow.

## Installation

Seed-Test can be installed via docker or by hand.

### 🐳 Docker

Seed-Test can be run by docker which makes the installation very handy.
It will download NodeJs and the browsers with their correct driver on it's own.

#### Prerequisites

For this [docker](https://www.docker.com/products/docker-desktop/) needs to be installed. A Docker-API-compatible runtime such as Podman (`podman machine start`) also works.

#### Installation of Seed

Once you have Docker installed, the process of setting up Seed is straightforward. Follow these steps:

1. **Download the Release:**

   - Go to the [releases page](https://github.com/adessoSE/Seed-Test/releases) of Seed on GitHub.
   - Download the `docker-compose.yml` and `.env.example` files from the assets for the specific release you want.

2. **Create the `.env` file:**

   - In the same folder, copy `.env.example` to `.env`.
   - Replace every `change-me` value:
     - `ENCRYPTION_SECRET`: exactly 64 hex characters, e.g. `openssl rand -hex 32`.
     - `MONGO_ROOT_USERNAME` and `MONGO_ROOT_PASSWORD`: use only URL-safe characters, no `@ : / ? # %`.
     - `SESSION_SECRET` and `JIRA_SECRET`: long random strings. `JIRA_SALT`: at least 16 random bytes.
   - Compose refuses to start while one of these values is missing.

3. **Navigate and Execute:**

   - Open a terminal.
   - Navigate to the directory where you placed the `docker-compose.yml` and `.env` files using the `cd` command. For instance:
     ```
     cd C:/seed-test
     ```
   - Execute the following command to start the Seed application in the background:
     ```
     docker compose up -d
     ```

With these steps, you'll have Seed up and running using Docker with the downloaded `docker-compose.yml` file. This will initiate the necessary services, volumes and configurations for the application (mongoDB as a single-node replica set `rs0`, seed-test-frontend, seed-test-backend).

Seed-Test can now be accessed via `http://localhost:4200/login`

#### Upgrading an existing install

Installs from 1.x used demo secrets written into `docker-compose.yml`. To keep your data, copy these values into `.env`:

- `MONGO_ROOT_USERNAME=SeedAdmin` and `MONGO_ROOT_PASSWORD=SeedTest`
- `SESSION_SECRET=secretSessionKey`, `JIRA_SECRET=secretJiraKey` and `JIRA_SALT=BJ1yJTJ7AFql`
- `ENCRYPTION_SECRET`: keep the value you already have in `.env`.

Note the following:

- Changing `JIRA_SECRET`, `JIRA_SALT` or `ENCRYPTION_SECRET` on an existing database makes the stored Jira and AI credentials undecryptable. Users must enter them again.
- MongoDB reads the root user only when the `seedDB` volume is created. To change `MONGO_ROOT_USERNAME` or `MONGO_ROOT_PASSWORD`, either update the user inside MongoDB or recreate the volume. Recreating the volume deletes its data. Until one of these is done, the backend does not start.
- MongoDB runs as a single-node replica set `rs0`, which the backend needs for transactions. The healthcheck initiates it on existing volumes too, and the data stays.

#### ⚠️ Warning:

Seed-Test runs within docker without external services, which means the following:

- No emails can be send to reset the password:
  To get this working you need to create and link an email account.
- GitHub functionalities don't work:
  To get GitHub functionalities to work you need to create and link a [GitHub OAuth App](https://docs.github.com/de/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app).
- The compose files serve plain HTTP (`COOKIE_SECURE=false`, `TRUST_PROXY=false`):
  Before you expose Seed-Test beyond localhost, put an HTTPS reverse proxy in front of it. Then remove `COOKIE_SECURE` and set `TRUST_PROXY` to `true` in `docker-compose.yml`.

#### ⚙️ Configuration:

To configure anything when running seed via docker, you can simply adjust the environment variables for each container in the docker-compose.yml file and rerun the command. The secrets and the MongoDB root user are read from `.env`, not from this file:

##### Backend

| Variable                       | Description                                                                                                                                                                                                             |
| :----------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FRONTEND_URL                   | The frontend URL should be configured to match the server's URL where the frontend container is running. The default value is set to 'http://localhost:4200' (which is the default location of the frontend container). |
| DATABASE_URI\*                 | The mongoDB Connection String URI. This can be replaced with your own mongoDB.<br />If you are using the MongoDB provided by docker compose, this needs to match the values set for the mongoDB in the docker compose.  |
| REPORT_DELETION_TIME           | Time (in minutes) after which the report is deleted.                                                                                                                                                                    |
| SESSION_SECRET                 | Session secret to establish a secure connection and prevent session hijacking (used in /backend/src/server.js).<br />See https://www.npmjs.com/package/express-session                                                  |
| JIRA_SECRET                    | Jira Integration : values used for the encryption of sensible data.<br />Choose a strong Secret like for example generated by RandomKeygen.                                                                             |
| JIRA_SALT                      | The salt should be a random string of at least 16 bytes length.                                                                                                                                                         |
| EMAIL_AUTH                     | Mail adress to send password reset mails (used in /backend/src/nodemailer.js)                                                                                                                                           |
| EMAIL_PW                       | Mail password credentials to send password reset mails (used in /backend/src/nodemailer.js)                                                                                                                             |
| EMAIL_PORT                     | Mail server port to send password reset mails (used in /backend/src/nodemailer.js)                                                                                                                                      |
| EMAIL_HOST                     | Mail server adress to send password reset mails (used in /backend/src/nodemailer.js)                                                                                                                                    |
| GITHUB_CLIENT_SECRET           | GitHub integration. Check out GitHub´s Guide on Autorizing OAuth Apps.                                                                                                                                                  |
| GITHUB_CLIENT_ID               | GitHub integration. Check out GitHub´s Guide on Autorizing OAuth Apps.                                                                                                                                                  |
| PASSPORT_GITHUB_LOCAL_PW_FIELD | GitHub integration. Check out GitHub´s Guide on Autorizing OAuth Apps.                                                                                                                                                  |
| MAX_SAVED_REPORTS              | The amount of maximum saved reports.                                                                                                                                                                                    |

\*If you are not using the mongoDB provided by this docker compose you can completely delete the seedmongodb section from the docker-compose.yml and remove the depends on part of the backend service.

##### Frontend

| Variable         | Meaning                                                                                                                                                               |
| :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GITHUB_CLIENT_ID | GitHub integration. Check out GitHub´s Guide on Autorizing OAuth Apps.                                                                                                |
| VERSION          | This controls if the demo warning is shown. Set this to "set" to make it disapear.                                                                                    |
| API_SERVER       | The URL for the server or container hosting the backend. The default setting is 'http://localhost:8080/api' (which is the default location of the backend container). |

##### Database

| Variable                     | Meaning                                             |
| :--------------------------- | :-------------------------------------------------- |
| MONGO_ROOT_USERNAME\*        | Root user of the MongoDB container. Set in `.env`.                                   |
| MONGO_ROOT_PASSWORD\*        | Root password of the MongoDB container. Set in `.env`, URL-safe characters only.     |

\*Compose builds `DATABASE_URI` for the backend from these two values. Changing them needs the steps in "Upgrading an existing install".

### 🤙 By hand:

Seed-Test can be installed on your machine by hand.
This requires some more steps to be done.

#### Prerequisites

To install docker by hand [NodeJS](https://nodejs.org/en/) needs to be installed.

| Browser  |                                                                                                                                                                                                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome\* | Download and install [Google Chrome](). Download the version of the [chromedriver](https://chromedriver.chromium.org/downloads) that matches your version of Google Chrome. Extract the "chromedriver.exe" and set a path to it.                                      |
| Edge     | Download and install [Microsoft Edge](https://www.microsoft.com/en-us/edge/download?form=MA13FJ). Download the corresponding [edgedriver](https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/), unpack it and set a path to the "msedgedriver.exe". |
| Firefox  | Download and install [Mozilla Firefox](https://www.mozilla.org/de/firefox/new/). Download the [geckodriver](https://github.com/mozilla/geckodriver/releases) in the assets, unpack it and set a path to the "geckodriver.exe".                                        |

\*Seed-Test uses Google Chrome by default for executing selenium.

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

Seed-Test runs without external services, which means the following:

- No emails can be send to reset the password:
  To get this working you need to create and link an email account.
- GitHub functionalities don't work:
  To get GitHub functionalities to work you need to create and link a [GitHub OAuth App](https://docs.github.com/de/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app).
- Secrets in `backend/.env` must be replaced with your own values before any use beyond local testing.

See the configuration section below.

#### ⚙️ Configuration:

Seed-Test's front- and backend can be configured sepreratly.

##### Backend:

To configure the backend create a file with the name ".env" in the /backend directory.
Now you can configure the backend by adding parameters shown in the .env.example file.

##### Frontend:

To configure the frontend create a file with the name ".env" in the /frontend directory.
Now you can configure the frontend by adding parameters shown in the .env.example file.

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
