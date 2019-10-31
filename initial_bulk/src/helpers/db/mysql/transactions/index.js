const mysql = require('../index');

const lookForMysql = async () => {
   return await mysql.query(`select distinct id_owner from marketing_report where in_compliance_outdated = 1 and dt_updated < curdate() limit 10000`);
}

module.exports = {
   lookForMysql
}