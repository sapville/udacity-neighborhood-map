/*
global
ko
*/

const mapStatus = {
  MAP_LOAD_FAILURE: false,
  MAP_LOAD_SUCCESS: true
};

const NET_ERROR_TEXT = 'Map cannot be loaded (check the network)';



let app = null;

class App {
  constructor (mapLoadStatus) {
    this.alertText = ko.observable('');
    this.alertVisible = ko.observable(false);
    if (!mapLoadStatus) {
      this.setMapLoadError(NET_ERROR_TEXT);
    }
  }

  // noinspection JSUnusedGlobalSymbols
  closeAlert () {
    this.alertText('');
    this.alertVisible(false);
  }

  setMapLoadError(errorText) {
    this.loadStatus = mapStatus.MAP_LOAD_FAILURE;
    this.alertText(errorText);
    this.alertVisible(true);
  }

  showMap() {
    if (!this.loadStatus) {
      return;
    }

  }

}

// noinspection JSUnusedGlobalSymbols
function init () { //eslint-disable-line no-unused-vars
  if (!app) {
    app = new App(mapStatus.MAP_LOAD_SUCCESS);
    ko.applyBindings(app);
  }
  app.showMap();
}

function mapError () { //eslint-disable-line no-unused-vars
  if (!app) {
    app = new App(mapStatus.MAP_LOAD_FAILURE);
    ko.applyBindings(app);
  } else {
    app.setMapLoadError(NET_ERROR_TEXT);
  }
}

// function gm_authFailure (error) { console.log('Auth error');}
