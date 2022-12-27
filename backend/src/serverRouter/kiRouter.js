var fs = require('fs/promises');
var path = require('path');

const KI_Exchange = process.env.KI_Exchange

fs.watch(path.join(KI_Exchange, 'output'),[], async (eventType, filename)=>{
    file = (await getFile(path.join(KI_Exchange, 'output', filename))).toJSON();
    consumeKiOutput(file)
})//watch the output directory


function placeKiOrder(story) {
    placeFile('input', story._id+'.json', JSON.stringify(story));
    console.log('place ki order');
}

function placeResult(result, storyId){
    placeFile('result', storyId+'.json', result);
    console.log('place Result');
}

function placeStatus(status){
    placeFile('status', 'Seed'+Date.now()+'.json', status);
}

function getFile(dir){
    return fs.readFile(path.normalize(dir))
}

function consumeKiOutput(story){

}

function placeFile(dir, filename, file){
    fs.writeFile(path.join(KI_Exchange, dir, filename),file,
    ()=>{
        console.log('wrote file');
    });
}

function consumeFile(){
    

}

module.exports = {placeKiOrder}