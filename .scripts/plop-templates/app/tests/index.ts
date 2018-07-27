// File: tests/Worksheets.test.ts

// Description: 
// Tests for the Worksheet namespace
/// <reference path="../../utils/gastap.d.ts" />

interface TestCollection {
  name: string,
  description: string,
  tests: Test[]
}
interface Test {
  fn: testFn,
  name: string,
  description: string
}

namespace Test {

  let currentTest: string[] = [];
  export function runAllTests() {
    const tap = initTestLibrary();
    Test.tests.forEach(family => {
      family.tests.forEach(test => {
        tap.test(test.name, test.fn(family, test));
      })
    });
    tap.finish();
    return currentTest.join("\n");
  }

  export function runMostRecent() {
    const tap = initTestLibrary();
    const family = Test.tests[tests.length - 1];
    if (family) {
      const test = family.tests[0];
      tap.test(test.name, test.fn(family, test));
      tap.finish();
      return currentTest.join("\n");
    }
  }

  export function runFamilyTests(familyName: string) {
    const tap = initTestLibrary();
    const family = Test.tests.filter(fs => fs.name === familyName)[0];
    if (family) {
      family.tests.forEach(test => {
        tap.test(test.name, test.fn(family, test));
      });
      tap.finish();
      return currentTest.join("\n");
    } return false;
  }

  const loadGasTapLibrary = () => {
    let cs;
    if ((typeof GasTap) === 'undefined') { // GasT Initialization. (only if not initialized yet.)
      cs = CacheService.getScriptCache().get('gast');
      if (!cs) {
        cs = UrlFetchApp.fetch('https://raw.githubusercontent.com/kevincar/gast/master/index.js').getContentText();
        CacheService.getScriptCache().put('gast', cs, 21600);
      }
    } else {// Class GasTap is ready for use now!
      cs = CacheService.getScriptCache().get('gast');
    }
    eval(cs);
  }

  function initTestLibrary(): GasTap {
    // loadGasTapLibrary();    

    let tap = new GasTap({
      loggerFunc: function (msg) {
        Logger.log(msg);
        currentTest.push(msg);
      }
    });
    return tap;
  }



  export const tests: TestCollection[] = [
  ];

  export const testMsg = (famName: string, testName: string, testDescription: string) => `${famName}:${testName} - ${testDescription}`;

  export function getFamilyNames() {
    return tests.map(f => f.name);
  }

  export function cleanUpTest(page: GoogleAppsScript.Spreadsheet.Sheet) {
    SpreadsheetApp.getActiveSpreadsheet().deleteSheet(page);
  }

  (function (globalScope) {
    const familyNames = getFamilyNames();
    familyNames.forEach(name => {
      globalScope[`menu_family_test_${name}`] = function () {
        Test.runFamilyTests(name);
      }
    });

    //@ts-ignore
  })(this);

}

function testall() {
  return Test.runAllTests();
}

function testrecent() {
  return Test.runMostRecent();
}

function testfamily(family) {
  return family;
}