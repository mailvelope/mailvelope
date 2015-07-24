/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2015 Mailvelope GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

define(function(require, exports, module) {

  var mvelo = require('../lib-mvelo').mvelo;
  var indexedDB = mvelo.storage.indexedDB;
  var openpgp = require('openpgp');

  var DB_NAME = 'mailvelope';
  var DB_VERSION = 1;
  var DB_STORE_KEYS = 'keys';
  var DB_STORE_KEYRING_ATTR = 'keyring-attributes';

  var db;

  var dbReady = null;

  function init() {
    return deleteDb()
      .then(function() {
        openDb()
          .then(function() {
            console.log('indexedDB ready', Date.now());
          });
      });
    //return openDb();
  }

  function deleteDb() {
    return new Promise(function(resolve, reject) {
      var req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = resolve;
      req.onerror = reject;
    });
  }

  function openDb() {
    console.log('openDb');
    return new Promise(function(resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onsuccess = function() {
        db = this.result;
        db.onerror = function(event) {
          console.log('indexedDB error' + event.target.errorCode);
        };
        console.log('indexedDB.open success', Date.now());
        if (dbReady) {
          Promise.all(dbReady).then(resolve);
        } else {
          resolve();
        }
      };
      req.onerror = function(event) {
        console.error('indexedDB.open error', event.target.errorCode);
        reject();
      };
      req.onupgradeneeded = upgradeDb;
    });
  }

  function upgradeDb(event) {
    db = event.target.result;
    db.onerror = function(event) {
      console.log('indexedDB error' + event.target.errorCode);
    };
    switch (event.newVersion) {
      case 1:
        upgradeDbToV1();
        break;
      default:
        throw new Error('No upgrade path for indexedDB version');
    }
  }

  function addKeysToStore(keyringId, keys, type, store) {
    keys.forEach(function(armored) {
      try {
        var key = openpgp.key.readArmored(armored).keys[0];
        store.add({
          armored: armored,
          keyringId: keyringId,
          fingerprint: key.primaryKey.getFingerprint(),
          type: type
        });
      } catch (e) {
        console.log('Could not migrate key:', key);
      }
    });
  }

  function upgradeDbToV1() {
    console.log('openDb.onupgradeneeded version 1');
    var keyringAttrStore = db.createObjectStore(DB_STORE_KEYRING_ATTR, { keyPath: 'keyringId' });
    var keyStore = db.createObjectStore(DB_STORE_KEYS, { autoIncrement: true });
    keyStore.createIndex('keyringId', 'keyringId', { unique: false });
    keyStore.createIndex('fingerprint', 'fingerprint', { unique: false });
    keyStore.createIndex('type', 'type', { unique: false });
    // same transaction used for all object stores
    keyStore.transaction.oncomplete = function() {
      dbReady = [
        migrateKeyring()
      ];
    };
  }

  function migrateKeyring() {
    console.log('migrateKeyring');
    return new Promise(function(resolve, reject) {
      var transaction = db.transaction([DB_STORE_KEYRING_ATTR, DB_STORE_KEYS], "readwrite");
      transaction.oncomplete = function() {
        console.log('keys and keyring attributes written to db', Date.now());
        resolve();
      };
      var keyringAttrStore = transaction.objectStore(DB_STORE_KEYRING_ATTR);
      var keyStore = transaction.objectStore(DB_STORE_KEYS);
      var keyringAttr = mvelo.storage.get('mailvelopeKeyringAttr');
      var pubKeys, privKeys;
      if (keyringAttr && keyringAttr[mvelo.LOCAL_KEYRING_ID]) {
        for (var keyringId in keyringAttr) {
          keyringAttrStore.add({
            keyringId: keyringId,
            primaryPrivateKey: keyringAttr[keyringId].primary_key
          });
          if (keyringId === mvelo.LOCAL_KEYRING_ID) {
            pubKeys = mvelo.storage.get('openpgp-public-keys');
            privKeys = mvelo.storage.get('openpgp-private-keys');
          } else {
            pubKeys = mvelo.storage.get(keyringId + 'public-keys');
            privKeys = mvelo.storage.get(keyringId + 'private-keys');
          }
          addKeysToStore(keyringId, pubKeys, 'public', keyStore);
          addKeysToStore(keyringId, privKeys, 'private', keyStore);
        }
      } else {
        keyringAttrStore.add({
          keyringId: mvelo.LOCAL_KEYRING_ID,
          primaryPrivateKey: mvelo.storage.get('mailvelopePreferences').general.primaryPrivateKey
        });
        pubKeys = mvelo.storage.get('openpgp-public-keys');
        privKeys = mvelo.storage.get('openpgp-private-keys');
        addKeysToStore(mvelo.LOCAL_KEYRING_ID, pubKeys, 'public', keyStore);
        addKeysToStore(mvelo.LOCAL_KEYRING_ID, privKeys, 'private', keyStore);
      }
      console.log('keyringStore ready', Date.now());
    });
  }

  function getAll(name, index, value) {
    return new Promise(function(resolve, reject) {
      var result = [];
      db.transaction(name).objectStore(name).index(index)
        .openCursor(mvelo.storage.IDBKeyRange.only(value)).onsuccess = function(event) {
          var cursor = event.target.result;
          if (cursor) {
            result.push(cursor.value);
            cursor.continue();
          } else {
            resolve(result);
          }
        };
    });
  }

  function put(name, data) {
    return new Promise(function(resolve, reject) {
      var req = db.transaction(name, 'readwrite').objectStore(name).put(data);
      req.onerror = reject;
      req.onsuccess = resolve;
    });
  }

  exports.DB_STORE_KEYS = DB_STORE_KEYS;
  exports.DB_STORE_KEYRING_ATTR = DB_STORE_KEYRING_ATTR;
  exports.init = init;
  exports.getAll = getAll;

});
