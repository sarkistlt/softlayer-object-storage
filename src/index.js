const request = require('request');
const fs = require('fs');

class ObjectStorage {
  constructor(config) {
    this.removeAccess = config.removeAccess || false;
    this.storage = config.storage;
    this.endpoint = config.endpoint;
    this.username = config.username;
    this.key = config.key;
    this.container = config.container;
    this.token = {
      url: this.endpoint,
      headers: {
        'X-Auth-Key': this.key,
        'X-Auth-User': this.username,
      },
    };
  }

  createContainer(name) {
    return new Promise((resolve, reject) => {
      request.get(this.token, (err, res) => {
        if (err) reject(err);
        const token = {
          url: `${JSON.parse(res.body).storage[this.storage]}/${name}`,
          headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
        };
        request.put(token, (error) => {
          if (error) reject(error);
          resolve(token.url);
        });
      });
    });
  }

  removeContainer(name) {
    if (this.removeAccess) {
      return new Promise((resolve, reject) => {
        request.get(this.token, (err, res) => {
          if (err) reject(err);
          const containerName = name.split('/')[0] ? name.split('/').reverse()[0] : name;
          const token = {
            url: `${JSON.parse(res.body).storage[this.storage]}/${containerName}`,
            headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
          };
          request.delete(token, (error) => {
            if (error) reject({ error, done: true });
            resolve({ done: true });
          });
        });
      });
    } else {
      return Promise.resolve('remove not allowed, set { removeAccess: true } to allow');
    }
  }

  listContainers() {
    return new Promise((resolve, reject) => {
      request.get(this.token, (err, res) => {
        const token = {
          url: `${JSON.parse(res.body).storage[this.storage]}`,
          headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
        };
        request.get(token, (error, { body }) => {
          if (error) reject(error);
          const list = [];
          body.split('\n').forEach((name) => {
            if (name) {
              list.push(`${JSON.parse(res.body).storage[this.storage]}/${name}`);
            }
          });
          resolve(list);
        });
      });
    });
  }

  listFiles() {
    return new Promise((resolve, reject) => {
      request.get(this.token, (err, res) => {
        const token = {
          url: `${JSON.parse(res.body).storage[this.storage]}/${this.container}`,
          headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
        };
        request.get(token, (error, { body }) => {
          if (error) reject(error);
          const list = [];
          body.split('\n').forEach((name) => {
            if (name) {
              list.push(`${JSON.parse(res.body).storage[this.storage]}/${this.container}/${name}`);
            }
          });
          resolve(list);
        });
      });
    });
  }

  uploadFile(file, name) {
    const readStream = typeof file === 'string' ? fs.createReadStream(file) : file;
    return new Promise((resolve, reject) => {
      const filename = name || readStream.path.split('/').reverse()[0];
      request.get(this.token, (err, res) => {
        if (err) reject(err);
        const token = {
          url: `${JSON.parse(res.body).storage[this.storage]}/${this.container}/${filename}`,
          headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
        };
        const writeStream = request.put(token);
        readStream.pipe(writeStream);
        readStream.on('data', () => resolve(token.url));
      });
    });
  }

  removeFile(files) {
    if (this.removeAccess) {
      return new Promise((resolve, reject) => {
        request.get(this.token, (err, res) => {
          if (err) reject(err);
          if (Array.isArray(files)) {
            files.forEach((file, idx) => {
              const filename = file.split('/')[0] ? file.split('/').reverse()[0] : file;
              request.delete({
                url: `${JSON.parse(res.body).storage[this.storage]}/${this.container}/${filename}`,
                headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
              }, (error) => {
                if (error) reject({ error, done: true });
                if (idx === files.length - 1) resolve({ done: true });
              });
            });
          } else {
            const filename = files.split('/')[0] ? files.split('/').reverse()[0] : files;
            request.delete({
              url: `${JSON.parse(res.body).storage[this.storage]}/${this.container}/${filename}`,
              headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
            }, (error) => {
              if (error) reject({ error, done: true });
              resolve({ done: true });
            });
          }
        });
      });
    } else {
      return Promise.resolve('remove not allowed, set { removeAccess: true } to allow');
    }
  }
}

module.exports = ObjectStorage;
