// Imports
const { lookForMysql } = require('./helpers/db/mysql/transactions');
const moment = require('moment-timezone');
require('./utils/String.prototype.formatDate');
const axios = require("axios");

const { TimeZone } = require('./constants')
const { DEV_SUPP_API_URI, DEV_SUPP_CALCUATE_TO_COMPLIANCE_ENDPOINT, ACCESS_KEY } = process.env


const getChunks = owners => {
  let chunks = [];

  /**
   * **Chunck Detail**
   * {
   *  owners: [], **Array, Owners to send**
   *  amount: 0 **Number, Total Owners in chunk**
   * }
   *  */

  owners.forEach(_owner => {
    if (chunks.length === 0) {
      chunks.push({
        owners: [],
        amount: 0
      });
    }

    let added = chunks.map(chunk => {
      if (
        chunk.amount < 1000
      ) {
        chunk.owners.push(_owner);
        chunk.amount++;
        return true;
      }
      return false;
    });
    if (!added.includes(true)) {
      chunks.push({
        owners: [_owner],
        amount: 1
      });
    }
  });
  const returnChunks = chunks.map(chunk => chunk.owners);
  return returnChunks;
};

const generateComplianceEvent = async ({ owners }) => {
  const response = await axios.post(
    `${DEV_SUPP_API_URI}/${DEV_SUPP_CALCUATE_TO_COMPLIANCE_ENDPOINT}`,
    {
      came_from: 'Marketing-Report-Fix',
      owners
    },
    {
      headers: {
        Authorization: `Basic ${ACCESS_KEY}`
      }
    });
  return response.data
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports.loop = async () => {
  try {
    let promises = [];
    /**
    *  Making moment works with the message default timezone 
    * (In this case means that the dates will has the Oracle Database default timezone)
    * 
    * Ref: https://momentjs.com/timezone/docs/#/using-timezones/default-timezone/
    * 
    * Function: moment.tz.setDefault(String);
    * @param { String | null } TimeZone
    */
    moment.tz.setDefault(TimeZone);

    const mysqlEvents = await lookForMysql();
    const _Owners = getChunks(mysqlEvents.map(mysqlEvent => {
      return mysqlEvent.id_owner
    }));

    for (const _ownersToSend of _Owners) {
      delay(10000);
      promises.push(generateComplianceEvent({ owners: _ownersToSend.join(',') }))
    }

    Promise.all(promises).then(values => {
      console.log(values);
    }).catch(error => {
      console.error(error.message)
    });

  } catch (error) {
    console.log(error)
    // it's commented because this can cause to fill fake logs in ELK
    //console.error(error);
  }

  return;
};
