/**
 * Created by AliReza on 5/10/2016.
 */
const sqlite3 = require('sqlite3');
const fs = require('fs');
class DBExtend extends sqlite3.Database {
    constructor(dbname, ddl, callback) {
        super(dbname,
            (err) => {
                if (err) {
                    callback('could not create database err : ' + err);
                } else {
                    if (ddl != null) {
                        this.exec(ddl, function (err) {
                            if (err) {
                                callback(null, 'create tables error with : ' + err);
                            } else {
                                callback(this);
                            }
                        });
                    } else {
                        this.run("PRAGMA foreign_keys = ON");
                        callback(this);
                    }
                }
            }
        );
        this.pRun = function (sql, param) {
            return new Promise((resolve, reject) => {
                this.run(sql, param, function(err){
                    if (err) {
                        reject(err);
                    } else {
                        resolve({changes: this.changes, lastID: this.lastID});
                    }
                });
            });
        };
        this.pGet = function (sql, param) {
            return new Promise((resolve, reject) => {
                this.get(sql, param, function(err, row) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            });
        };
        this.pAll = function (sql, param) {
            return new Promise((resolve, reject) => {
                this.all(sql, param, function(err, rows){
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });
        };
        this.getRecord = function (tblName, data) {
            return new Promise((resolve, reject) => {
                var where = '';
                var param = [];
                for (var key of Object.keys(data)) {
                    if (where.length > 0) {
                        where += ' AND ';
                    }
                    where += key + ' = ?';
                    param.push(data[key]);
                }
                if (where.length > 0 ) {
                    this.get(`SELECT * FROM ${tblName} WHERE ${where}`, param, function (err, row) {
                        if (err) {
                            reject('getRecord failed with : ' + err);
                        } else {
                            resolve(row);
                        }
                    });
                } else {
                    this.get(`SELECT * FROM ${tblName}`, param, function (err, row) {
                        if (err) {
                            reject('getRecord failed with : ' + err);
                        } else {
                            resolve(row);
                        }
                    });
                }
            });
        };
        this.matchRecords = function (tblName, data) {
            return new Promise((resolve, reject) => {
                var where = '';
                for (var key of Object.keys(data)) {
                    if (where.length > 0) {
                        where += ' AND ';
                    }
                    where += key + ` LIKE '%${data[key]}%'`;
                }
                this.all(`SELECT * FROM ${tblName} WHERE ${where}`, [], function (err, rows) {
                    if (err) {
                       reject('matchRecords failed with : ' + err);
                    } else {
                       resolve(rows);
                    }
                });
            });
        };
        this.deleteRecords = function (tblName, clm, data) {
            return new Promise((resolve, reject) => {
                var jdata = JSON.stringify(data);
                this.run(`DELETE FROM ${tblName} WHERE ${clm} IN (${jdata.substr(1, jdata.length - 2)})`, function (err) {
                    if (err) {
                        reject('deleteRecords failed with : ' + err);
                    } else {
                        resolve();
                    }
                });
            });
        };
    }
}

module.exports = function (dbname, ddl, callback) {
    if (!ddl) {
        if (!fs.existsSync(dbname)) {
            callback(dbname + ' not exists!');
            return {};
        }
    } else {
        if (fs.existsSync(dbname)) {
            callback(dbname + ' exists!');
            return {};
        }
    }
    return (new DBExtend(dbname, ddl, callback));
};
