# Use build argument for Node.js version
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --ignore-scripts
#RUN npm install --force --ignore-scripts

# Install Angular CLI
RUN npm install --force --ignore-scripts -g @angular/cli

# Install esbuild 
RUN npm install --ignore-scripts esbuild 

COPY . .

EXPOSE 4200

RUN npm run build

# Aus frontend/package.json
CMD ["node", "server.js"]

# keeps container running without doing anything so you can bash into it
# ENTRYPOINT ["tail", "-f", "/dev/null"]
