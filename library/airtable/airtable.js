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
            return thisTable.find(find, function(err, record) {
                if (err) { console.error(err); return; }
                console.log('Retrieved', record.id);
                return record
            });
        } else { // Do default full listing of records if 'find' is not given for specific record
            //const result = {}
            return thisTable.select({
                // Selecting the first 3 records in Grid view:
                maxRecords: 3,
                view: "Grid view"
            }).firstPage();
            // .eachPage(function page(records, fetchNextPage) {
            //     // This function (`page`) will get called for each page of records.
            //     /*
            //     let i = 0;
            //     records.forEach(function(record) {
            //         let newitem = {}
            //         newitem.id = record.id
            //         newitem.fields = record.fields
            //         result[i] = newitem
            //         i++
            //         //console.log('Retrieved', record.get('UserName'));
            //     });

            //     */

            //     // To fetch the next page of records, call `fetchNextPage`.
            //     // If there are more records, `page` will get called again.
            //     // If there are no more records, `done` will get called.
            //     fetchNextPage()
            //     //console.log(result)
            // }, function done(err) {
            //     if (err) { console.error(err); return; }
            // });
            //console.log(result)
            //return result
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