
const SHARINGID = null;

const superagent = require('superagent');
if (! process.env.GANDI_API_TOKEN) {
  throw new Error('Missing environement var GANDI_API_TOKEN');
}
const API_KEY = process.env.GANDI_API_TOKEN;

// only set shqring_id query param if defined
const query = SHARINGID ? { sharing_id: SHARINGID } : {};

// For some unkown reasons creating new entry was not working with GANDI 
// This code can only update entries

async function update (domain, name, values, type = 'TXT', ttl = 300) {
  const endPoint = 'https://api.gandi.net/v5/livedns/domains/' + domain + '/records/' + name + '/' + type;
  console.log('GANDI > ' + name + ' = ' + values + ' -- type: ' + type + ' ttl: ' + ttl);
  try {
    const res = await superagent.put(endPoint)
      .query(query)
      .set('Authorization', 'Bearer ' + API_KEY)
      .send({ rrset_ttl: ttl, rrset_values: values });

    console.log(res.body);
  } catch (e) {
    throw new Error('Error updating Gandi: ' +  e.message + '  '+  e.response?.text);
  }
}

module.exports = {
  update
};
