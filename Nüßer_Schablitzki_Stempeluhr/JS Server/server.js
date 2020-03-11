const hostname = '127.0.0.1';
const port = 3000;

const express = require('express');
const app = express();

const mysql = require('mysql');
const sql = require("mssql/msnodesqlv8");

app.set('view engine', 'ejs');

var http = require('http').createServer(app);
var io = require('socket.io')(http);

var list = [];

/*var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "nfc_login"
});
*/
const con = new sql.ConnectionPool({
	database: "bdedaten",
	server: "windowsdb",
	driver: "msnodesqlv8",
	options: {
	  trustedConnection: true
	}
});

http.listen(port, () => {
	console.log(`Express running → PORT ${http.address().port}`);
  });

con.connect();

app.get('/', function(req, res) {  
	res.render('index');
});

io.on('connection', function (socket) { //Wird ausgeführt sobald ein socket sich verbindet
	console.log("Socket connect");

	socket.on('nfc', function(data) { //Daten die vom Python Programm geschickt werden
		console.log(data);
		for(var i = 0; i < list.length; i++){ //NFC Daten werden an alle Webseiten geschickt, die die gleiche IP haben, wie der Socket der die Daten geschickt hat
			if(socket.handshake.address == list[i].adresse){
				list[i].socket.emit('daten', data);
			}
		}
	});

	socket.on('website', function() { //Socket ist eine webseite und wird in eine Liste eingetragen
		list.push({'adresse': socket.handshake.address, 'socket': socket});
	});

	socket.on('readMysql', function(nfcdaten){
		var sql = "SELECT * FROM Personal WHERE PIN = '"+ nfcdaten +"';";
		con.query(sql, function (err, result) {
			if (err) {
				throw err;
			} else {
				for(var i = 0; i < list.length; i++){ //NFC Daten werden an alle Webseiten geschickt, die die gleiche IP haben, wie der Socket der die Daten geschickt hat
					if(socket.handshake.address == list[i].adresse){
						list[i].socket.emit('mySql', result.recordset);
					}
				}
			}
		});
	});

	socket.on('kommen', function(mitarbeiter_id){
		var datum = new Date();
		var jahr = datum.getFullYear().toString();
		var monat = datum.getMonth() + 1;
		var tag = datum.getDate();
		var stunden = datum.getHours();
		var minuten = datum.getMinutes();
		var sekunden = datum.getSeconds();
		var date;
		var Buchungsnummer = null;
		var sql ="INSERT INTO Buchungen (Personalnummer, Buchungstyp, Datum, Uhrzeit) VALUES ("+ mitarbeiter_id +",'Kommt','" + jahr.toString() + "-" + tag.toString() + "-" + monat.toString() + "','" + stunden.toString() + ":" + minuten.toString() + ":" + sekunden.toString() + "');";
		con.query(sql, function (err, result) {
			if (err) {
				throw err;
			} else {
				var sql ="SELECT * FROM Buchungen WHERE Personalnummer =" + mitarbeiter_id + " AND Buchungstyp ='Kommt';";
				con.query(sql, function (err, result) {
					if (err) {
						throw err;
					} else {
						for(var i = 0; i < result.recordset.length; i++){ //Immer die letzte eingetragene Buchungsnummer mitgeben
							if(result.recordset[i].Buchungsnummer > Buchungsnummer){
								Buchungsnummer = result.recordset[i].Buchungsnummer -2;
								date = result.recordset[i].Datum;
							}
						};

						var sql ="SELECT * FROM Buchungen WHERE BuchungRef =" + Buchungsnummer + " AND Buchungstyp ='Geht';";
						con.query(sql, function (err, res) {
							if (err) {
								throw err;
							} else {
								if(res.recordset.length == 0){
									socket.emit('fehlenderEintrag', date);
								}
							}
						});
					}
				});
			}
		});
	});

	socket.on('gehen', function(mitarbeiter_id){
		var datum = new Date();
		var jahr = datum.getFullYear().toString();
		var monat = datum.getMonth() + 1;
		var tag = datum.getDate();
		var stunden = datum.getHours();
		var minuten = datum.getMinutes();
		var sekunden = datum.getSeconds();
		var Buchungsnummer = null;

		var sql ="SELECT Buchungsnummer FROM Buchungen WHERE Personalnummer =" + mitarbeiter_id + " AND Buchungstyp ='Kommt';";
		con.query(sql, function (err, result) {
			if (err) {
				throw err;
			} else {
				for(var i = 0; i < result.recordset.length; i++){ //Immer die letzte eingetragene Buchungsnummer mitgeben
					if(result.recordset[i].Buchungsnummer > Buchungsnummer){
						Buchungsnummer = result.recordset[i].Buchungsnummer;
					}
				};

				var sql ="SELECT * FROM Buchungen WHERE BuchungRef =" + Buchungsnummer + " AND Buchungstyp ='Geht';";
				con.query(sql, function (err, res) {
					if (err) {
						throw err;
					} else {
						if(res.recordset.length != 0){
							Buchungsnummer = null;
							socket.emit('fehlenderEintrag', null);
						}

						var sql ="INSERT INTO Buchungen (Personalnummer, Buchungstyp, BuchungRef, Datum, Uhrzeit) VALUES ("+ mitarbeiter_id +",'Geht'," + Buchungsnummer + ",'" + jahr.toString() + "-" + tag.toString() + "-" + monat.toString() + "','" + stunden.toString() + ":" + minuten.toString() + ":" + sekunden.toString() + "');";
						con.query(sql, function (err, result) {
							if (err) {
								throw err;
							} else {
							}
						});
					}
				});
			}
		});
	});

	socket.on('status', function(mitarbeiter_id){
		var datum = new Date();
		var jahr = datum.getFullYear().toString();
		var monat = datum.getMonth() + 1;
		var tag = datum.getDate();

		var Buchungsnummer = null;
		var BuchungRef = null;
		var gekommen;
		var gegangen;

		var sql ="SELECT Buchungsnummer FROM Buchungen WHERE Personalnummer =" + mitarbeiter_id + " AND Buchungstyp ='Kommt';";
		con.query(sql, function (err, result) {
			if (err) {
				throw err;
			} else {
				for(var i = 0; i < result.recordset.length; i++){ //Immer die letzte eingetragene Buchungsnummer mitgeben
					if(result.recordset[i].Buchungsnummer > Buchungsnummer){
						Buchungsnummer = result.recordset[i].Buchungsnummer;
					}
				};

				var sql ="SELECT BuchungRef FROM Buchungen WHERE Personalnummer =" + mitarbeiter_id + " AND Buchungstyp ='Geht';";
				con.query(sql, function (err, referenzResult) {
					if (err) {
						throw err;
					} else {
						for(var i = 0; i < referenzResult.recordset.length; i++){ //Immer die letzte eingetragene Buchungsnummer mitgeben
							if(referenzResult.recordset[i].BuchungRef > BuchungRef){
								BuchungRef = referenzResult.recordset[i].BuchungRef;
							}
						};

						var sql = "SELECT * FROM Buchungen WHERE BuchungRef = " + BuchungRef + " AND Personalnummer = "+ mitarbeiter_id +" AND Buchungstyp ='Geht';";
						con.query(sql, function (err, result) {
							if (err) {
								throw err;
							} else {
								gegangen = result.recordset;
								var sql = "SELECT * FROM Buchungen WHERE Buchungsnummer = " + Buchungsnummer + " AND Personalnummer = " + mitarbeiter_id + " AND Buchungstyp ='Kommt';";
								con.query(sql, function (err, res) {
									if (err) {
										throw err;
									} else {
										gekommen = res.recordset;
										for(var i = 0; i < list.length; i++){ //NFC Daten werden an alle Webseiten geschickt, die die gleiche IP haben, wie der Socket der die Daten geschickt hat
											if(socket.handshake.address == list[i].adresse){
												list[i].socket.emit('status_daten', gekommen, gegangen);
											}
										}
									}
								});
							}
						});	
					}
				});
			}
		});
	});

	socket.on('personalnummer', function(personalnummer){
		var sql = "SELECT * FROM personal WHERE Personalnummer = '" + personalnummer +"';";
		con.query(sql, function (err, result) {
			if (err) {
				throw err;
			} else {
				for(var i = 0; i < list.length; i++){ //NFC Daten werden an alle Webseiten geschickt, die die gleiche IP haben, wie der Socket der die Daten geschickt hat
					if(socket.handshake.address == list[i].adresse){
						list[i].socket.emit('personalnummer_daten', result.recordset);
					}
				}
			}
		});
	});

});

io.on('disconnect', function(socket) { //Wird ausgeführt sobald ein socket seine Verbindung trennt

	for(var i = 0; i < list.length; i++){
		if(socket.handshake.address == list[i].adresse){
			list.splice(i,1);
		}
	}
})

	
