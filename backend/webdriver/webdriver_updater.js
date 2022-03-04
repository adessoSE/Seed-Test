/* eslint-disable camelcase,no-use-before-define */
// https://www.selenium.dev/documentation/webdriver/getting_started/install_drivers/

const request = require('request');
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const tar = require('tar');
const os = require('os');
const { exec } = require('child_process');
const cron = require('node-schedule');

if (process.env.NODE_ENV !== 'production') {
	console.log('INFO: Not in productive environment. Using .env file ...');
	require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

// TODO: propper error handling
// TODO: automatic modification of the PATH variable for linux
// TODO: Firefox: check if newest version is compatible to currently installed browser version

const executionPeriod = process.env.WEBDRIVER_EXEC_PERIOD || '0 0 1 * * *';
const webdriver_dir = process.env.WEBDRIVER_DIR || path.join(__dirname, '../webdriver');
const webdriver_file_mode = parseInt(process.env.WEBDRIVER_FILE_MODE, 8) || 0o755;
const os_ = get_os_platform_architecture();

console.log('INFO: Webdriver updater started.\n');
console.log('INFO: Execution period:\t\t\t\t', executionPeriod);
console.log('INFO: Webdriver directory:\t\t\t', webdriver_dir);
console.log('INFO: Default webdriver file mode (linux):\t', `0o${webdriver_file_mode.toString(8)}`);

try {
	cron.scheduleJob(executionPeriod, () => {
		runWebdriverUpdater();
	});
} catch (e) {
	console.log(`ERROR: Given cron expresseion (${executionPeriod}) is not valid!`);
	console.log('       Please refere to https://github.com/node-schedule/node-schedule for documentation.');
	throw new Error('Aborted');
}

async function runWebdriverUpdater() {
	console.log('######################### Execution Started #########################');
	let date = new Date();
	console.log('INFO: Webdriver service started at', date.toISOString());

	await async_check_driver_directory();
	// await async_append_path_variable()
	console.log('');

	await update_driver('Chrome', 'chromedriver');
	console.log('');
	await update_driver('Firefox', 'geckodriver');

	date = new Date();
	console.log('\nINFO: Webdriver service finished at', date.toISOString());
	console.log('########################## Execution Ended ##########################');
}

async function update_driver(browser, driver) {
	console.log(`Updating ${browser} driver`);

	const browserVersion = await async_get_browser_version(browser);
	if (!browserVersion) {
		console.log(`WARN: Browser ${browser} not installed. Skipping...`);
		return;
	}
	console.log('#\tCurrent browser version:', browserVersion);

	const currentVersion = await get_current_driver_version(driver);
	console.log('#\tCurrent driver version:\t', currentVersion);

	const latestVersion = await async_get_latest_version(browser, browserVersion);
	console.log('#\tLatest driver version:\t', latestVersion);

	if (currentVersion === latestVersion) {
		// Version numbers match
		console.log('#\tNo action needed: driver already up to date');
		return;
	}

	const downloadUrl = get_download_url(browser, latestVersion);
	await download_and_extract_archive(driver, downloadUrl);

	console.log('#\tInstallation successful');
}

// ########################################## Helper Functions ###################################
function get_os_platform_architecture() {
	const ret = {};

	const architecture = os.arch().toString();
	if (architecture.includes('32')) ret.architecture = '32';
	else if (architecture.includes('64')) ret.architecture = '64';
	else ret.architecture = '';

	const platform = os.platform();
	switch (platform) {
		case 'win32':
			ret.platform = 'win';
			ret.runtime = 'powershell.exe';
			break;
		case 'linux':
			ret.platform = 'linux';
			ret.runtime = 'bash';
			break;
		case 'darwin':
			// ret.platform = 'macos'
			// ret.runtime = 'bash'
			break;
		default:
			throw new Error(`This operating system (${platform}) is not supported yet!`);
	}
	return ret;
}

function async_check_driver_directory() {
	return new Promise((resolve) => {
		fs.stat(webdriver_dir, (err, stats) => {
			if (err || !stats.isDirectory()) {
				// Create directory because it does not exist so far
				console.log('INFO: Directory specified by WEBDRIVER_DIR does not exists. Creating...');
				fs.mkdir(webdriver_dir, { recursive: true }, (eror) => {
					if (eror) throw eror;
					else resolve([]);
				});
			} else resolve([]);
		});
	});
}

async function get_current_driver_version(driver) {
	let driver_file_path = path.join(webdriver_dir, driver);
	if (os_.platform === 'win') driver_file_path += '.exe';

	if (!await async_check_if_file_exists(driver_file_path)) return 'not installed';

	const versionString = await async_run_command(`${driver_file_path} --version`);

	return versionString.split(' ')[1];
}

async function async_get_browser_version(browser) {
	const command = `(Get-Item (Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${browser}.exe').'(Default)').VersionInfo.ProductVersion`;
	let versionString;
	switch (os_.platform) {
		case 'win':
			return async_run_command(command);
		case 'linux':
			if (browser === 'chrome') versionString = await async_run_command('google-chrome --version');
			return versionString.split(' ').pop();
		case 'macos':
		default:
			throw new Error(`This operating system (${os_.platform}) is not fully supported yet!`);
	}
}

function async_get_latest_version(browser, browserVersion) {
	try {
		switch (browser) {
			case 'Chrome':
				// https://chromedriver.chromium.org/downloads/version-selection
				return async_get_latest_chromedriver_version(browserVersion);

			case 'Firefox':
				// inspired by https://pypi.org/project/geckodriver-autoinstaller/
				// https://firefox-source-docs.mozilla.org/_sources/testing/geckodriver/Support.md.txt
				return async_get_latest_geckodriver_version();

			default:
				throw new Error(`This browser system (${browser}) is not fully supported yet!`);
		}
	} catch (e) {
		console.log('WARN: Could not receive latest Version.\nAborting...');
	}
}

function get_download_url(browser, latestVersion) {
	switch (browser) {
		case 'Chrome':
			// https://chromedriver.chromium.org/downloads/version-selection
			return get_chromedriver_download_url(latestVersion);

		case 'Firefox':
			// inspired by https://pypi.org/project/geckodriver-autoinstaller/
			// https://firefox-source-docs.mozilla.org/_sources/testing/geckodriver/Support.md.txt
			return get_geckodriver_download_url(latestVersion);

		default:
			throw new Error(`This webbrowser (${browser}) is not supported yet!`);
	}
}

async function async_run_command(command) {
	// https://exceptionshub.com/execute-powershell-script-from-node-js.html

	// child_process.exec() uses the CMD for Windows per default.
	// We could use the PowerShell by handing over the option { shell = 'powershell.exe' }.
	// But it is faster to let te CMD interpreter the command as a PS command.
	// -> https://stackoverflow.com/q/67823124
	if (os_.platform === 'win') command = `powershell.exe ${command}`;

	return new Promise((resolve, reject) => {
		exec(command, (error, stdout, stderr) => {
			if (error) {
				console.log(`INFO: error: ${error.message}`);
				reject(error);
			}
			if (stderr) {
				console.log(`INFO: stderr: ${stderr}`);
				resolve('');
			}
			resolve(stdout.trim());
		});
	});

	// var child = spawn(os_.runtime, [command]);

	// child.stdout.on("data", data => {
	//     result += data.toString()
	// });
	// child.stderr.on("data", data => {
	//     // TODO: proper error handling
	//     console.log(data.toString())
	//     resolve('')
	// });
	// child.on('close', exitCode => {
	//     if(exitCode != 0)
	//         console.log(`INFO: Exit code != 0 of command '${command}'`)
	//     // Remove trailing '\n' and whitespaces
	//     resolve(result.trim())
	//     //resolve(result.slice(0,-1))
	// })

	// child.stdin.end()
	// break
}

async function async_request_data(url) {
	return new Promise((resolve, reject) => {
		let cache = '';
		request
			.get(url)
			.on('data', (dataChunk) => {
				cache += dataChunk;
			})
			.on('error', (err) => {
				reject(err);
			})
			.on('end', () => {
				resolve(cache);
			});
	});
}

async function download_and_extract_archive(driver, downloadUrl) {
	// We want to temporarily store the archive with a file name that does not exist so far
	const randomInt = Math.floor(Math.random() * 10000).toString();
	const archiveName = `${randomInt}_${downloadUrl.split('/').pop()}`;

	// Specify download target
	const archiveFile = path.join(webdriver_dir, archiveName);

	// Download archive
	await async_download_archive(downloadUrl, archiveFile);

	// Get archive type
	const archiveType = archiveName.split('.').pop();

	// 'zip' -> zip-File, 'gz' -> .tar.gz file
	switch (archiveType) {
		case 'zip':
			await new Promise((resolve) => {
				fs.createReadStream(archiveFile)
					.pipe(unzipper.Extract({ path: webdriver_dir }))
					.on('close', () => {
						resolve([]);
					});
			});
			break;
		case 'gz':
			// https://www.npmjs.com/package/tar
			tar.extract({ sync: true, file: archiveFile, cwd: webdriver_dir });
			break;
		default:
			throw new Error(`This archive type (${archiveType}) is not fully supported yet!`);
	}

	// Delete archive file
	fs.unlinkSync(archiveFile);

	// Fix file mode (linux only)
	if (os_.platform === 'linux') fs.chmodSync(path.join(webdriver_dir, driver), webdriver_file_mode);
}

async function async_download_archive(downloadUrl, targetPath) {
	// Flag 'w': overwrites possibly existing files
	const file = fs.createWriteStream(targetPath, { flags: 'w' });

	return new Promise((resolve) => {
		request(downloadUrl)
		// Does not work, since Google does not provide this header in its response
		// .on('response', res => {
		//     console.log(res.headers['content-disposition'])
		// })
			.pipe(file)
			.on('finish', () => {
				file.close();
				console.log('#\tDownload complete');
				resolve([]);
			})
			.on('error', (err) => {
				// TODO: proper error handling
				console.log('#\tERROR: Error while downloading/saving archive');
				resolve([]);
			});
	});
}

// TODO: give the last finish
async function async_append_path_variable() {
	let request_command = '';
	let write_command = '';
	switch (os_.platform) {
		case 'win':
			// request_command = 'echo %PATH%'
			// request_command = `(Get-ItemProperty 'HKLM:\\System\\CurrentControlSet\\Control\\Session Manager\\Environment').Path`
			request_command = '[Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)';

			// write_command = 'setx PATH "%PATH%;{new_PATH}"'
			// var write_command = `(Set-ItemProperty -Path "HKLM:\\System\\CurrentControlSet\\Control\\Session Manager\\Environment" -Name Path -Value '${new_PATH}')`
			write_command = '[Environment]::SetEnvironmentVariable("Path", "{new_PATH}", [EnvironmentVariableTarget]::Machine)';
			break;

			// TODO: does not work when executed as sudo -> creation of /root/.profile prohibited
		case 'linux':
			request_command = 'echo $PATH ';
			write_command = `export PATH=$PATH:${webdriver_dir} >> ~/.profile`;
			break;

		default:
			throw new Error(`This operating system (${os_.platform}) is not fully supported yet!`);
	}

	const old_PATH = await async_run_command(request_command);

	if (old_PATH.includes(webdriver_dir)) {
		// No action needed: already part of the PATH variable
		console.log('INFO: PATH variable already contains the path to the webdriver directory. No action needed.');
		return;
	}
	console.log(write_command);
	const answer = await async_run_command(write_command);
	console.log(answer);
	console.log('INFO: PATH variable updated.');
}

// Request the statistics of the specified file -> will fail if the file does not exist
async function async_check_if_file_exists(filepath) {
	return new Promise((resolve) => {
		fs.stat(filepath, (err, stats) => {
			if (err) resolve(false);
			else resolve(true);
		});
	});
}

// ############################################ Chrome ############################################
async function async_get_latest_chromedriver_version(chromeVersion) {
	// Remove the last group of numbers and the corresponding .
	const chromeVersionCutted = chromeVersion.match(/\d*.\d*.\d*/)[0];

	// Retrieve latest chromedriver version for the currently installed version of Chrome
	const helperUrl = `https://chromedriver.storage.googleapis.com/LATEST_RELEASE_${chromeVersionCutted}`;
	return async_request_data(helperUrl);
}

function get_chromedriver_download_url(latestVersion) {
	const downloadUrl = `https://chromedriver.storage.googleapis.com/${latestVersion}/chromedriver_`;
	switch (os_.platform) {
		case 'win':
			return `${downloadUrl}win32.zip`;
		case 'linux':
			return `${downloadUrl}linux64.zip`;
		case 'macos':
			return `${downloadUrl}mac64.zip`;
		default:
			throw new Error('Uncompatible operating system.\nAborting...');
	}
}

// ########################################## Firefox Driver ######################################
// inspired by https://pypi.org/project/geckodriver-autoinstaller/
async function async_get_latest_geckodriver_version() {
	return new Promise((resolve, reject) => {
		request
			.get('https://github.com/mozilla/geckodriver/releases/latest', (err, res, body) => {
				// We are interested in the url we were redirected to
				const redirectUrl = res.request.uri.href;

				// Split url by seperator '/' and return the last entry of the thereby created array
				let version = redirectUrl.split('/').pop();

				// Remove the leading 'v'
				version = version.slice(1);

				resolve(version);
			})
			.on('error', (err) => {
				reject(err);
			});
	});
}

function get_geckodriver_download_url(latestVersion) {
	const url = `https://github.com/mozilla/geckodriver/releases/download/v${latestVersion}/geckodriver-v${latestVersion}-${os_.platform}${os_.architecture}`;
	switch (os_.platform) {
		case 'win':
			return `${url}.zip`;
		case 'linux':
		case 'macos':
			return `${url}.tar.gz`;
		default:
			throw new Error(`This operating system (${os_.platform}) is not supported yet!`);
	}
}
