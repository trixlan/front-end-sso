(function (){
  'use strict';

  var session  = require("express-session")
  var Keycloak = require('keycloak-connect');

  let _keycloak;
  
  function initKeycloak() {
    if (_keycloak) {
        console.warn("Trying to init Keycloak again!");
        return _keycloak;
    } 
    else {
        console.log("Initializing Keycloak...");
        var memoryStore = new session.MemoryStore();
        _keycloak = new Keycloak({ store: memoryStore });
        return _keycloak;
    }
}

function getKeycloak() {
    if (!_keycloak){
        console.error('Keycloak has not been initialized. Please called init first.');
    } 
    return _keycloak;
}

  module.exports = {
    session: {
      name: 'md.sid',
      secret: 'f85f44e9-3960-495e-a94e-d719c23fab48',
      resave: false,
      saveUninitialized: true
    },
    initKeycloak,
    getKeycloak
  };

}());
