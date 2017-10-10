const express = require('express');

const router = express.Router();

const getHash = require('../database/queries/getHash');

let details = {};
let hashString = '';

router.post('/', (req, res, next) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', () => {
    new Promise((resolve, reject) => {
      let hashToCheck = JSON.parse(body)

      getHash(hashToCheck, (err, result)=> {
        if(err) {
          console.log("I am an error from getHash ", err)
        } else {
          if(result.rowCount > 0) {
            // console.log("getHash called", result)
            resolve(result)
          } else {
            reject(err)
          }
        }
      })
    })
    .then(result => result.rows[0].fullname)
    .then(fullname => res.send(fullname))
    .catch((err) => {
      res.send('there is no registered user');
    })
  });
});


module.exports = router;
