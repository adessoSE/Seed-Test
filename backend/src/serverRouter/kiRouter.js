var pfs = require('fs/promises');
var path = require('path');
var db = require('../database/DbServices')

const KI_Exchange = process.env.KI_Exchange




const ac = new AbortController();
const { signal } = ac;
// setTimeout(() => ac.abort(), 10000);

(async () => {
  try {
    const watcher = pfs.watch(path.join(KI_Exchange, 'output'), { signal });
    for await (const fsEvent of watcher){
      const filename = fsEvent.filename
      console.log(fsEvent);
      if(fsEvent.eventType == 'change') return;
      const filePath = path.join(KI_Exchange, 'output', fsEvent.filename);
      pfs.readFile(filePath)
      .then((file)=> {
        console.log(file);
        consumeKiOutput(file.toString())
        pfs.unlink(filePath) // delete after read
      })
      .catch((err)=>{
        if(err.code == 'ENOENT') return;//suppress file not found
        console.error(err);
      });
    }
  } catch (err) {
    console.error(err);
    if (err.name === 'AbortError')
      return;
    throw err;
  }
})();
console.log('watch ki-exchange output');


function placeKiOrder(story) {
    placeFile('input', story._id+'.json', JSON.stringify(story));
    console.log('place kI Order');
}

function placeResult(result, storyId){
    placeFile('result', storyId+'.json', result);
    console.log('place Result');
}

function placeStatus(status){
    placeFile('status', 'Seed'+Date.now()+'.json', status);
}

async function getFile(dir){
    return await pfs.readFile(dir)
}

function consumeKiOutput(story){
    console.log('consume KI Output: ' + JSON.stringify(story));
    //db.updateStory(story)
}

function placeFile(dir, filename, file){
    pfs.writeFile(path.join(KI_Exchange, dir, filename),file,
    ()=>{
        console.log('wrote file');
    });
}

module.exports = {placeKiOrder,placeResult}