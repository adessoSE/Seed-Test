 FROM node:17

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install --force
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 4200

# Aus frontend/package.json
CMD ["npm", "run", "start"]

# keeps container running without doing anything so you can bash into it
# ENTRYPOINT ["tail", "-f", "/dev/null"]
