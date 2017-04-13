const request = require('request');
const fs = require('fs');
const walk = require('walk');

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
        if (err) return reject(err);
        const token = {
          url: `${JSON.parse(res.body).storage[this.storage]}/${name}`,
          headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
        };
        request.put(token, (error) => {
          if (error) return reject(error);
          resolve(token.url);
        }).on('error', (e) => {
          console.log(`request.put error ${e.code} reconnecting`);
          return this.createContainer(name);
        });
      }).on('error', (e) => {
        console.log(`request.get error ${e.code} reconnecting`);
        return this.createContainer(name);
      });
    });
  }

  removeContainer(name) {
    if (this.removeAccess) {
      return new Promise((resolve, reject) => {
        request.get(this.token, (err, res) => {
          if (err) return reject(err);
          const containerName = name.split('/')[0] ? name.split('/').reverse()[0] : name;
          const token = {
            url: `${JSON.parse(res.body).storage[this.storage]}/${containerName}`,
            headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
          };
          request.delete(token, (error) => {
            if (error) reject({ error, done: true });
            resolve({ done: true });
          }).on('error', (e) => {
            console.log(`request.delete error ${e.code} reconnecting`);
            return this.removeContainer(name);
          });
        }).on('error', (e) => {
          console.log(`request.get error ${e.code} reconnecting`);
          return this.removeContainer(name);
        });
      });
    }
    return Promise.resolve('remove not allowed, set { removeAccess: true } to allow');
  }

  listContainers() {
    return new Promise((resolve, reject) => {
      request.get(this.token, (err, res) => {
        const token = {
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
        }).on('error', (e) => {
          console.log(`request.get error ${e.code} reconnecting`);
          return this.listContainers();
        });
      }).on('error', (e) => {
        console.log(`request.get error ${e.code} reconnecting`);
        return this.listContainers();
      });
    });
  }

  listFiles(path) {
    return new Promise((resolve, reject) => {
      request.get(this.token, (err, res) => {
        const token = {
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
        }).on('error', (e) => {
          console.log(`request.get error ${e.code} reconnecting`);
          return this.listFiles(path);
        });
      }).on('error', (e) => {
        console.log(`request.get error ${e.code} reconnecting`);
        return this.listFiles(path);
      });
    });
  }

  uploadDir(dir, exclude) {
    return new Promise((resolve, reject) => {
      const rootFolder = dir;
      const walker = walk.walk(rootFolder, { followLinks: false });

      walker.on('end', () => resolve('done'));
      walker.on('error', reject);

      return walker.on('file', (root, stat, next) => {
        const filePath = `${root}/${stat.name}`;
        const fileName = filePath.split('/').reverse()[0];
        const containerPath = filePath.replace(rootFolder, '').replace(fileName, '').slice(0, -1);
        if (!exclude || exclude.find(name => name !== fileName)) {
          console.log(filePath);
          this.uploadFile(filePath, false, `${this.container}${containerPath}`, next);
        } else {
          next();
        }
      });
    });
  }

  uploadFile(file, name, container, cb) {
    return new Promise((resolve, reject) => {
      const readStream = typeof file === 'string' ? fs.createReadStream(file) : file;
      const filename = name || readStream.path.split('/').reverse()[0];
      request.get(this.token, (err, res) => {
        if (err) return reject(err);
        const token = {
          url: `${JSON.parse(res.body).storage[this.storage]}/${container || this.container}/${filename}`,
          headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
        };
        const writeStream = request.put(token).on('error', (e) => {
          console.log(`request.put error ${e.code} reconnecting`);
          return this.uploadFile(file, name, container, cb);
        });
        readStream.pipe(writeStream);
        readStream.on('error', (error) => {
          if (cb) return cb();
          reject(error);
        });
        readStream.on('close', () => {
          if (cb) return cb();
          resolve(token.url);
        });
      }).on('error', (e) => {
        console.log(`request.get error ${e.code} reconnecting`);
        return this.uploadFile(file, name, container, cb);
      });
    });
  }

  removeFile(files) {
    if (this.removeAccess) {
      return new Promise((resolve, reject) => {
        request.get(this.token, (err, res) => {
          if (err) return reject(err);
          if (Array.isArray(files)) {
            files.forEach((file, idx) => {
              const filename = file.split('/')[0] ? file.split('/').splice(file.split('/').indexOf(this.container) + 1).join('/') : file;
              request.delete({
                url: `${JSON.parse(res.body).storage[this.storage]}/${this.container}/${filename}`,
                headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
              }, (error) => {
                if (error) reject({ error, done: true });
                if (idx === files.length - 1) resolve({ done: true });
              });
            });
          } else {
            const filename = files.split('/')[0] ? files.split('/').splice(files.split('/').indexOf(this.container) + 1).join('/') : files;
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
    }
    return Promise.resolve('remove not allowed, set { removeAccess: true } to allow');
  }
}

module.exports = ObjectStorage;
