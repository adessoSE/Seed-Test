FROM node:20

RUN apt-get update && \
    apt-get install -qq -y wget

# Install the latest version of npm
RUN npm install -g --ignore-scripts npm@latest

# Set DATABASE_URI to be localhost
ENV DATABASE_URI=mongodb://localhost:27017

# Create app directory
WORKDIR /usr/src/app

# install mongoDB
RUN apt-get -y install gnupg curl
RUN curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
    gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor
RUN echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
RUN apt-get update && apt-get -y install mongodb-org
RUN mkdir /data
RUN mkdir /data/db
RUN mongod --fork --logpath /var/log/mongodb.log

# ----- BACKEND (from /backend dockerfile) ------------------------------------------------------------------------

# install chrome 
RUN wget -q --max-redirect=0 https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN yes | apt install -qq ./google-chrome-stable_current_amd64.deb
RUN rm -f google-chrome-stable_current_amd64.deb

# install chromedriver
RUN apt-get -q install -yqq unzip curl
RUN wget -q -O /tmp/chromedriverzip.zip https://storage.googleapis.com/chrome-for-testing-public/$(curl https://googlechromelabs.github.io/chrome-for-testing/LATEST_RELEASE_STABLE)/linux64/chromedriver-linux64.zip
RUN unzip /tmp/chromedriverzip.zip chromedriver-linux64/chromedriver -d /usr/local/bin/
RUN mv /usr/local/bin/chromedriver-linux64/chromedriver /usr/local/bin/chromedriver

# install firefox
RUN wget -q -O ~/FirefoxSetup.tar.bz2 "https://download.mozilla.org/?product=firefox-latest&os=linux64"
RUN tar xjf ~/FirefoxSetup.tar.bz2 -C /opt/
RUN ln -s /opt/firefox/firefox /usr/local/bin/
RUN apt-get -q update && apt-get install -qq -y bzip2 libdbus-glib-1-2 libgtk-3-0 libpci-dev libx11-xcb-dev libxt6 libxtst6 wget && rm -rf /var/lib/apt/lists/*

# # install edge
# RUN curl -q https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
# RUN install -o root -g root -m 644 microsoft.gpg /etc/apt/trusted.gpg.d/
# RUN sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/edge stable main" > /etc/apt/sources.list.d/microsoft-edge-dev.list'
# RUN rm microsoft.gpg
# RUN apt-get -q update && apt-get install -qq -y microsoft-edge-stable
# # include in path
# RUN export PATH=$PATH:/opt/microsoft/msedge/
# ENV PATH="${PATH}:/opt/microsoft/msedge/"

# # install msedgedriver
# # # Extract the latest stable version of edge
# RUN msedge --version | sed 's/.*Edge \([0-9.]*\).*/\1/' > latest_stable.txt

# # # Remove the driver-pagehtml
# RUN wget -q -O /tmp/msedgedriver.zip https://msedgedriver.azureedge.net/$(cat latest_stable.txt)/edgedriver_linux64.zip
# RUN unzip /tmp/msedgedriver.zip msedgedriver -d /usr/local/bin/
# RUN rm -f latest_stable.txt


# Install edge via package manager
RUN apt-get update && apt-get install -qq -y software-properties-common
RUN curl -q https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /etc/apt/trusted.gpg.d/microsoft.gpg
RUN add-apt-repository "deb [arch=amd64] https://packages.microsoft.com/repos/edge stable main"
RUN apt-get update && apt-get install -qq -y microsoft-edge-stable

# Install npm packages for Selenium and EdgeDriver
WORKDIR /usr/src/app/backend
COPY ./backend/package*.json ./
RUN npm install --ignore-scripts
RUN npm install -g selenium-webdriver webdriver-manager

# Update WebDriver Manager for Edge
RUN webdriver-manager update --edge


# Clean up the cache after installing all necessary packages
RUN apt-get -q update && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app/backend
# Bundle app source
COPY ./backend .

RUN npm ci
# If you are building your code for production
# RUN npm ci --only=production

EXPOSE 8080

# Start dbus-daemon for google-chrome
RUN service dbus start

# ----- FRONTEND (from /frontend dockerfile) ---------------------------------------------------------------------

# Create app directory
WORKDIR /usr/src/app/frontend

# Copy package.json and package-lock.json
COPY ./frontend/package*.json ./

# Install dependencies
RUN npm ci --ignore-scripts

# Install Angular CLI
RUN npm install --ignore-scripts -g @angular/cli

COPY ./frontend .

EXPOSE 4200
EXPOSE 27017-27019
RUN npm run build

# -----------------------------------------------------------------------------------------------------------------

# Create a startup script
RUN echo "#!/bin/sh" > /usr/src/app/start.sh && \
    echo "mongod --fork --logpath /var/log/mongodb.log" >> /usr/src/app/start.sh && \
    echo "cd /usr/src/app/backend && npm run database && npm run database-examples && npm run start &" >> /usr/src/app/start.sh && \
    echo "cd /usr/src/app/frontend && node server.js" >> /usr/src/app/start.sh

# Make the script executable
RUN chmod +x /usr/src/app/start.sh

# Set the script as the ENTRYPOINT
ENTRYPOINT ["/usr/src/app/start.sh"]