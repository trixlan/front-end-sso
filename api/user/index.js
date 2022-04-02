(function () {
    'use strict';

    var async = require("async")
        , express = require("express")
        , request = require("request")
        , endpoints = require("../endpoints")
        , helpers = require("../../helpers")
        , config = require("../../config")
        , app = express()
        , cookie_name = "logged_in"
        , full_name = "full_name"

    const keycloak = config.getKeycloak();

    app.get('/login', keycloak.protect('admin'), login);

    function login(req, res) {

        console.log("Received Check SSO");
        console.log("Sesion ID=", req.session.id);

        const access_token = JSON.parse(req.session['keycloak-token']).access_token;

        var getUserInfo=function(callback) {
            console.log("Calling function getUserInfo()");
            var options_user_info = {
                headers: {
                    'Authorization': 'Bearer ' + access_token
                },
                uri: endpoints.userInfoUrl
            };
            request(options_user_info, function (error, response, body) {
                if (error) {
                    console.error("Error getUserInfo()", error);
                    callback(error);
                    return;
                }
                if (response.statusCode == 200 && body != null && body != "") {
                    console.log("User information getUserInfo()",body);
                    callback(null, JSON.parse(body));
                    return;
                }
                console.log(response.statusCode);
                callback(true);
            });
        }
    
        var getUserByName=function(userdata, callback) {
    
            let authorization= Buffer.from(userdata.preferred_username + ':' + '123456', 'utf-8').toString('base64');
    
            console.error("getUserByName()!! authorization=", authorization)
    
            var options = {
                headers: {
                    'Authorization': 'Basic ' + authorization
                },
                uri: endpoints.loginUrl
            };
            request(options, function(error, response, body) {
                console.log("Status code getUserByName()", response.statusCode);                
                if (error) {
                    console.error("getUserByName() error!!", error)
                    callback(error);
                    return;
                }
                if(response.statusCode==401 || response.statusCode == 500){
                    callback(null, undefined, userdata);
                    return;
                }
                if (response.statusCode == 200 && body != null && body != "") {
                    console.log("getUserByName() OK and body",body);
                    var customerId = JSON.parse(body).user.id;
                    console.log("getUserByName() customerId=", customerId);
                    callback(null, customerId, userdata);
                    return;
                }            
                callback(true);
            });
        }
    
        var registerUser=function(customerId, userinfo, callback) {
            
            if(customerId){
                callback(null, customerId, userinfo);
                return;
            }
    
            var options_register = {
                uri: endpoints.registerUrl,
                method: 'POST',
                json: true,
                body: {
                    "username": userinfo.preferred_username,
                    "password": '123456',
                    "email": userinfo.email,
                    "firstName": userinfo.given_name,
                    "lastName": userinfo.family_name
                }
            };
    
            request(options_register, function (error, response, body) {
                console.log("Status code registerUser()", response.statusCode);
                if (error !== null) {
                    console.error("Register user error!! 1")
                    callback(error);
                    return;
                }
                if (response.statusCode == 200 && body != null && body != "") {
                    if (body.error) {
                        console.error("Register user error!! 2", body.error);
                        callback(body.error);
                        return;
                    }
                    console.log("Register user OK and body=",body);
                    customerId = body.id;
                    console.log("Response register with customerId",customerId);
                    callback(null, customerId, userinfo);
                    return;
                }
                console.log(response.statusCode);
                callback(true);
            });
        }
    
        var cartMerge=function(custId, userdata, callback) {
            let sessionId = req.session.id;
            console.log("Calling cartMerge()");
            var optionsmerge = {
                uri: endpoints.cartsUrl + "/" + custId + "/merge" + "?sessionId=" + sessionId,
                method: 'GET'
            };
            request(optionsmerge, function (error, response, body) {
                if (error) {
                    if (callback) callback(error);
                    return;
                }
                console.log('Carts merged.');
                req.session.customerId = custId;
                if (callback) callback(null, userdata);
            });
        }

        async.waterfall([
            getUserInfo,
            getUserByName,
            registerUser,
            cartMerge
            ],
            function (err, userdata) {
                console.log("Calling function 3");
                if (err) {
                    console.log("Error with log in: ", err);
                    res.status(500);
                    res.end();
                    return;
                }
                res.status(200);
                res.cookie(cookie_name, req.session.id);
                res.cookie(full_name, userdata.name);
                res.redirect('/');
            }
        );        
    }
        
    app.get("/cards/:id", function (req, res, next) {
        helpers.simpleHttpRequest(endpoints.cardsUrl + "/" + req.params.id, res, next);
    });

    app.get("/customers", function (req, res, next) {
        helpers.simpleHttpRequest(endpoints.customersUrl, res, next);
    });
    app.get("/addresses", function (req, res, next) {
        helpers.simpleHttpRequest(endpoints.addressUrl, res, next);
    });
    app.get("/cards", function (req, res, next) {
        helpers.simpleHttpRequest(endpoints.cardsUrl, res, next);
    });

    // Create Customer - TO BE USED FOR TESTING ONLY (for now)
    app.post("/customers", function (req, res, next) {
        var options = {
            uri: endpoints.customersUrl,
            method: 'POST',
            json: true,
            body: req.body
        };

        console.log("Posting Customer: " + JSON.stringify(req.body));

        request(options, function (error, response, body) {
            if (error) {
                return next(error);
            }
            helpers.respondSuccessBody(res, JSON.stringify(body));
        }.bind({
            res: res
        }));
    });

    app.post("/addresses", function (req, res, next) {
        req.body.userID = helpers.getCustomerId(req, app.get("env"));

        var options = {
            uri: endpoints.addressUrl,
            method: 'POST',
            json: true,
            body: req.body
        };
        console.log("Posting Address: " + JSON.stringify(req.body));
        request(options, function (error, response, body) {
            if (error) {
                return next(error);
            }
            helpers.respondSuccessBody(res, JSON.stringify(body));
        }.bind({
            res: res
        }));
    });

    app.get("/card", function (req, res, next) {
        var custId = helpers.getCustomerId(req, app.get("env"));
        var options = {
            uri: endpoints.customersUrl + '/' + custId + '/cards',
            method: 'GET',
        };
        request(options, function (error, response, body) {
            if (error) {
                return next(error);
            }
            var data = JSON.parse(body);
            if (data.status_code !== 500 && data._embedded.card.length !== 0) {
                var resp = {
                    "number": data._embedded.card[0].longNum.slice(-4)
                };
                return helpers.respondSuccessBody(res, JSON.stringify(resp));
            }
            return helpers.respondSuccessBody(res, JSON.stringify({ "status_code": 500 }));
        }.bind({
            res: res
        }));
    });

    app.get("/address", function (req, res, next) {
        var custId = helpers.getCustomerId(req, app.get("env"));
        var options = {
            uri: endpoints.customersUrl + '/' + custId + '/addresses',
            method: 'GET',
        };
        request(options, function (error, response, body) {
            if (error) {
                return next(error);
            }
            var data = JSON.parse(body);
            if (data.status_code !== 500 && data._embedded.address.length !== 0) {
                var resp = data._embedded.address[0];
                return helpers.respondSuccessBody(res, JSON.stringify(resp));
            }
            return helpers.respondSuccessBody(res, JSON.stringify({ "status_code": 500 }));
        }.bind({
            res: res
        }));
    });

    app.post("/cards", function (req, res, next) {
        req.body.userID = helpers.getCustomerId(req, app.get("env"));

        var options = {
            uri: endpoints.cardsUrl,
            method: 'POST',
            json: true,
            body: req.body
        };
        console.log("Posting Card: " + JSON.stringify(req.body));
        request(options, function (error, response, body) {
            if (error) {
                return next(error);
            }
            helpers.respondSuccessBody(res, JSON.stringify(body));
        }.bind({
            res: res
        }));
    });

    // Delete Customer - TO BE USED FOR TESTING ONLY (for now)
    app.delete("/customers/:id", function (req, res, next) {
        console.log("Deleting Customer " + req.params.id);
        var options = {
            uri: endpoints.customersUrl + "/" + req.params.id,
            method: 'DELETE'
        };
        request(options, function (error, response, body) {
            if (error) {
                return next(error);
            }
            helpers.respondSuccessBody(res, JSON.stringify(body));
        }.bind({
            res: res
        }));
    });

    // Delete Address - TO BE USED FOR TESTING ONLY (for now)
    app.delete("/addresses/:id", function (req, res, next) {
        console.log("Deleting Address " + req.params.id);
        var options = {
            uri: endpoints.addressUrl + "/" + req.params.id,
            method: 'DELETE'
        };
        request(options, function (error, response, body) {
            if (error) {
                return next(error);
            }
            helpers.respondSuccessBody(res, JSON.stringify(body));
        }.bind({
            res: res
        }));
    });

    // Delete Card - TO BE USED FOR TESTING ONLY (for now)
    app.delete("/cards/:id", function (req, res, next) {
        console.log("Deleting Card " + req.params.id);
        var options = {
            uri: endpoints.cardsUrl + "/" + req.params.id,
            method: 'DELETE'
        };
        request(options, function (error, response, body) {
            if (error) {
                return next(error);
            }
            helpers.respondSuccessBody(res, JSON.stringify(body));
        }.bind({
            res: res
        }));
    });

    app.post("/register", function (req, res, next) {
        var options = {
            uri: endpoints.registerUrl,
            method: 'POST',
            json: true,
            body: req.body
        };

        console.log("Posting Customer: " + JSON.stringify(req.body));

        async.waterfall([
            function (callback) {
                request(options, function (error, response, body) {
                    if (error !== null) {
                        callback(error);
                        return;
                    }
                    if (response.statusCode == 200 && body != null && body != "") {
                        if (body.error) {
                            callback(body.error);
                            return;
                        }
                        console.log(body);
                        var customerId = body.id;
                        console.log(customerId);
                        req.session.customerId = customerId;
                        callback(null, customerId);
                        return;
                    }
                    console.log(response.statusCode);
                    callback(true);
                });
            },
            function (custId, callback) {
                var sessionId = req.session.id;
                console.log("Merging carts for customer id: " + custId + " and session id: " + sessionId);

                var options = {
                    uri: endpoints.cartsUrl + "/" + custId + "/merge" + "?sessionId=" + sessionId,
                    method: 'GET'
                };
                request(options, function (error, response, body) {
                    if (error) {
                        if (callback) callback(error);
                        return;
                    }
                    console.log('Carts merged.');
                    if (callback) callback(null, custId);
                });
            }
        ],
            function (err, custId) {
                if (err) {
                    console.log("Error with log in: " + err);
                    res.status(500);
                    res.end();
                    return;
                }
                console.log("set cookie" + custId);
                res.status(200);
                res.cookie(cookie_name, req.session.id, {
                    maxAge: 3600000
                }).send({ id: custId });
                console.log("Sent cookies.");
                res.end();
                return;
            }
        );
    });

    module.exports = app;
}());
