 FROM node:20.9

# Install the latest version of npm
RUN npm install -g npm@latest --ignore-scripts

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Print out the contents of the ./ directory
RUN ls -l .

# Print out the content of package.json
RUN cat package.json

# Install dependencies
#RUN npm ci --ignore-scripts
RUN npm install --force --ignore-scripts

# Install Angular CLI
RUN npm install --force --ignore-scripts -g @angular/cli

COPY . .

EXPOSE 4200

RUN npm run build

# Aus frontend/package.json
CMD ["node", "server.js"]

# keeps container running without doing anything so you can bash into it
# ENTRYPOINT ["tail", "-f", "/dev/null"]
