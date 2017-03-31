# SoftLayer Object Storage helper

### Installing

NPM

    $ npm i -S softlayer-object-storage
    
### Code
```javascript
    import ObjectStorage from './src';
    import fs from 'fs';
    
    const conf = {
      removeAccess: true, // allow remove objects from container [default false]
      storage: 'public', // public or private
      endpoint: 'https://***.objectstorage.softlayer.net/auth/v1.0',
      username: 'SLOS********-*:***********',
      key: '******************************',
      container: 'backups',
    };
    
    const backupsContainer = new ObjectStorage(conf);
    const readStream = fs.createReadStream('./mysql.sql.gz');

    // show all containers in your account
    backupsContainer.listContainers()
    .then(console.log)
    .catch(console.error);
    
    // show full url to all files in 'backups' container
    backupsContainer.listFiles()
    .then(console.log)
    .catch(console.error);
    
    // upload 'mysql.sql.gz' from local to OS
    backupsContainer.uploadFile(readStream)
    .then(console.log)
    .catch(console.error);
    
    // remove 'mysql.sql.gz' from OS
    // you can pass string (to remove one object) or array of string to remove many
    // string is a a name or full URL to object
    backupsContainer.removeFile('mysql.sql.gz') // or backupsContainer.removeFile('https://***.objectstorage.softlayer.net/v1/AUTH_**/backups/mysql.sql.gz')
    .then(console.log)
    .catch(console.error);
```
### License

MIT
