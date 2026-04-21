const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

console.log("Loading excel file...");
const workbook = xlsx.readFile(path.join(__dirname, '../ml/churn.xlsx'));
const sheetName = workbook.SheetNames[0];
const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

console.log("Parsing " + data.length + " rows.");

const formatted = data.map(row => {
    return {
        id: row.CustomerID || Math.random().toString(36).substring(7),
        tenure: row['Tenure Months'] || 0,
        spend: row['Monthly Charges'] || 0,
        total: typeof row['Total Charges'] === 'number' ? row['Total Charges'] : 0,
        churn: row['Churn Value'] || 0,
        name: 'Customer ' + (row.CustomerID ? row.CustomerID.substring(0,4) : Math.floor(Math.random()*1000)),
        city: row.City || 'Unknown',
        state: row.State || 'Unknown',
        contract: row.Contract || 'Unknown',
        payment: row['Payment Method'] || 'Unknown',
        cltv: row.CLTV || 0,
        churnReason: row['Churn Reason'] || null,
        email: row.Email || row.email || row['E-mail'] || null
    }
});

fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(formatted, null, 2));
console.log("Done extracting data to data.json");
