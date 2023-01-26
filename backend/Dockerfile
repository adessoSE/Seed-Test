FROM node:17

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
RUN wget -O /tmp/chromedriver.zip http://chromedriver.storage.googleapis.com/$(curl -sS chromedriver.storage.googleapis.com/LATEST_RELEASE)/chromedriver_linux64.zip
RUN unzip /tmp/chromedriver.zip chromedriver -d /usr/local/bin/

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

# install msedgedriver
# Download the HTML of the driver download page
RUN curl https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/ > driver-page.html

# Extract the latest stable version of the driver
RUN grep -oP 'version \K[0-9.]+\">Linux' driver-page.html | sed -n 1p | sed -r 's/^(.*)">Linux$/\1/' > latest_stable.txt

# Remove the driver-pagehtml
RUN wget -O /tmp/msedgedriver.zip https://msedgedriver.azureedge.net/$(cat latest_stable.txt)/edgedriver_linux64.zip
RUN unzip /tmp/msedgedriver.zip msedgedriver -d /usr/local/bin/
RUN rm -f driver-page.html
RUN rm -f latest_stable.txt

# Bundle app source
COPY . .

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

EXPOSE 8080

# Start dbus-daemon for google-chrome
RUN service dbus start

# starts the backend server
CMD ["sh", "-c", "npm run database && npm run start"]

# keeps container running without doing anything so you can bash into it
# ENTRYPOINT ["tail", "-f", "/dev/null"]