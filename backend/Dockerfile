FROM node:18.13

RUN apt-get update
RUN yes | apt-get install wget

# Create app directory
WORKDIR /usr/src/app

# install chrome 
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN yes | apt install ./google-chrome-stable_current_amd64.deb
RUN rm -f google-chrome-stable_current_amd64.deb

# install chromedriver
RUN apt-get install -yqq unzip curl
RUN wget -O /tmp/chromedriverzip.zip https://storage.googleapis.com/chrome-for-testing-public/$(curl https://googlechromelabs.github.io/chrome-for-testing/LATEST_RELEASE_STABLE)/linux64/chromedriver-linux64.zip
RUN unzip /tmp/chromedriverzip.zip chromedriver-linux64/chromedriver -d /usr/local/bin/
RUN mv /usr/local/bin/chromedriver-linux64/chromedriver /usr/local/bin/chromedriver

# install firefox
RUN wget -O ~/FirefoxSetup.tar.bz2 "https://download.mozilla.org/?product=firefox-latest&os=linux64"
RUN tar xjf ~/FirefoxSetup.tar.bz2 -C /opt/
RUN ln -s /opt/firefox/firefox /usr/local/bin/
RUN apt-get update && apt-get install -y wget bzip2 libxtst6 libgtk-3-0 libx11-xcb-dev libdbus-glib-1-2 libxt6 libpci-dev && rm -rf /var/lib/apt/lists/*

# install edge
RUN curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
RUN install -o root -g root -m 644 microsoft.gpg /etc/apt/trusted.gpg.d/
RUN sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/edge stable main" > /etc/apt/sources.list.d/microsoft-edge-dev.list'
RUN rm microsoft.gpg
RUN apt update && yes | apt install microsoft-edge-stable
# include in path
RUN export PATH=$PATH:/opt/microsoft/msedge/
ENV PATH="${PATH}:/opt/microsoft/msedge/"

# install msedgedriver
# # Extract the latest stable version of edge
RUN msedge --version | sed 's/.*Edge \([0-9.]*\).*/\1/' > latest_stable.txt

# # Remove the driver-pagehtml
RUN wget -O /tmp/msedgedriver.zip https://msedgedriver.azureedge.net/$(cat latest_stable.txt)/edgedriver_linux64.zip
RUN unzip /tmp/msedgedriver.zip msedgedriver -d /usr/local/bin/
RUN rm -f latest_stable.txt

# Bundle app source
COPY . .

RUN npm ci
# If you are building your code for production
# RUN npm ci --only=production

EXPOSE 8080

# Start dbus-daemon for google-chrome
RUN service dbus start

# starts the backend server
CMD ["sh", "-c", "npm run database && npm run start"]

# keeps container running without doing anything so you can bash into it
# ENTRYPOINT ["tail", "-f", "/dev/null"]