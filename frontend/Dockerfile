# Use build argument for Node.js version
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}

# Create app directory
WORKDIR /usr/src/app

# Build context is the repo root: frontend depends on the workspace package @seed-test/shared
# (not on the npm registry) and the root package-lock.json is the only current lockfile.
COPY . .

# Install frontend and shared workspace dependencies
RUN npm install --ignore-scripts -w frontend -w shared
#RUN npm install --force --ignore-scripts

# Install Angular CLI
RUN npm install --force --ignore-scripts -g @angular/cli

# Install esbuild 
RUN npm install --ignore-scripts esbuild 

# Build shared first: the frontend resolves @seed-test/shared to shared/dist
RUN npm run build -w shared

WORKDIR /usr/src/app/frontend

EXPOSE 4200

RUN npm run build

# Aus frontend/package.json
CMD ["node", "server.js"]

# keeps container running without doing anything so you can bash into it
# ENTRYPOINT ["tail", "-f", "/dev/null"]
