
declare namespace GoogleAppsScript {
  /**
   * This service allows scripts to create, access, and modify Google Sheets files. See also the guide to storing data in spreadsheets.
   *
   * https://developers.google.com/apps-script/guides/sheets
   */
  export module Spreadsheet {
    export enum BandingTheme { LIGHT_GREY, CYAN, GREEN, YELLOW, ORANGE, BLUE, TEAL, GREY, BROWN, LIGHT_BROWN, INDIGO, PINK }

    export interface Range {
      applyColumnBanding(): Range;
      applyColumnBanding(bandingTheme: BandingTheme): Range;
      applyColumnBanding(bandingTheme: BandingTheme, showHeader: boolean, showFooter: boolean): Range;
      applyRowBanding(): Range;
      applyRowBanding(bandingTheme: BandingTheme): Range;
      applyRowBanding(bandingTheme: BandingTheme, showHeader: boolean, showFooter: boolean): Range;
    }

    export interface SpreadsheetApp {
      /**
       * An enumeration of the valid styles for setting borders on a Range.
       */
      BorderStyle: typeof BorderStyle;

      BandingTheme: typeof BandingTheme
    }
  }
}