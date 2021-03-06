'use strict';
const fs = require('fs');
const os = require('os');
const ini = require('ini');
const osHomedir = require('os-homedir');
const pify = require('pify');

const fsP = pify(fs);

function getFirefoxProfilePath() {
  let ffConfDir;

  if (process.platform === 'win32') {
    ffConfDir = process.env.APPDATA + '/Mozilla/Firefox/';
  } else {
    ffConfDir = process.platform === 'darwin' ? osHomedir() + '/Library/Application Support/Firefox/' : osHomedir() + '/.mozilla/firefox/';
  }

  let profile;
  try {
    profile = ini.parse(fs.readFileSync(ffConfDir + 'profiles.ini', 'utf-8')).Profile0.Path;
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('Unable to read Firefox\'s profiles.ini configuration.');
    } else {
      throw err;
    }
  }
  return ffConfDir + profile;
}

const file = getFirefoxProfilePath() + '/sessionstore-backups/recovery.js';

const parse = buf => {
  const session = JSON.parse(buf);
  const tabs = [];

  session.windows.forEach(window => {
    window.tabs.forEach(tab => {
      const tabObject = tab.entries.pop();
      tabs.push({title: tabObject.title, url: tabObject.url});
    });
  });

  return {
    deviceName: os.hostname(),
    modified: new Date(session.session.lastUpdate),
    tabCount: tabs.length,
    tabs
  };
};

module.exports = () => fsP.readFile(file, 'utf8')
  .then(parse)
  .catch(err => {
    if (err.code === 'ENOENT') {
      console.log('Unable to parse recovery.js. Returning empty session data object.');
      return {
        deviceName: os.hostname(),
        modified: new Date(),
        tabCount: 0,
        tabs: []
      };
    }
    throw err;
  });

module.exports.sync = () => {
  try {
    return parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('Unable to parse recovery.js. Returning empty session data object.');
      return {
        deviceName: os.hostname(),
        modified: new Date(),
        tabCount: 0,
        tabs: []
      };
    }
    throw err;
  }
};
