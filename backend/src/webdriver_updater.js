const request = require('request')
const fs = require('fs')
const path = require('path')
const unzipper = require('unzipper')
const tar = require('tar')
const os = require('os');
var spawn = require("child_process").spawn;
var cron = require('node-schedule');
require('dotenv').config();             // necessary to read from .env file

const executionPeriod = process.env.WEBDRIVER_EXEC_PERIOD
const webdriver_dir = process.env.WEBDRIVER_DIR
const versionFilePath = path.join(webdriver_dir, '.versions')
const os_ = get_os_platform_architecture()


// TODO: implement for linux
// TODO: propper error handling
// TODO: automatic modification of the PATH variable for linux


// Premliminary check: is this cron expression valid?
try{
    cron.scheduleJob(executionPeriod, function(){
        runWebdriverUpdater()
    })
} catch(e){
    console.log(`ERROR: Given cron expresseion (${executionPeriod}) is not valid!`)
    console.log(`       Please refere to https://github.com/node-schedule/node-schedule for documentation.`)
    throw new Error("Aborted")
}




async function runWebdriverUpdater(){
    console.log("######################### Execution Started #########################")
    var date = new Date()
    console.log("INFO: Webdriver service started at", date.toISOString())

    await async_check_driver_directory()
    await async_append_path_variable()
    console.log('')

    await update_driver('Chrome')
    console.log('')
    await update_driver('Firefox')

    date = new Date()
    console.log("\nINFO: Webdriver service finished at", date.toISOString())
    console.log("########################## Execution Ended ##########################")
}



async function update_driver(browser){
    console.log(`Updating ${browser} driver`)
    browser = browser.toLowerCase()

    browserVersion = await async_get_browser_version(browser)
    if(browserVersion === undefined){
        console.log("\tBrowser ${browser} not installed.")
        return
    }
    console.log("#\tCurrent browser version:", browserVersion)

    currentVersion = await get_current_driver_version(browser)
    console.log("#\tCurrent driver version:\t", currentVersion)

    latestVersion = await async_get_latest_version(browser, browserVersion)
    console.log("#\tLatest driver version:\t", latestVersion)  
    
    if(currentVersion == latestVersion){
        // Version numbers match
        console.log("#\tNo action needed: driver already up to date")
        return;
    }    

    downloadUrl = get_download_url(browser)
    await download_and_extract_archive(downloadUrl)
    
    console.log("#\tInstallation successful") 
}






// ########################################## Helper Functions ##########################################
function get_os_platform_architecture(){
    var ret = {}

    architecture = os.arch().toString()
    if (architecture.includes('32'))
        ret.architecture = '32'
    else if (architecture.includes('64')){
        ret.architecture = '64'
    }
    else {
        ret.architecture = ''
    }

    platform = os.platform()
    switch(platform){
        case 'win32':
            ret.platform = 'win'
            ret.runtime = 'powershell.exe'
            break;
        case 'linux':
            // ret.platform = 'linux'
            // ret.runtime = 'bash'
            // break;
        case 'darwin':
            // ret.platform = 'macos'
            // ret.runtime = 'bash'
            // break;
        default:
            throw new Error(`This operating system (${platform}) is not supported yet!`)
    }
    // TODO: rather split up into [ 'mac', 'os' ] for macOS ?
    return ret
}



function async_check_driver_directory(){
    return new Promise(resolve => {
        fs.stat(webdriver_dir, (err,stats) => {
            if(err || stats.isDirectory() == false){
                // Create directory because it does not exist so far
                console.log("INFO: Directory specified by WEBDRIVER_DIR does not exists. Creating...")
                fs.mkdir(webdriver_dir, { recursive: true }, err => {
                    if(err) throw err
                    else resolve([])
                })
            }
            else
                resolve([])
        })
    })
}



async function get_current_driver_version(browser){
    names = {
        chrome: 'chromedriver',
        firefox: 'geckodriver'
    }

    command = ''
    switch(os_.platform){
        case 'win':
            command = path.join(webdriver_dir, names[browser]) + '.exe --version'
            break;
        case 'linux':
            command = path.join(webdriver_dir, names[browser]) + ' --version'
            break
        case 'macos':
        default:
            throw new Error(`This operating system (${os_.platform}) is not fully supported yet!`)

    }
    versionString =  await async_run_command(command)

    if(versionString != '')
        return versionString.split(' ')[1]
    else
        return 'not installed'
}



async function async_get_browser_version(browser){
    switch(os_.platform){
        case 'win':
            command =  `(Get-Item (Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${browser}.exe').'(Default)').VersionInfo.ProductVersion`
            return async_run_command(command)
        case 'linux':
        case 'macos':
        default:
            throw new Error(`This operating system (${os_.platform}) is not fully supported yet!`)
    }
}



function async_get_latest_version(browser, browserVersion){
    switch(browser){
        case 'chrome':
            // https://chromedriver.chromium.org/downloads/version-selection
            try{
                return async_get_latest_chromedriver_version(browserVersion)
            } catch(e){
                console.log("WARN: Could not receive lates Version.\nAborting...")
                exit -1
            }

        case 'firefox':
            // inspired by https://pypi.org/project/geckodriver-autoinstaller/
            // https://firefox-source-docs.mozilla.org/_sources/testing/geckodriver/Support.md.txt
            // TODO: check if newest version is compatible to currently installed browser version
            try{
                return async_get_latest_geckodriver_version()
            } catch(e){
                console.log("WARN: Could not receive lates Version.\nAborting...")
                exit -1
            }
    }
}



function get_download_url(browser){
    switch(browser){
        case 'chrome':
            // https://chromedriver.chromium.org/downloads/version-selection
            return get_chromedriver_download_url()

        case 'firefox':
            // inspired by https://pypi.org/project/geckodriver-autoinstaller/
            // https://firefox-source-docs.mozilla.org/_sources/testing/geckodriver/Support.md.txt
            return get_geckodriver_download_url()
            
        default:
            throw new Error(`This webbrowser (${browser}) is not supported yet!`)
    }
}



async function async_run_command(command){    
    // https://exceptionshub.com/execute-powershell-script-from-node-js.html
    var result = ''
    return new Promise(resolve => {
        var child = spawn(os_.runtime, [command]);

        child.stdout.on("data", data => {
            result += data.toString()
        });
        child.stderr.on("data", data => {
            // TODO: proper error handling
            console.log(data.toString())
            resolve('')
        });
        child.on('close', exitCode => {
            if(exitCode != 0)
                console.log(`INFO: Exit code != 0 of command '${command}'`)
            // Remove trailing '\n'
            resolve(result.slice(0,-1))
        })

        child.stdin.end()
    })
}



async function async_request_data(url){
    return new Promise((resolve, reject) => {
        var cache = ''
        request
            .get(url)
            .on('data', dataChunk => {
                cache += dataChunk
            })
            .on('error', err => {
                reject(err)
            })
            .on('end', () =>  {
                resolve(cache)
            })
    })
}



async function download_and_extract_archive(downloadUrl){    
    // We want to temporarely store the archive with a file name that does not exist so far
    var randomInt = Math.floor(Math.random()*10000).toString()
    var archiveName = randomInt + '_' + downloadUrl.split('/').pop()

    // Specify download target
    archiveFile = path.join(webdriver_dir, archiveName)

    // Download archive
    await async_download_archive(downloadUrl, archiveFile)

    // Unpack archive
    archiveType = archiveName.split('.').pop()
        // 'zip' -> zip-File, 'gz' -> .tar.gz file
    switch(archiveType){
        case 'zip':
            fs.createReadStream(archiveFile).pipe(unzipper.Extract({ path: webdriver_dir }));
            break
        case 'gz':
            // https://www.npmjs.com/package/tar
            tar.extract({ sync: true, file: archiveFile, cwd : webdriver_dir })
            break
        default:
            throw new Error(`This archive type (${archiveType}) is not fully supported yet!`)
    }

    // Delete archive file
    fs.unlinkSync(archiveFile)
}



async function async_download_archive(downloadUrl, targetPath){
    // Flag 'w': overwrites possibly existing files
    const file = fs.createWriteStream(targetPath, {flags: 'w'})

    return new Promise(resolve => {
        request(downloadUrl)
        // Does not work, since Google does not provide this header in its response
        // .on('response', res => {
        //     console.log(res.headers['content-disposition'])
        // })
        .pipe(file)
        .on('finish', () => {
            file.close()
            console.log("#\tDownload complete") 
            resolve([])
        })
        .on('error', err => {
            // TODO: proper error handling
            console.log("#\tERROR: Error while downloading/saving archive")
            resolve([])
        })
    })
}


// TODO: give the last finish
async function async_append_path_variable(){
    switch(os_.platform){
        case 'win':
            //var request_command = `(Get-ItemProperty 'HKLM:\\System\\CurrentControlSet\\Control\\Session Manager\\Environment').Path`
            var request_command = `[Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)`
            var old_PATH = await async_run_command(request_command)
            //console.log(old_PATH)

            if(old_PATH.includes(webdriver_dir)){
                // No action needed: already part of the PATH variable
                console.log("INFO: PATH variable already contains the path to the webdriver directory. No action needed.")
                return
            }

            var new_PATH = old_PATH + ';' + webdriver_dir

            //var write_command = `(Set-ItemProperty -Path "HKLM:\\System\\CurrentControlSet\\Control\\Session Manager\\Environment" -Name Path -Value '${new_PATH}')`
            var write_command = `[Environment]::SetEnvironmentVariable("Path", "${new_PATH}", [EnvironmentVariableTarget]::Machine)`
            console.log(write_command)
            answer = await async_run_command(write_command)
            break

        case 'linux':
        case 'macos':
        default:
            throw new Error(`This operating system (${os_.platform}) is not fully supported yet!`)
    }
    console.log("INFO: PATH variable updated.")
}










// ############################################ Chrome ############################################
async function async_get_latest_chromedriver_version(chromeVersion){
    // Remove the last group of numbers and the corresponding .
    chromeVersionCutted = chromeVersion.match(/\d*.\d*.\d*/)[0]

    // Retrieve latest chromedriver version for the currently installed version of Chrome
    helperUrl = `https://chromedriver.storage.googleapis.com/LATEST_RELEASE_${chromeVersionCutted}`
    return async_request_data(helperUrl)
}



function get_chromedriver_download_url(){
    downloadUrl = `https://chromedriver.storage.googleapis.com/${latestVersion}/chromedriver_`
    switch(os_.platform){
        case 'win':
            return downloadUrl + 'win32.zip'
        case 'linux':
            return downloadUrl + 'linux64.zip'
        case 'macos':
            return downloadUrl + 'mac64.zip'
        default:
            throw new Error("Uncompatible operating system.\nAborting...")
    }
}





// ########################################## Firefox Driver ##########################################
// inspired by https://pypi.org/project/geckodriver-autoinstaller/
async function async_get_latest_geckodriver_version(){
    return new Promise ((resolve, reject) => {
        request
        .get('https://github.com/mozilla/geckodriver/releases/latest', (err, res, body) => {
            // We are interested in the url we were redirected to
            redirectUrl = res.request.uri.href

            // Split url by seperator '/' and return the last entry of the thereby created array
            version = redirectUrl.split('/').pop()

            // Remove the leading 'v'
            version = version.slice(1)

            resolve(version)
        })
        .on('error', err => {
            reject(err)
        })
    })
}



function get_geckodriver_download_url(){
    var url = `https://github.com/mozilla/geckodriver/releases/download/v${latestVersion}/geckodriver-v${latestVersion}-${os_.platform}${os_.architecture}`
    switch(os_.platform){
        case 'win':
            return url + '.zip'
        case 'linux':
        case 'macos':
            return url + '.tar.gz'
        default:
            throw new Error(`This operating system (${platform}) is not supported yet!`)
    }
}


































// ############################################ Deprecated ############################################

async function async_run_command_as_admin(command){    
    // https://exceptionshub.com/execute-powershell-script-from-node-js.html
    var result = ''
    //command = `New-Item -Path 'C:\\Users\\drebinger\\Documents\\SEED\\webdriver\\Test File.txt' -ItemType File`
    return new Promise(resolve => {
        // or -executionpolicy unrestricted
        var powerShell = spawn('powershell.exe', ['-ExecutionPolicy', 'ByPass', command])
        //powerShell.stdin.write(`Start-Process powershell -Verb runAs -Args "-executionpolicy bypass -command ${command}`)
        // TODO: powershell.exe Start-Process -Verb RunAs wt

        powerShell.stdout.on("data", data => {
            result += data.toString()
        });
        powerShell.stderr.on("data", data => {
            // TODO: proper error handling
            console.log(data.toString())
            resolve('')
        });
        powerShell.on('close', exitCode => {
            if(exitCode != 0)
                console.log(`INFO: Exit code != 0 of command '${command}'`)
            // Remove trailing '\n'
            resolve(result.slice(0,-1))
        })

        powerShell.stdin.end()
    })
}



function read_version_file(){
    versionData = ''
    try {
        // Try to read existing data from the .versions file. If not existing (error is thrown) we initialize the file
        raw_versionData = fs.readFileSync(versionFilePath, {encoding:'utf8', flag:'r'})
        versionData = JSON.parse(raw_versionData)
        chromeDriverVersion = versionData.chromeDriverVersion
        firefoxDriverVersion = versionData.firefoxDriverVersion
    }
    catch (err) {
        console.log("INFO: Error while reading .verion file.")
        versionData = initialize_version_file()
    }
    return versionData
}



// Create the .versions file and write initial data to it
function initialize_version_file(){
    console.log("INFO: Newly initializing the file content for later use")
    initData = {
        "chromeDriverVersion": "",
        "firefoxDriverVersion": ""
    }

    const file = fs.createWriteStream(versionFilePath, {flags: 'w'})
    file.write(JSON.stringify(initData), () => {
        file.close()
    })
    return initData
}



function update_version_file(variableName, newValue){
    raw_versionData = fs.readFileSync(versionFilePath, {encoding:'utf8', flag:'r'})
    versionData = JSON.parse(raw_versionData)
    versionData[variableName] = newValue
    raw_versionData = JSON.stringify(versionData)

    const file = fs.createWriteStream(versionFilePath, {flags: 'w'})
    file.write(raw_versionData, () => {
        file.close()
    })
}



// Request the statistics of the specified file -> will fail if the file does not exist
async function async_check_if_file_exists(filepath){
    return new Promise(resolve => {
        fs.stat(filepath, (err, stats) => {
            if(err)
                resolve(false)
            else
                resolve(true)
        })
    })
}



// https://stackoverflow.com/a/55043962
function bufferFromBufferString(bufferStr){
    return Buffer.from(
        bufferStr
            .replace(/[<>]/g, '') // remove < > symbols from str
            .split(' ') // create an array splitting it by space
            .slice(1) // remove Buffer word from an array
            .reduce((acc, val) => 
                acc.concat(parseInt(val, 16)), [])  // convert all strings of numbers to hex numbers
     )
}