const fs = require('fs');
const handlebars = require('handlebars');
const handlebarsWax = require('handlebars-wax');
const moment = require('moment');

handlebars.registerHelper({
  removeProtocol: url => url.replace(/.*?:\/\//g, ''),
  concat: (...args) => args.filter(arg => typeof arg !== 'object').join(''),
  // Arguments: {address, city, subdivision, postalCode, countryCode}
  // formatAddress: (...args) => addressFormat(args).join(' '),
  formatAddress: (...args) => args.filter(arg => typeof arg !== 'object').join(' '),
  formatDate: date => moment(date).format('MMM YYYY'),
  lowercase: s => s.toLowerCase(),
  eq: (a, b) => a === b,
  split: s => s.split('\n'),
});

// Creates a string representation of the duration in a role in the format `1 yrs 10 mos'
function getDurationString(startDateString, endDateString) {
  const endDate = endDateString ? moment(endDateString) : moment();
  const delta = moment.duration(endDate.diff(startDateString));
  return `${delta.years()} yrs ${delta.months()} mos`;
}

// Groups by the specified key for presentation purposes
function groupByPosition(data, key) {
  let grouped = [];

  for (const item of data) {

    // Is this a company that we've seen before?
    if (!grouped[item[key]]) {
      grouped[item[key]] = {...item, positions: []};
    }
    
    // Calculate the duration in the role
    const durationInRole = getDurationString(item.startDate, item?.endDate);

    // Associate the role with the specified company
    grouped[item[key]].positions.push({...item, duration: durationInRole});

    // Update the cumulative start and end dates overall for the specific company, and calculate the overall duration
    grouped[item[key]].startDate = moment.min(moment(item.startDate), moment(grouped[item[key]].startDate)).format('YYYY-MM');
    if (item.endDate) {
      grouped[item[key]].endDate = moment.max(moment(item.endDate), moment(grouped[item[key]].endDate)).format('YYYY-MM');
    }
    grouped[item[key]].duration = getDurationString(grouped[item[key]].startDate, grouped[item[key]]?.endDate);
  }

  let retVal = [];
  for (const item in grouped) {
    retVal.push(grouped[item]);
  }
  
  return retVal;
}

function render(resume) {

  resume.work = groupByPosition(resume.work, "name");
  resume.volunteer = groupByPosition(resume.volunteer, "organization");

  const dir = `${__dirname}/src`;
  const css = fs.readFileSync(`${dir}/style.css`, 'utf-8');
  const resumeTemplate = fs.readFileSync(`${dir}/resume.hbs`, 'utf-8');

  const Handlebars = handlebarsWax(handlebars);

  Handlebars.partials(`${dir}/partials/**/*.{hbs,js}`);

  return Handlebars.compile(resumeTemplate)({
    style: `<style>${css}</style>`,
    resume,
  });
}

module.exports = {
  render,
};
