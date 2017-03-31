import request from 'request';

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
        request.put({
          url: `${JSON.parse(res.body).storage[this.storage]}/${name}`,
          headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
        }, (error, resp) => {
          if (error) reject(error);
          resolve(resp);
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
          request.delete({
            url: `${JSON.parse(res.body).storage[this.storage]}/${containerName}`,
            headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
          }, (error) => {
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
        request.get({
          url: `${JSON.parse(res.body).storage[this.storage]}`,
          headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
        }, (error, { body }) => {
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
        request.get({
          url: `${JSON.parse(res.body).storage[this.storage]}/${this.container}`,
          headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
        }, (error, { body }) => {
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

  uploadFile(readStream, name) {
    return new Promise((resolve, reject) => {
      const filename = name || readStream.path.split('/').reverse()[0];
      request.get(this.token, (err, res) => {
        if (err) reject(err);
        const writeStream = request.put({
          url: `${JSON.parse(res.body).storage[this.storage]}/${this.container}/${filename}`,
          headers: { 'X-Auth-Token': res.headers['x-auth-token'] },
        });
        readStream.pipe(writeStream);
        readStream.on('exit', resolve);
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
