# Use build argument for Node.js version
ARG NODE_VERSION=20.9
FROM node:${NODE_VERSION}

RUN apt-get update && \
    apt-get install -qq -y wget

# Create app directory
WORKDIR /usr/src/app

# Print out the contents of the ./ directory
RUN ls -l .

# install chrome 
RUN wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN yes | apt install -qq ./google-chrome-stable_current_amd64.deb
RUN rm -f google-chrome-stable_current_amd64.deb

# install chromedriver
RUN apt-get install -qq -yqq unzip curl
RUN wget -q -O /tmp/chromedriverzip.zip https://storage.googleapis.com/chrome-for-testing-public/$(curl https://googlechromelabs.github.io/chrome-for-testing/LATEST_RELEASE_STABLE)/linux64/chromedriver-linux64.zip
RUN unzip /tmp/chromedriverzip.zip chromedriver-linux64/chromedriver -d /usr/local/bin/
RUN mv /usr/local/bin/chromedriver-linux64/chromedriver /usr/local/bin/chromedriver

# install firefox
RUN wget -q -O ~/FirefoxSetup.tar.bz2 "https://download.mozilla.org/?product=firefox-latest&os=linux64"
RUN tar xjf ~/FirefoxSetup.tar.bz2 -C /opt/
RUN ln -s /opt/firefox/firefox /usr/local/bin/
RUN apt-get -q update && apt-get install -qq -y wget bzip2 libxtst6 libgtk-3-0 libx11-xcb-dev libdbus-glib-1-2 libxt6 libpci-dev && rm -rf /var/lib/apt/lists/*

# install edge
RUN curl -q https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
RUN install -o root -g root -m 644 microsoft.gpg /etc/apt/trusted.gpg.d/
RUN sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/edge stable main" > /etc/apt/sources.list.d/microsoft-edge-dev.list'
RUN rm microsoft.gpg
RUN apt update && yes | apt install -qq microsoft-edge-stable
# include in path
RUN export PATH=$PATH:/opt/microsoft/msedge/
ENV PATH="${PATH}:/opt/microsoft/msedge/"

# install msedgedriver
# # Extract the latest stable version of edge
RUN msedge --version | sed 's/.*Edge \([0-9.]*\).*/\1/' > latest_stable.txt

# Return stable version (debugging purposes)
RUN cat latest_stable.txt

# Install the latest stable EdgeDriver for Linux
RUN wget https://msedgedriver.azureedge.net/$(curl -s https://msedgedriver.azureedge.net/LATEST)/edgedriver_linux64.zip && unzip edgedriver_linux64.zip \
    unzip /tmp/msedgedriver.zip msedgedriver -d /usr/local/bin/ && \
    rm -f /tmp/msedgedriver.zip

# Verify EdgeDriver installation
RUN msedgedriver --version


# Remove temporary file (regardless of download success)
RUN rm -f latest_stable.txt

# Bundle app source
COPY . .

# Install dependencies and rebuild native modules
RUN npm install --ignore-scripts && npm rebuild bcrypt

#RUN npm ci
# If you are building your code for production
# RUN npm ci --only=production

EXPOSE 8080

# Start dbus-daemon for google-chrome
RUN service dbus start

# starts the backend server
CMD ["sh", "-c", "npm run database && npm run start"]

# keeps container running without doing anything so you can bash into it
# ENTRYPOINT ["tail", "-f", "/dev/null"]