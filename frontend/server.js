// Install express server
const request = require('request')

if(!process.env.NODE_ENV){
  require('dotenv').config();
}

const express = require('express');
const path = require('path');
const app = express();
app.disable('x-powered-by');
const ngPath = path.join(__dirname, 'dist/cucumber-frontend');
const environment = '../frontend/src/environments/environment';

// Serve only the static files form the dist directory
app.use(express.static(ngPath));

app.get('/backendInfo', (_, res) => {
  res.json({
    url: process.env.API_SERVER,
    clientId: process.env.GITHUB_CLIENT_ID,
    version: process.env.VERSION || "",
    gecko_enabled: process.env.GECKO_ENABLED || false,
    chromium_enabled: process.env.CHROMIUM_ENABLED || true,
    edge_enabled: process.env.EDGE_ENABLED || false,
    gecko_emulators: [],
    chromium_emulators: ["iPhone SE", "iPhone XR", "iPhone 12 Pro", "Pixel 3 XL", "Pixel 5", "Samsung Galaxy S8+", "Samsung Galaxy S20 Ultra", "iPad Air", "iPad Mini", "Surface Pro 7", "Surface Duo", "Galaxy Fold", "Samsung Galaxy A51/71", "Nest Hub Max", "Nest Hub", "iPhone 4", "iPhone 5/SE", "iPhone 6/7/8", "iPhone 6/7/8 Plus", "iPhone X", "BlackBerry Z30", "Nexus 4", "Nexus 5", "Nexus 5X", "Nexus 6", "Nexus 6P", "Pixel 2", "Pixel 2 XL", "Pixel 3", "Pixel 4", "LG Optimus L70", "Nokia N9", "Nokia Lumia 520", "Microsoft Lumia 550", "Microsoft Lumia 950", "Galaxy S III", "Galaxy S5", "Galaxy S8", "Galaxy S9+", "Galaxy Tab S4", "JioPhone 2", "Kindle Fire HDX", "iPad Mini", "iPad", "iPad Pro", "Blackberry PlayBook", "Nexus 10", "Nexus 7", "Galaxy Note 3", "Galaxy Note II", "Moto G4"],
    edge_emulators: ["iPhone SE", "iPhone XR", "iPhone 12 Pro", "Pixel 3 XL", "Pixel 5", "Samsung Galaxy S8+", "Samsung Galaxy S20 Ultra", "iPad Air", "iPad Mini", "Surface Pro 7", "Surface Duo", "Galaxy Fold", "Samsung Galaxy A51/71", "Nest Hub Max", "Nest Hub", "iPhone 4", "iPhone 5/SE", "iPhone 6/7/8", "iPhone 6/7/8 Plus", "iPhone X", "BlackBerry Z30", "Nexus 4", "Nexus 5", "Nexus 5X", "Nexus 6", "Nexus 6P", "Pixel 2", "Pixel 2 XL", "Pixel 3", "Pixel 4", "LG Optimus L70", "Nokia N9", "Nokia Lumia 520", "Microsoft Lumia 550", "Microsoft Lumia 950", "Galaxy S III", "Galaxy S5", "Galaxy S8", "Galaxy S9+", "Galaxy Tab S4", "JioPhone 2", "Kindle Fire HDX", "iPad Mini", "iPad", "iPad Pro", "Blackberry PlayBook", "Nexus 10", "Nexus 7", "Galaxy Note 3", "Galaxy Note II", "Moto G4"]
  });
});

app.get('/*', (_, res) => {
  res.sendFile(path.join(ngPath, 'index.html'));
});

// Start the app by listening on the default Heroku port
app.listen(process.env.PORT || environment.PORT || 4200, function () {
  const port = this.address().port;
  console.log('App now running on port', port);
});
