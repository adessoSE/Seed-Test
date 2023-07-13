 FROM node:18.13

# Create app directory
WORKDIR /usr/src/app

# Bundle app source
COPY . .

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

EXPOSE 4200

RUN npm run build

# Aus frontend/package.json
CMD ["node", "server.js"]

# keeps container running without doing anything so you can bash into it
# ENTRYPOINT ["tail", "-f", "/dev/null"]
