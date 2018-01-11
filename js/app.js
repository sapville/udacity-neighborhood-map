/*globals
ko,
google
*/

const mapStatus = {
  MAP_LOAD_FAILURE: false,
  MAP_LOAD_SUCCESS: true
};

const NET_ERROR_TEXT = 'Map cannot be loaded (check the network)';
const AUTH_ERROR_TEXT = 'Map cannot be loaded (check api credentials)';

let app = null;

class App {
  constructor (mapLoadStatus, errorText) {
    this.map = null;
    this.alertText = ko.observable('');
    this.alertVisible = ko.observable(false);
    if (!mapLoadStatus) {
      this.setMapLoadError(errorText);
    } else {
      this.loadStatus = mapLoadStatus;
    }
  }

  // noinspection JSUnusedGlobalSymbols
  closeAlert () {
    this.alertText('');
    this.alertVisible(false);
  }

  setMapLoadError (errorText) {
    this.loadStatus = mapStatus.MAP_LOAD_FAILURE;
    this.alertText(errorText);
    this.alertVisible(true);
  }

  showMap () {
    if (!this.loadStatus) {
      return;
    }
    this.map = new google.maps.Map($('#map').get(0), {
      center: {lat: 53.344938, lng: -6.267473},
      zoom: 15
    });
    //Since bounds are not calculated immediately searching places
    // within bounds should be wrapped inside an event handler
    google.maps.event.addListener(this.map, 'bounds_changed', () => {
      google.maps.event.clearListeners(this.map, 'bounds_changed');
      new google.maps.places.PlacesService(this.map).nearbySearch(
        {
          bounds: this.map.getBounds(),
          types: ['bar', 'restaurant', 'cafe', 'night_club']
        },
        (results, status) => {console.log(results, status);}
      );
    });
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
    app = new App(mapStatus.MAP_LOAD_FAILURE, NET_ERROR_TEXT);
    ko.applyBindings(app);
  } else {
    app.setMapLoadError(NET_ERROR_TEXT);
  }
}

function gm_authFailure () { //eslint-disable-line no-unused-vars
  if (!app) {
    app = new App(mapStatus.MAP_LOAD_FAILURE, AUTH_ERROR_TEXT);
    ko.applyBindings(app);
  } else {
    app.setMapLoadError(AUTH_ERROR_TEXT);
  }
}
