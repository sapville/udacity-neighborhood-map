// import ko from 'js/knockout-3.4.2';

/*
global
ko
*/

class App {
  constructor (mapLoadStatus, errorCode) {
    this.alertVisible = ko.observable(false);
    this.alertText = ko.observable('');
    if (!mapLoadStatus) {
      this.alertVisible(true);
      this.alertText(`Map load error with code ${errorCode}`);
    }
  }

  static mapStatus () {
    return {
      MAP_LOAD_FAILURE: false,
      MAP_LOAD_SUCCESS: true
    };
  }

}

function init () { //eslint-disable-line no-unused-vars
}

function mapError () { //eslint-disable-line no-unused-vars
  const app = new App(App.mapStatus().MAP_LOAD_FAILURE);
  ko.applyBindings(app);
}
