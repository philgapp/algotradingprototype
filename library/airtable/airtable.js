// This is the primary class (model) for managing AirTable data, and uses all the files in the library/airtable dir
// TODO connect to airtable, build out

const Config = require('./airtable.config')
const AirDB = new Config()
const AirBase = AirDB.base('appI7GpgW9EUJz5mo') // This is the prototype development base only!

function connectTable(table) {
    if(table) {
        return AirBase(table)
    } else {
        return 'Table not found or given in connectTable()'
    }
}

export function retrieveRecords(table,find) {
    if(table) {
        let thisTable = connectTable(table)
        if(find) { // Retrieve a specific record
            thisTable.find(find, function(err, record) {
                if (err) { console.error(err); return; }
                console.log('Retrieved', record.id);
                return record
            });
        } else { // Do default full listing of records if 'find' is not given for specific record
            const result = new Array()
            thisTable.select({
                // Selecting the first 3 records in Grid view:
                maxRecords: 3,
                view: "Grid view"
            })
            .eachPage(function page(records, fetchNextPage) {
                // This function (`page`) will get called for each page of records.
                 records.forEach(function(record) {
                     let newitem = {'id':record.id,'fields':record.fields}
                     result.push(newitem)
                     //console.log('Retrieved', record.get('UserName'));
                 });

                 // To fetch the next page of records, call `fetchNextPage`.
                 // If there are more records, `page` will get called again.
                 // If there are no more records, `done` will get called.
                 fetchNextPage()
                 //console.log(result)
            }, function done(err) {
                 if (err) { console.error(err); return; }
            });
            //console.log(result)
            return new Promise((resolve, reject) => {
                result ? resolve(result) : reject('Error')
            })
        }
    } else {
        return 'Table not found or given in retrieveRecords()'
    }
}

export function updateRecords(find) {

}

export function writeRecords(find) {

}

export function deleteRecords(find) {

}