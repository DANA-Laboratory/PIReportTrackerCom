const sqlSelect = require('./select.js');
/*
  All basic insert codes will come here. Inserts are minimal means only mandatory (not null) fields will insert.
  each function will inserts one new row into only one table. No log here.
  for tables with relation if FOREIGN_KEY  is not an Integer, function trys to find an integer id for it.
  addTableName(db, data) inserts data into TableName
  all keys with a _ before contains internal data
  data._clms are column names
  data._ip ip value of remote computer
  data._user user account
  data._tbl table name
*/
function values(len) {
  var str = 'VALUES (';
  for (var i=1; i<len; i++) {
    str += '?, ';
  }
  str += '?)';
  return str;
}
const bcrypt = require('bcrypt-nodejs');

exports.insert = function (/*basedb*/ db, data, dataArray) {
  if (dataArray === undefined) {
    data._clms='(';
    for(var k in data) {
      if(data.hasOwnProperty(k) && k[0]!=='_'){
        dataArray.push(data[k]);
        data._clms += k + ',';
      }
    }
    data._clms[data._clms.length-1]=')';
  }
  return db.pRun(`INSERT INTO ${data._tbl} ${data._clms} ${values(data._clmc)};`, dataArray);
};

exports.insertjson = function (/*basedb*/ db, data) {
  data._clms = '(';
  data._vals = '(';
  for (var k in data) {
      if (data.hasOwnProperty(k) && k[0]!=='_') {
          data._clms += k + ',';
          data._vals += "'" + data[k] + "'" + ',';
      }
  }
  data._clms = data._clms.substr(0, data._clms.length-1) + ')';
  data._vals = data._vals.substr(0, data._vals.length-1) + ')';
  return db.pRun(`INSERT INTO ${data._tbl} ${data._clms} VALUES${data._vals};`);
};

exports.addUser = function (/*basedb*/ db, data) {
    return exports.insert(db, data, [data.account, bcrypt.hashSync(data.password), data.fname, data.lname, data.pcode, data.workunit, data.sysadmin, data.github, data.telegram]);
};

exports.addReportClass = function (/*basedb*/ db, data) {
    return new Promise((resolve, reject) => {
        var p = (Number.isInteger(data.user_owner) ? Promise.resolve(data.user_owner) : sqlSelect.idfordata(db, {_tbl:'tblUser', _where: 'account', account:data.user_owner}));
        p.then((owner_id)=>{
          exports.insert(db, data, [data.caption, data.duration, owner_id, data.caption_cat_1, data.caption_cat_2, data.caption_cat_3, data.caption_variable]).then(resolve);
        }).catch((err)=>{
          reject('addReportClass() fails to find owner ' + err);
        });
    });
};

exports.addVariableCat_1 = function (/*basedb*/ db, data) {
    return db.pRun(`INSERT INTO ${data._tbl} ${data._clms} ${values(data._clmc)};`, [data.caption, data.code, data.weight]);
};

exports.addVariableCat_2 = function (/*basedb*/ db, data) {
  return new Promise((resolve, reject) => {
      var p = (Number.isInteger(data.variablecat_1_id)) ? Promise.resolve(data.variablecat_1_id) : sqlSelect.idfordata(db, {_tbl:'tblVariableCat_1', _where: 'caption', caption:data.variablecat_1_id});
      p.then((VariableCat_1_id)=>{
        exports.insert(db, data, [data.caption, data.code, VariableCat_1_id, data.weight]).then(resolve);
      }).catch((err)=>{
        reject('addVariableCat_2() fails with: ' + err);
      });
  });
};

exports.addVariableCat_3 = function (/*basedb*/ db, data) {
  return new Promise((resolve, reject) => {
      var p = (Number.isInteger(data.variablecat_2_id)) ? Promise.resolve(data.variablecat_2_id) : sqlSelect.idfordata(db, {_tbl:'tblVariableCat_2', _where: 'caption', caption:data.variablecat_2_id});
      p.then((VariableCat_2_id)=>{
          exports.insert(db, data, [data.caption, data.code, VariableCat_2_id, data.weight]).then(resolve);
      }).catch((err)=>{
          reject('addVariableCat_3() fails to fined related records with: ' + err);
      });
  });
};

exports.addVariableDef = function (/*basedb*/ db, data) {
  return new Promise((resolve, reject) => {
    var p1 = (Number.isInteger(data.user_owner) ? Promise.resolve(data.user_owner) : sqlSelect.idfordata(db, {_tbl:'tblUser', _where: 'account', account:data.user_owner}));
    var p2 = (Number.isInteger(data.user_provider) ? Promise.resolve(data.user_provider) : sqlSelect.idfordata(db, {_tbl:'tblUser', _where: 'account', account:data.user_provider}));
    var p3 = (Number.isInteger(data.user_reviewer) ? Promise.resolve(data.user_reviewer) : sqlSelect.idfordata(db, {_tbl:'tblUser', _where: 'account', account:data.user_reviewer}));
    Promise.all([p1, p2, p3]).then(([user_owner, user_provider, user_reviewer])=>{
        db.pRun(`INSERT INTO ${data._tbl} ${data._clms} ${values(data._clmc)};`, [data.unit, data.caption, data.code, user_provider, user_owner, user_reviewer])
        .then(resolve);
    }).catch((err)=>{
        reject('addVariableDef() fails (related records?) with: ' + err);
    });
  });
};

exports.addReportClassVariable = function (/*basedb*/ db, data) {
  return new Promise((resolve, reject) => {
      var p1 = (Number.isInteger(data.variabledef_id)) ? Promise.resolve(data.variabledef_id) : sqlSelect.idfordata(db, {_tbl:'tblVariableDef', _where:'caption', caption:data.variabledef_id});
      var p2 = (Number.isInteger(data.reportclass_id)) ? Promise.resolve(data.reportclass_id) : sqlSelect.idfordata(db, {_tbl:'tblReportClass', _where:'caption', caption:data.reportclass_id});
      Promise.all([p1, p2]).then(([variabledef_id, reportclass_id])=>{
          exports.insert(db, data, [reportclass_id, variabledef_id, data.weight]).then(resolve);
      }).catch((err)=>{
          reject('addReportClassVariable() fails (related records?) with: ' + err);
      });
  });
};

exports.createReport = function (/*basedb*/ db, data) {
    return new Promise((resolve, reject) => {
        db.pRun(`INSERT INTO tblReport(caption, title, time_limit, user_owner, user_creator, ip_user, time_create, time_reference) SELECT tblReportClass.caption, '${data.title}', ${data.time_limit}, tblReportClass.user_owner, ${data.user_creator}, '${data.ip_user}', ${data.time_create}, ${data.time_reference} FROM tblReportClass WHERE tblReportClass.id=${data.id}`)
        .then((newreport)=>{
            db.pRun(`INSERT INTO tblVariable(unit, caption, code, user_provider, user_owner, user_reviewer, time_reference, limit_lower, limit_upper) SELECT tblVariableDef.unit, tblVariableDef.caption, tblVariableDef.code, tblVariableDef.user_provider, tblVariableDef.user_owner, tblVariableDef.user_reviewer, ${data.time_reference}, tblVariableDef.limit_lower, tblVariableDef.limit_upper FROM tblVariableDef INNER JOIN tblReportClassVariable ON tblReportClassVariable.variabledef_id = tblVariableDef.id WHERE tblReportClassVariable.reportclass_id = ${data.id}`)
            .then(()=>{
                db.pRun(`INSERT INTO tblReportVariable(report_id, variable_id, variablecat_3_id, weight) SELECT ${newreport.lastID}, tblVariable.id, variablecat_3_id, weight FROM tblReportClassVariable INNER JOIN tblVariableDef ON tblVariableDef.id = tblReportClassVariable.variabledef_id INNER JOIN tblVariable ON tblVariableDef.code = tblVariable.code  WHERE reportclass_id = ${data.id} AND time_reference = ${data.time_reference}`)
                .then(()=>{
                    resolve(newreport);
                });
            })
        });
    });
};

exports.addVariable = function (/*basedb*/ db, data) {
    return exports.insert(db, data, [data.piclass_id, data.report_id, data.unit, data.caption, data.user_provider, data.user_owner, data.user_reviewer, data.attribute]);
};

//exports.addReportVariable = function (/*basedb*/ db, data) {
//    //TODO
//};

exports.addAttachment = function (/*basedb*/ db, data) {
    return exports.insert(db, data, [data.report_id, data.pathfile, data.user_attach, data.ip_user, data.time_attach, data.attribute]);
};

exports.addValue = function (/*basedb*/ db, data) {
    return exports.insert(db, data, [data.pi_id, data.value, data.time_update, data.user_update, data.ip_user , data.attribute]);
};

exports.addTarget = function (/*basedb*/ db, data) {
    return exports.insert(db, data, [data.pi_id, data.value, data.time_target, data.time_update, data.user_update , data.ip_user, data.attribute]);
};

exports.addMessage = function (/*basedb*/ db, data) {
    return exports.insert(db, data, [data.textmessage, data.time_message, data.ip_sender, data.user_sender, data.user_reciever, data.pi_id, data.time_read, data.attribute]);
};
