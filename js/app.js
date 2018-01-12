/*globals
ko,
google
*/

const mapStatus = {
  MAP_LOAD_FAILURE: false,
  MAP_LOAD_SUCCESS: true
};

const NET_ERROR_TEXT = 'Map cannot be loaded (check the network)';
const AUTH_ERROR_TEXT = 'Map cannot be loaded (check API credentials)';
const API_ERROR_TEXT = 'An API error occurred with status ';

let app = null;

class App {
  constructor (mapLoadStatus, errorText) {
    this.map = null;
    this.alertText = ko.observable('');
    this.alertVisible = ko.observable(false);
    this.searchVisible = ko.observable(false);
    this.searchString = ko.observable();
    this.locations = ko.observableArray();
    //create dependency to react on search string input
    //have to use the trick since knockoutjs doesn't seem to work with oninput event
    this.searchFunction = ko.computed(this.searchList, this);
    this.listLength = 15;
    this.zoom = 16;
    this.center = {lat: 53.344938, lng: -6.267473};
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

  // noinspection JSUnusedGlobalSymbols
  showList () {
    const list = $('.list');
    //there is the only way to find out if the media-query condition is fulfilled
    //z-index for the list is set only in media-query
    //we cannot take width property as a criterion since jQuery returns it in pixels while z-index is easier to compare
    if (list.css('z-index') === '1') {
      list.css('z-index', 2); //change z-index to indicate that width was changed too
      list.css('width', '25%');
    } else {
      list.css('z-index', 1);
      list.css('width', '0');
    }
  }

  searchList () {
    const regex = new RegExp(this.searchString(), 'i');
    const location = this.locations.peek();
    for (let i = 0; i < location.length; i++) {
      location[i].visible(regex.test(location[i].name));
    }
  }

  setMapLoadError (errorText) {
    this.loadStatus = mapStatus.MAP_LOAD_FAILURE;
    this.alertText(errorText);
    this.alertVisible(true);
  }

  showMap () {
    return new Promise((resolve, reject) => {
      if (!this.loadStatus) {
        reject();
      } else {
        this.map = new google.maps.Map($('#map').get(0), {
          center: this.center,
          zoom: this.zoom
        });
        //Since bounds are not calculated immediately, searching places
        // within bounds should be wrapped inside an event handler
        google.maps.event.addListener(this.map, 'bounds_changed', () => {
          google.maps.event.clearListeners(this.map, 'bounds_changed');
          new google.maps.places.PlacesService(this.map).textSearch(
            {
              bounds: this.map.getBounds(),
              query: 'pub'
            },
            (results, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK) {
                for (let i = 0; i < results.length && i < this.listLength; i++) {
                  this.addLocation(results[i]);
                }
                this.map.setZoom(this.map.getZoom() - 1); //lessen zoom range to avoid locations on borders
                resolve();
              } else {
                reject(status);
              }
            }
          );
        });
      }
    });
  }

  addLocation (place) {
    this.locations.push({
      visible: ko.observable(true),
      name: place.name,
      location: place.geometry.location,
      marker: new google.maps.Marker({
        map: this.map,
        position: place.geometry.location
      })
    });
  }
}

// noinspection JSUnusedGlobalSymbols
function init () { //eslint-disable-line no-unused-vars
  if (!app) {
    app = new App(mapStatus.MAP_LOAD_SUCCESS);
    ko.applyBindings(app);
  }
  //Before show the search field wait until the map is loaded without errors
  app.showMap()
    .then(() => {app.searchVisible(true);})
    .catch((status) => {app.setMapLoadError(API_ERROR_TEXT + status);});
}

function mapError () { //eslint-disable-line no-unused-vars
  if (!app) {
    app = new App(mapStatus.MAP_LOAD_FAILURE, NET_ERROR_TEXT);
    ko.applyBindings(app);
  } else {
    app.setMapLoadError(NET_ERROR_TEXT);
  }
}

// noinspection JSUnusedGlobalSymbols
function gm_authFailure () { //eslint-disable-line no-unused-vars
  if (!app) {
    app = new App(mapStatus.MAP_LOAD_FAILURE, AUTH_ERROR_TEXT);
    ko.applyBindings(app);
  } else {
    app.setMapLoadError(AUTH_ERROR_TEXT);
  }
}
