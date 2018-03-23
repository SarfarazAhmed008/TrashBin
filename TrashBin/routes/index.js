var express = require('express');
var firebase = require('firebase');

var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    if (req.session.userId) {
        res.redirect('/home/' + req.session.userName + '/bins');
    }
    res.render('index', { title: 'Trash Bin' });
});

router.get('/login', function(req, res, next) {
    if (req.session.userId) {
        res.redirect('/home/' + req.session.userName + '/bins');
    }
    res.render('login');
});

router.post('/login', function(req, res, next) {
    var email = req.body.email;
    var password = req.body.password;

    var database = firebase.database();
    var usersRef = database.ref('/users/');

    usersRef.orderByChild('email').equalTo(email).once('value').then(function(snapshot) {
        var user = snapshot.val();

        if (user) {
            var userKey = Object.keys(user)[0];
            var userEmail = user[userKey].email;
            var userPassword = user[userKey].password;

            if (userPassword == password) {
                var firstName = user[userKey].firstName;
                var lastName = user[userKey].lastName;
                var userName = firstName.toLowerCase() + '-' + lastName.toLowerCase();

                req.session.userId = userKey;
                req.session.userName = userName;

                res.redirect('/home/' + userName + '/bins');
            } else {
                res.redirect('/login');
            }
        } else {
            throw 'User not found!';
            res.redirect('/login');
        }
    }).catch(function(error) { console.log(error) });
});

router.get('/signup', function(req, res, next) {
    if (req.session.userId) {
        res.redirect('/home/' + req.session.userName + '/bins');
    }
    res.render('signup');
});

router.post('/signup', function(req, res, next) {
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var email = req.body.email;
    var password = req.body.password;
    var confirmPassword = req.body.confirmPassword;

    var user = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: password,
        role: "guest"
    }

    var database = firebase.database();
    var usersRef = database.ref('/users/');

    usersRef.push(user).catch(function(error) { console.log(error); });
    res.redirect('/login');
});

router.get('/home/:userName/bins', function(req, res, next) {
    if (!req.session.userName && !req.session.userId) {
        res.redirect('/');
    }
    var database = firebase.database();
    var userId = req.session.userId;
    var binsRef = database.ref('/Bins/');

    binsRef.orderByChild('user').equalTo(userId).once('value').then(function(snapshot){
        var bins = snapshot.val();
        if (!bins) {
            bins = {};
        }
        res.render('home', { bins: bins, userName: req.session.userName });
    });
});

router.post('/home/:userName/bins', function(req, res, next) {
    var binId = req.body.binId;
    var binPassword = req.body.binPassword;
    var userId = req.session.userId;
    var userName = req.session.userName;

    var database = firebase.database();
    var binsRef = database.ref('/Bins/');

    binsRef.once('value').then(function(snapshot) {
        var bins = snapshot.val();
        if (!bins) {
            bins = {};
        }
        var binIds = Object.keys(bins);
        var binIdIndex = binIds.indexOf(binId);
        if (binIdIndex != -1) {
            var userBinId = binIds[binIdIndex];
            var binIdRef = database.ref('/Bins/' + userBinId);
            binIdRef.orderByKey().limitToFirst(1).once('value').then(function(snapshot) {
                var firstBin = snapshot.val();
                if (!firstBin) {
                    bins = {};
                } else {
                    var key = Object.keys(firstBin)[0];
                    var password = firstBin[key].password;
                    var userBinsRef = database.ref('/Bins/' + userBinId + '/user/');
                    if (password == binPassword) {
                        userBinsRef.set(userId).catch(function(error) { console.log(error); });
                        res.redirect('/home/' + userName + '/bins');
                    } else {
                        console.log("No Bin Found!");
                    }
                }
            });
        }
    });
});

router.get('/home/:userName/bins/:binId', function(req, res, next) {
    if (!req.session.userId) {
        res.redirect('/');
    }
    var database = firebase.database();
    var binId = req.params.binId;
    var binInfoRef = database.ref('Bins/' + binId);

    binInfoRef.once('value').then(function(snapshot) {
        var binInfos = snapshot.val();
        if (!binInfos) {
            binInfos = {};
        }

        delete binInfos['user'];
        console.log(binInfos);

        var keys = Object.keys(binInfos);
        var data = [];

        keys.forEach(function(key) {
            var time = new Date(binInfos[key].timestamp);
            var options = {
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: true
            };
            var timeString = time.toLocaleString('en-US');
            //var timeString = time.toLocaleString('en-US', options);
            var binSize = parseFloat(binInfos[key].binsize);
            var distance = parseFloat(binInfos[key].distance);
            var waste = parseFloat(binInfos[key].waste);
            var percentage = parseFloat(binInfos[key].percent);
            var latitude = parseFloat(binInfos[key].latitude);
            var longitude = parseFloat(binInfos[key].longitude);
            data.push({ time: timeString, percentage: percentage, distance: distance, waste: waste, size: binSize, 
                                                                        latitude: latitude, longitude: longitude });
        });

        res.render('bininfo', { userId: req.session.userId, userName: req.session.userName, binId: req.params.binId, data: data });
    }).catch(function(error) { console.log(error) });
});

router.get('/admin', function(req, res, next) {
    res.render('admin');
});

router.get('/admin/login', function(req, res, next) {
    res.render('adminLogin');
});

router.post('/admin/login', function(req, res, next) {
    var email = req.body.email;
    var password =  req.body.password;

    var database = firebase.database();
    var usersRef = database.ref('/users/');

    usersRef.orderByChild('email').equalTo(email).once('value').then(function(snapshot) {
        var user = snapshot.val();

        if (user) {
            var userKey = Object.keys(user)[0];
            var userEmail = user[userKey].email;
            var userPassword = user[userKey].password;
            var userRole = user[userKey].role;

            if (userPassword == password && userRole == "admin") {
                var firstName = user[userKey].firstName;
                var lastName = user[userKey].lastName;
                var userName = firstName.toLowerCase() + '-' + lastName.toLowerCase();

                req.session.userId = userKey;
                req.session.userName = userName;
                req.session.role = userRole;

                res.redirect('/admin/home');
            } else {
                res.redirect('/admin/login');
            }
        } else {
            throw 'User not found!';
            res.redirect('/login');
        }
    }).catch(function(error) { console.log(error) });
});

router.get('/admin/home', function(req, res, next) {
    if (!req.session.userId) {
        res.redirect('/');
    }
    var database = firebase.database();
    var usersRef = database.ref('/users/');

    usersRef.once('value').then(function(snapshot) {
        var users = snapshot.val();
        if (!users) {
            users = {};
        }
        res.render('adminHome', { users: users });
        console.log(users);
    }).catch(function(error) { console.log(error) });
});

router.get('/admin/:userId', function(req, res, next) {
    if (!req.session.userId) {
        res.redirect('/');
    }
    var userId = req.params.userId;
    var database = firebase.database();
    var binsRef = database.ref('/Bins/');

    binsRef.orderByChild('user').equalTo(userId).once('value').then(function(snapshot){
        var bins = snapshot.val();
        if (!bins) {
            bins = {};
        }
        res.render('adminUser', { bins: bins, userId: userId });
    });
});

router.post('/home/:userId', function(req, res, next) {
    var binId = req.body.binId;
    var binPassword = req.body.binPassword;
    var userId = req.params.userId;

    var database = firebase.database();
    var binsRef = database.ref('/Bins/');

    binsRef.once('value').then(function(snapshot) {
        var bins = snapshot.val();
        if (!bins) {
            bins = {};
        }
        var binIds = Object.keys(bins);
        var binIdIndex = binIds.indexOf(binId);
        if (binIdIndex != -1) {
            var userBinId = binIds[binIdIndex];
            var binIdRef = database.ref('/Bins/' + userBinId);
            binIdRef.orderByKey().limitToFirst(1).once('value').then(function(snapshot) {
                var firstBin = snapshot.val();
                if (!firstBin) {
                    bins = {};
                } else {
                    var key = Object.keys(firstBin)[0];
                    var password = firstBin[key].password;
                    var userBinsRef = database.ref('/Bins/' + userBinId + '/user/');
                    if (password == binPassword) {
                        userBinsRef.set(userId).catch(function(error) { console.log(error); });
                        res.redirect('/admin/' + userId);
                    } else {
                        console.log("No Bin Found!");
                    }
                }
            });
        }
    });
});

router.get('/admin/:userId/bins/:binId', function(req, res, next) {
    if (!req.session.userId) {
        res.redirect('/');
    }
    var database = firebase.database();
    var binId = req.params.binId;
    var binInfoRef = database.ref('Bins/' + binId);

    binInfoRef.once('value').then(function(snapshot) {
        var binInfos = snapshot.val();
        if (!binInfos) {
            binInfos = {};
        }

        delete binInfos['user'];

        var keys = Object.keys(binInfos);
        var data = [];

        keys.forEach(function(key) {
            var time = new Date(binInfos[key].timestamp);
            var options = {
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: true
            };
            var timeString = time.toLocaleString('en-US', options);
            var binSize = parseFloat(binInfos[key].binsize);
            var distance = parseFloat(binInfos[key].distance);
            var waste = parseFloat(binInfos[key].waste);
            var percentage = parseFloat(binInfos[key].percent);
            var latitude = parseFloat(binInfos[key].latitude);
            var longitude = parseFloat(binInfos[key].longitude);
            data.push({ time: timeString, percentage: percentage, distance: distance, waste: waste, size: binSize,
                                                                    latitude: latitude, longitude: longitude });
        });
        res.render('adminBininfo', { userId: req.params.userId, binId: req.params.binId, data: data });
    }).catch(function(error) { console.log(error) });
});

router.get('/logout', function(req, res, next) {
    req.session.userName = null;
    req.session.userId = null;
    res.redirect('/');
});

module.exports = router;
