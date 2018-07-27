var glob = require("glob");
var rp = require('request-promise-cache');
var R = require('ramda');
var fs = require('fs');
var fuzzy = require('fuzzy');
var open = require('opn');
const promptCheckboxPlus = require('inquirer-checkbox-plus-prompt');
const npmRun = require('npm-run');
var Spinner = require('cli-spinner').Spinner;

const pascalCase = (s) => s.replace(/\w+/g,
  function (w) { return w[0].toUpperCase() + w.slice(1).toLowerCase(); }).split(' ').join('');


module.exports = function (plop) {
  plop.setPrompt('checkboxPlus', promptCheckboxPlus);
  plop.setGenerator('project', {
    description: 'create a new project structure',
    prompts: [{
      type: 'input',
      name: 'projectName',
      message: 'What is the name of your project?',
      filter: pascalCase
    },{
      type: 'checkboxPlus',
      pageSize: 10,
      highlight: true,
      searchable: true,
      name: 'scopes',
      message: 'Which scopes do you want enabled?',
      source: function (answersSoFar, scope) {
        scope = scope || '';
        return new Promise(function (resolve) {
          getScopes().then(d => {
            const scopeList = R.uniq(d.reduce((list, parent) => {
              return [...list, ...parent.scopes.map(s => 
                //`${parent.scopeParent}: ${s.description}`
                ({ name: s.url, value: s.url, short: s.description, disabled: false }))
              ]}, [])).sort();
            var fuzzyResult = fuzzy.filter(scope, scopeList, {
              extract: function (item) {
                return item['name'];
              }
            });
            var data = fuzzyResult.map(function (element) {
              return element.original;
            });
            resolve(data);
          });
        })
      },
      validate: (scopes) => scopes.length > 0 ? true : 'You must select a scope.'
    },{
      type: 'input',
      name: 'documentId',
      message: 'What is the ID of your document?'
    }],
    actions: [{
      type: 'addMany',
      destination: '../',
      templateFiles: 'plop-templates/app/**/*',
      skipIfExists: true
    },{
      type: 'add',
      path: '../app/lib/gastest.js',
      skipIfExists: true,
      templateFile: '../node_modules/tsgast/index.js',
    },{
      type: 'addMany',
      destination: '../',
      templateFiles: 'plop-templates/utils/**/*',
      // skipIfExists: true,
      force: true
    },(answers) => {
      const name = answers.projectName;
      const docId = answers.documentId.toString();
      let spinner = new Spinner('%s...Creating Clasp Project');
      spinner.setSpinnerString('|/-\\');
      spinner.start();
      if (fs.existsSync('./.clasp.json')) fs.unlinkSync('./.clasp.json')
      return npmRun.exec("clasp create '" + answers.projectName + "' " + docId, function (err, stdout, stderr) {
        spinner.setSpinnerTitle('%s...Copying appsscript file');
        // err Error or null if there was no error
        if (err) console.log(err);
        // stdout Buffer|String
        console.log(stdout);

        // TODO: Look into using a syncronous function??
        console.log("Go to: Resources -> Cloud Platform project.. and click on the project link.\nOnce you are in the developer console, Enable the Apps Script API and create and download the OAuth Client credentials to credentials.json.  Select web app and have http://localhost:3000/oauth2callback be the callback link.  Then run the test function and accept the permissions.");
        return npmRun.exec("cp app/appsscript.json ./", (err, stdout, stderr) => {
          console.log("appsscript.json file copied");
          spinner.setSpinnerTitle('%s...Pushing files to server.');
          return npmRun.exec("clasp push", (err, stdout, stderr) => {
            console.log(stdout);
            console.log("Files pushed to the server.")
            spinner.setSpinnerTitle('%s...Deploying API.');
            return npmRun.exec("clasp deploy", (err, stdout, stderr) => {
              console.log("API deployed.")
              spinner.setSpinnerTitle('%s...Retrieving deployment ID');
              return npmRun.exec("clasp deployments > .clasp.deployments.json", (err, stdout, stderr) => {
                console.log("Deployment ID retrieved.")
                console.log(stdout);
                spinner.setSpinnerTitle('%s...Opening Script');
                return npmRun.exec("clasp open", (err, stdout, stderr) => {
                  console.log(stdout);
                  spinner.stop();
                });
              });
            });
          });
        });
    });
    },{
      type: 'add',
      path: '../appsscript.json',
      force: true,
      templateFile: 'plop-templates/app/appsscript.json'
    },{
      type: 'add',
      path: '../utils/gastap.d.ts',
      skipIfExists: true,
      templateFile: '../node_modules/tsgast/index.d.ts'
    },{
      type: 'add',
      path: '../tsconfig.json',
      force: true,
      templateFile: 'plop-templates/tsconfig.json'
    },{
      type: 'add',
      path: '../app/lib/ramda.js',
      skipIfExists: true,
      templateFile: '../node_modules/ramda/dist/ramda.js'
    }, {
      type: 'add',
      path: '../.claspignore',
      skipIfExists: true,
      templateFile: 'plop-templates/.claspignore'
    }]
  })

  // create your generators here
  plop.setGenerator('namespace', {
    description: 'create a namesapce for GAS app',
    prompts: [{
      type: 'input',
      name: 'namespace',
      message: 'What is the name of your namespace?',
      filter: pascalCase
    },
    {
      type: 'input',
      name: 'description',
      message: 'What does the namespace do?'
    }], // array of inquirer prompts
    actions: [{
      type: 'add',
      path: 'app/src/{{namespace}}.ts',
      templateFile: 'plop-templates/namespace.hbs'
    }, {
      type: 'add',
      path: 'app/tests/{{namespace}}.test.ts',
      templateFile: 'plop-templates/namespace-test.hbs'
    }, {
      type: 'append',
      path: '../app/tests/index.ts',
      pattern: /export const tests: TestCollection\[\] = \[/gi,
      template: 'Test.{{namespace}}Tests',
    }]  // array of actions
  });

  

  plop.addPrompt('file', require('inquirer-file'));
  // plop.registerPrompt('file', require('inquirer-file'));
  plop.setGenerator('test', {
    description: 'create a new test for a namespace',
    prompts: [{
      type: 'list',
      name: 'namespace',
      message: 'Which namespace do you want to create a test for?',
      choices: () => {
        return getFiles();
      }
    }, {
      type: 'prompt',
      name: 'testName',
      message: 'What is the name of the test?',
      filter: pascalCase
    }, {
      type: 'prompt',
      name: 'description',
      message: 'What does the test do?'
    }],
    actions: [{
      type: 'append',
      path: '../app/tests/{{namespace}}.test.ts',
      pattern: /(\/\/ Test Collection)/gi,
      templateFile: 'plop-templates/test.hbs'
    },{
      type: 'append',
      path: '../app/tests/{{namespace}}.test.ts',
      pattern: /(tests: \[)/gi,
      templateFile: 'plop-templates/test-description.hbs'
    }]
  })
};

function getFiles() {
  const dir = './app/src/'
  return glob.sync('./app/src/**/*.ts', {nodir: true}).map(f => {
    return f.split(dir)[1].split('.')[0];
  });
}

const getScopes = async () => {
  const scopesURI = 'https://developers.google.com/oauthplayground/getScopes';
  const response = await rp({
    uri: scopesURI, 
    json: true, 
    cacheKey: scopesURI,
    cacheTTL: 36000,
    cacheLimit: 12 });
  // const json = await response.json();
  // return R.compose(R.map(R.prop('scopes')), R.prop('apis'))(response);
  return Object.entries(response.apis).map(apiClass => {
    // const scope = Object.entries(Object.entries(apiClass[1])[1][1][0])[0][0];
    // const description = Object.entries(Object.entries(apiClass[1])[1][1][0])[0][1].description;
    // console.log(scope, description);
    const scopeParent = apiClass[0];
    // const scope = Object.entries(apiClass[1].scopes[0])[0]
    // const uri = scope[0]
    // const description = scope[1].description;
    const scopes = apiClass[1].scopes.map(s => {
      return Object.keys(s).map(k => {
        return {url: k, description: s[k].description}
      })[0]
    });
    return {scopeParent, scopes}
  })
}


