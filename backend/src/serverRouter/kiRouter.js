var pfs = require('fs/promises');
var path = require('path');
var mongo = require('../database/DbServices')

const KI_Exchange = process.env.KI_Exchange
let kiconfig = !!process.env.KI_Exchange

function noKiExchange(){
  if (!kiconfig) console.warn('KI-Exchange not Found, create folder "input", "output" inside');
}

const ac = new AbortController();
const { signal } = ac;
// setTimeout(() => ac.abort(), 10000);

/**
 * Watch output of KI-Exchange directory
 */
async function watchKiExchangeOutput() {
  noKiExchange();
  try {
    const watcher = pfs.watch(path.join(KI_Exchange, 'output'), { signal });
    for await (const fsEvent of watcher) {
      const filename = fsEvent.filename;
      console.log(fsEvent);
      if (fsEvent.eventType === 'change') return;
      const filePath = path.join(KI_Exchange, 'output', fsEvent.filename);
      pfs.readFile(filePath)
        .then((file) => {
          console.log(file);
          consumeKiOutput(file.toString());
          pfs.unlink(filePath); // delete after read
        })
        .catch((err) => {
          if (err.code === 'ENOENT') return; // suppress file not found
          console.error(err);
        });
    }
    console.log('Watching KI-Exchange output...');
  } catch (err) {
    if (err.code === 'ENOENT'){ // suppress folder not found
      return;
    }
    
    if (err.name === 'AbortError') return;
    throw err;
  }
}
watchKiExchangeOutput()


/**
 * Request Ki to Interpret and fill the Story with concrete steps.
 * @param {string} storyId 
 */
async function placeKiOrder(storyId) {
  if(!kiconfig)return;
  const story = await mongo.getOneStory(storyId, null);
  placeFile('input', story._id+'.json', JSON.stringify(story));
  console.log('place kI Order');
}

/**
 * Place Story Execution result
 * @param {string} result 
 * @param {string} storyId 
 */
function placeResult(result, storyId){
  if(!kiconfig)return;
  placeFile('result', storyId+'.json', result);
  console.log('place Result');
}

function placeStatus(status){
  if(!kiconfig)return;
  placeFile('status', 'Seed'+Date.now()+'.json', status);
}

async function getFile(dir){
  return await pfs.readFile(dir)
}

function consumeKiOutput(data){
  if(!kiconfig)return;
  let kiStory
  try {
    kiStory = JSON.parse(data);
  } catch (err) {
    console.error('parsing failed: ', err);
  }

  const id = kiStory._idMap.$oid;
  // delete kiStory._idMap;
  console.log('consume KI Output: ' + JSON.stringify(kiStory) + id);
  mongo.updateStoryKi(id, kiStory.scenarios);
}

function placeFile(dir, filename, file){
  pfs.writeFile(path.join(KI_Exchange, dir, filename),file,
  ()=>{
      console.log('wrote file: ', filename);
  });
}

module.exports = {placeKiOrder,placeResult}