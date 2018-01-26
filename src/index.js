/* eslint-disable prefer-promise-reject-errors */
const request = require('request');
const fs = require('fs');

class ObjectStorage {
  constructor(config) {
    this.removeAccess = config.removeAccess || false;
    this.storage = config.storage;
    this.endpoint = config.endpoint;
    this.username = config.username;
    this.headers = config.headers || {};
    this.key = config.key;
    this.container = config.container;
    this.token = {
      url: this.endpoint,
      timeout: config.timeout || 1000 * 120,
      headers: {
        'X-Auth-Key': this.key,
        'X-Auth-User': this.username,
        ...this.headers,
      },
    };
  }

  createContainer(containerName) {
    return new Promise((resolve, reject) => {
      request.get(this.token, (err, res) => {
        if (err) return reject(err);
        const token = {
          timeout: this.token.timeout,
          url: `${JSON.parse(res.body).storage[this.storage]}/${containerName}`,
          headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
        };
        request.put(token, (error) => {
          if (error) return reject(error);
          resolve(token.url);
        }).on('error', reject);
      }).on('error', reject);
    });
  }

  removeContainer(containerName) {
    if (this.removeAccess) {
      return new Promise((resolve, reject) => {
        request.get(this.token, (err, res) => {
          if (err) return reject(err);
          const token = {
            timeout: this.token.timeout,
            url: `${JSON.parse(res.body).storage[this.storage]}/${containerName}`,
            headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
          };
          request.delete(token, (error) => {
            if (error) reject({ error, done: true });
            resolve({ done: true });
          }).on('error', reject);
        }).on('error', reject);
      });
    }
    return Promise.resolve('remove not allowed, set { removeAccess: true } to allow');
  }

  listContainers() {
    return new Promise((resolve, reject) => {
      request.get(this.token, (err, res) => {
        const token = {
          timeout: this.token.timeout,
          url: `${JSON.parse(res.body).storage[this.storage]}`,
          headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
        };
        request.get(token, (error, { body }) => {
          if (error) return reject(error);
          const list = [];
          body.split('\n').forEach((name) => {
            if (name) {
              list.push(`${JSON.parse(res.body).storage[this.storage]}/${name}`);
            }
          });
          resolve(list);
        }).on('error', reject);
      }).on('error', reject);
    });
  }

  listFiles(path) {
    return new Promise((resolve, reject) => {
      request.get(this.token, (err, res) => {
        const token = {
          timeout: this.token.timeout,
          url: `${JSON.parse(res.body).storage[this.storage]}/${this.container}`,
          headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
        };
        request.get(token, (error, { body }) => {
          if (error) return reject(error);
          const list = [];
          body.split('\n').forEach((name) => {
            if (name) {
              const url = `${JSON.parse(res.body).storage[this.storage]}/${this.container}/${name}`;
              if (path) {
                if (~url.indexOf(`${this.container}${path}`)) list.push(url);
              } else {
                list.push(url);
              }
            }
          });
          resolve(list);
        }).on('error', reject);
      }).on('error', reject);
    });
  }

  uploadFile(file, { name, container, headers }) {
    return new Promise((resolve, reject) => {
      const readStream = typeof file === 'string' ? fs.createReadStream(file) : file;
      request.get(this.token, (err, res) => {
        if (err) {
          reject(err);
        } else {
          const token = {
            timeout: this.token.timeout,
            url: `${res.headers['x-storage-url']}/${container || this.container}/${name || file.filename}`,
            headers: { 'X-Auth-Token': res.headers['x-auth-token'], ...headers },
          };
          const writeStream = request.put(token);

          readStream.pipe(writeStream);

          writeStream.on('error', reject);
          readStream.on('error', reject);
          readStream.on('close', () => resolve(token.url));
        }
      }).on('error', reject);
    });
  }

  removeFile(files) {
    if (this.removeAccess) {
      return new Promise((resolve, reject) => {
        request.get(this.token, (err, res) => {
          if (err) return reject(err);
          if (Array.isArray(files)) {
            files.forEach((filename, idx) => {
              request.delete({
                timeout: this.token.timeout,
                url: `${JSON.parse(res.body).storage[this.storage]}/${this.container}/${filename}`,
                headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
              }, (error) => {
                if (error) {
                  reject(error);
                } else if (idx === files.length - 1) {
                  resolve({ done: true });
                }
              });
            });
          } else {
            request.delete({
              timeout: this.token.timeout,
              url: `${JSON.parse(res.body).storage[this.storage]}/${this.container}/${files}`,
              headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
            }, (error) => {
              if (error) {
                reject(error);
              } else {
                resolve({ done: true });
              }
            });
          }
        });
      });
    }
    return Promise.resolve('remove not allowed, set { removeAccess: true } to allow');
  }
}

module.exports = ObjectStorage;
