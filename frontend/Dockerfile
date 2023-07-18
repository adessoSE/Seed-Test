 FROM node:18.13

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --ignore-scripts --only=production

# Install Angular CLI
RUN npm install -g @angular/cli --ignore-scripts --only=production

COPY . .

EXPOSE 4200

RUN npm run build

# Aus frontend/package.json
CMD ["node", "server.js"]

# keeps container running without doing anything so you can bash into it
# ENTRYPOINT ["tail", "-f", "/dev/null"]
