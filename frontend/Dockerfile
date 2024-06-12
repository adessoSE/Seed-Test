# Use build argument for Node.js version
ARG NODE_VERSION=20.9
FROM node:${NODE_VERSION}

# Create a non-root user
RUN useradd --user-group --create-home --shell /bin/false appuser

# Create app directory and set permissions
WORKDIR /usr/src/app
RUN chown -R appuser:appuser /usr/src/app


# Copy package.json and package-lock.json
COPY package*.json ./

# Print out the contents of the ./ directory
RUN ls -l .

# Print out the content of package.json
RUN cat ./package.json

# Install dependencies
RUN npm ci --ignore-scripts
#RUN npm install --force --ignore-scripts

# Install Angular CLI
RUN npm install --force --ignore-scripts -g @angular/cli

# Install esbuild 
RUN npm install esbuild --ignore-scripts

COPY . .

# Change ownership to the non-root user
RUN chown -R appuser:appuser /usr/src/app

# Switch to non-root user
USER appuser

EXPOSE 4200

RUN npm run build

# Aus frontend/package.json
CMD ["node", "server.js"]

# keeps container running without doing anything so you can bash into it
# ENTRYPOINT ["tail", "-f", "/dev/null"]
