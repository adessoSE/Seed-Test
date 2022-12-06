var fs = require('fs');
var path = require('path');

const KI_Exchange = process.env.KI_Exchange


function placeKiOrder(story) {
    fs.writeFile(path.join(KI_Exchange, 'input',story._id+'.json'),JSON.stringify(story),
    ()=>{
        console.log('wrote file');
    });
    console.log('place ki order');
}

module.exports = {placeKiOrder}