/*globals
ko,
google
*/

const mapStatus = {
  MAP_LOAD_FAILURE: false,
  MAP_LOAD_SUCCESS: true
};

const fourSquareError = {
  GET_VENUE_ERROR: 'Get venue error',
  GET_PHOTO_ERROR: 'Get photo error'
};

const NET_ERROR_TEXT = 'Data cannot be loaded (check the network)';
const AUTH_ERROR_TEXT = 'Map cannot be loaded (check API credentials)';
const API_ERROR_TEXT = 'An API error occurred with status ';
const FOURSQUARE_ERROR_TEXT = 'Foursquare API returned an error: ';
const SEARCH_ERROR_TEXT = 'You cannot use this symbol as a search pattern: ';
const NO_ROUTE_ERROR_TEXT = 'There is no places to go on the map';

const INFO_WINDOW_CONTENT = `
    <div class="panel panel-primary">
      <div class="panel-heading">
        <h3 class="panel-title" id="info-header"></h3>
        <p id="address"></p>
      </div>
      <div class="panel-body">
        <img id="info-img" src="" class="img-responsive center-block img-rounded" alt="Venue's Photo">
      </div>
      <div class="panel-footer text-right">
        <p>the photo was posted by <span id="author"></span></p>
        <p>on <a href="https://foursquare.com" target="_blank">foursquare</a></p>
      </div>
    </div>
`;

class App {
  constructor (mapLoadStatus, errorText) {
    this.map = null;
    this.infoWindow = null;
    this.routeDisplay = null;
    this.alertText = ko.observable('');
    this.alertVisible = ko.observable(false);
    this.searchVisible = ko.observable(false);
    this.searchString = ko.observable();
    this.locations = ko.observableArray();
    //create dependency to react on search string input
    //have to use the trick since knockoutjs doesn't seem to work with oninput event
    this.searchString.subscribe(this.searchList, this);
    this.listLength = 20;
    this.zoom = 15;
    this.center = {lat: 53.344938, lng: -6.267473};
    this.bounds = null;
    this.defaultIcon = null;
    if (!mapLoadStatus) {
      this.setMapLoadError(errorText);
    } else {
      this.loadStatus = mapLoadStatus;
    }
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

  clearMap (hideMarkers = true) {
    this.locations()
      .filter((elem) => elem.visible())
      .forEach((elem) => {
        elem.disabled(hideMarkers);
        elem.marker.setVisible(!hideMarkers);
      });
  }

  clickRoute () {
    this.showAlert(undefined, false);
    if (this.infoWindow) {
      this.resetActiveMarker();
      this.infoWindow.close();
    }
    if (!this.routeDisplay) {
      this.routeDisplay = new google.maps.DirectionsRenderer({
        preserveViewport: true
      });
    } else {
      this.routeDisplay.setMap(null);
    }

    const visibleLocations = this.locations().filter((elem) => elem.visible());
    if (!visibleLocations.length) {
      this.showAlert(NO_ROUTE_ERROR_TEXT);
      return;
    }

    this.clearMap();
    this.map.fitBounds(this.bounds);

    const waypoints = visibleLocations //position of all visible locations except the first(origin) and last(destination) ones
      .slice(1, visibleLocations.length - 1)
      .map((elem) => {
        return {
          location: elem.marker.getPosition()
        };
      });
    new google.maps.DirectionsService().route(
      {
        origin: visibleLocations[0].marker.getPosition(),
        destination: visibleLocations[visibleLocations.length - 1].marker.getPosition(),
        travelMode: google.maps.TravelMode.WALKING,
        waypoints: waypoints,
        optimizeWaypoints: true
      },
      (result, status) => {
        if (status !== google.maps.DirectionsStatus.OK) {
          this.showAlert(API_ERROR_TEXT);
        } else {
          this.routeDisplay.setMap(this.map);
          this.routeDisplay.setDirections(result);
        }
      }
    );

  }

  clickClearRoute() {
    if (!this.routeDisplay) {
      return;
    }

    this.showAlert(undefined, false);
    this.routeDisplay.setMap(null);
    this.clearMap(false);
  }

  clickListItem (location) {
    if (!location.disabled()) {
      App.getViewModel().clickLocation(location);
    }
  }

  clickLocation (location) {
    this.showAlert(undefined, false);
    if (this.infoWindow) {
      this.infoWindow.close();
    }
    this.animateMarker(location);
    let venueInfo = null;
    App.getVenueDetails(location)
      .then((venue) => {
        venueInfo = venue;
        return App.getVenuePhoto(venue.id);
      })
      .then((photo) => {
        this.showInfo(venueInfo, photo, location.marker);
      })
      .catch((error) => {
        this.resetActiveMarker();
        this.showAlert(FOURSQUARE_ERROR_TEXT + error.message);
      });
  }

  static getViewModel () {
    return ko.dataFor($('body').get(0));
  }

  static getVenueDetails (location) {
    const position = location.position.toJSON();
    let err = new Error();
    err.name = fourSquareError.GET_VENUE_ERROR;
    return new Promise((resolve, reject) => {
      $.ajax({
        url: 'https://api.foursquare.com/v2/venues/search?' +
        `ll=${position.lat},${position.lng}` +
        `&query=${location.name}` +
        '&limit=1' +
        '&radius=100' +
        '&categoryID:4d4b7105d754a06374d81259,4bf58dd8d48988d116941735' + //cafes and restaurants, bars
        '&client_id=1MTN4O1BQ1OHRBQKO2NPNHYRXZZEBG5QSSEND0L41NDMW51E' +
        '&client_secret=POG3FQJYCMUH4Z24UG5GIRWXBVG5JIU1SL31QQMLUHFB2LUT' +
        '&v=20180101',
      }).done((data) => {
        if (data.meta.code === 200 && data.response.venues.length) {
          resolve(data.response.venues[0]);
        } else {
          err.message = `Foursquare cannot find the venue, code ${data.meta.code}`;
          reject(err);
        }
      })
        .fail((error) => {
          err.message = error.responseJSON ? error.responseJSON.meta.errorDetail : NET_ERROR_TEXT;
          reject(err);
        });
    });
  }

  static getVenuePhoto (venueID) {
    let err = new Error();
    err.name = fourSquareError.GET_PHOTO_ERROR;
    return new Promise((resolve, reject) => {
      $.ajax({
        url: `https://api.foursquare.com/v2/venues/${venueID}/photos?` +
        'limit=1' +
        '&client_id=1MTN4O1BQ1OHRBQKO2NPNHYRXZZEBG5QSSEND0L41NDMW51E' +
        '&client_secret=POG3FQJYCMUH4Z24UG5GIRWXBVG5JIU1SL31QQMLUHFB2LUT' +
        '&v=20180101',
      }).done((data) => {
        if (data.meta.code === 200 && data.response.photos.count) {
          resolve(data.response.photos.items[0]);
        } else {
          err.message = `Foursquare cannot a venue's photo, code ${data.meta.code}`;
          reject(err);
        }
      })
        .fail((error) => {
          err.message = error.responseJSON ? error.responseJSON.meta.errorDetail : NET_ERROR_TEXT;
          reject(err);
        });
    });
  }

  resetActiveMarker () {
    const activeLocation = this.locations().filter((elem) => elem.active())[0];
    if (activeLocation) {
      activeLocation.marker.setIcon(this.defaultIcon);
      activeLocation.active(false);
    }
  }

  animateMarker (location) {
    this.resetActiveMarker();
    location.active(true);
    location.marker.setAnimation(google.maps.Animation.DROP);
    location.marker.setIcon({
      path: 'M 125,5 155,90 245,90 175,145 200,230 125,180 50,230 75,145 5,90 95,90 z',
      fillColor: 'yellow',
      fillOpacity: 1,
      scale: 0.1,
      strokeColor: 'goldenrod',
      strokeWeight: 1
    });
  }

  showInfo (venue, photo, marker) {
    const firstName = photo.user.firstName || '';
    const lastName = photo.user.lastName || '';
    if (!this.infoWindow) {
      this.infoWindow = new google.maps.InfoWindow();
    }
    this.infoWindow.setContent(INFO_WINDOW_CONTENT); //reset the content to prevent ugly rendering
    this.infoWindow.open(this.map, marker);
    google.maps.event.addListener(this.infoWindow, 'domready', () => {
      $('#info-header').text(venue.name);
      $('#info-img').attr('src', photo.prefix + 'height300' + photo.suffix);
      $('#address').text(venue.location.address);
      $('#author').text(firstName + ' ' + lastName);
    });
    google.maps.event.addListener(this.infoWindow, 'closeclick', () => {
      this.resetActiveMarker();
    });
  }

  searchList () {
    this.showAlert(undefined, false);
    this.clickClearRoute();
    if (this.searchString().indexOf('\\') >= 0) {
      this.showAlert(SEARCH_ERROR_TEXT + '\\');
    } else {
      const regex = new RegExp(this.searchString(), 'i');
      const locations = this.locations();
      for (let i = 0; i < locations.length; i++) {
        let nameMatch = regex.test(locations[i].name);
        locations[i].visible(nameMatch);
        locations[i].marker.setVisible(nameMatch);
      }
    }
  }

  setMapLoadError (errorText) {
    this.loadStatus = mapStatus.MAP_LOAD_FAILURE;
    this.showAlert(errorText);
  }

  showAlert (errorText, show = true) {
    this.alertText(errorText);
    this.alertVisible(show);
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
          this.bounds = this.map.getBounds();
          new google.maps.places.PlacesService(this.map).textSearch(
            {
              bounds: this.bounds,
              query: 'pub'
            },
            (results, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK) {
                for (let i = 0; i < results.length && i < this.listLength; i++) {
                  let place = results[i];
                  this.addLocation(place);
                  //adjust to the viewport
                  if (place.geometry.viewport) {
                    this.bounds.union(place.geometry.viewport);
                  } else {
                    this.bounds.extend(place.geometry.location);
                  }
                  this.map.fitBounds(this.bounds);
                }
                //save a default icon to restore when clicked on another item(marker)
                this.defaultIcon = this.locations()[0].marker.getIcon();
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
    const marker = new google.maps.Marker({
      map: this.map,
      position: place.geometry.location
    });
    const location = {
      visible: ko.observable(true),
      active: ko.observable(false),
      disabled: ko.observable(false),
      name: place.name,
      position: place.geometry.location,
      marker: marker
    };
    google.maps.event.addListener(marker, 'click', () => {this.clickLocation(location);});
    this.locations.push(location);
  }
}

// noinspection JSUnusedGlobalSymbols
function init () { //eslint-disable-line no-unused-vars
  let app = App.getViewModel();
  if (!app) {
    app = new App(mapStatus.MAP_LOAD_SUCCESS);
    ko.applyBindings(app, $('body').get(0));
  }
  //Before show the search field wait until the map is loaded without errors
  app.showMap()
    .then(() => {app.searchVisible(true);})
    .catch((status) => {app.setMapLoadError(API_ERROR_TEXT + status);});
}

function mapError () { //eslint-disable-line no-unused-vars
  let app = App.getViewModel();
  if (!app) {
    app = new App(mapStatus.MAP_LOAD_FAILURE, NET_ERROR_TEXT);
    ko.applyBindings(app, $('body').get(0));
  } else {
    app.setMapLoadError(NET_ERROR_TEXT);
  }
}

// noinspection JSUnusedGlobalSymbols
function gm_authFailure () { //eslint-disable-line no-unused-vars
  let app = App.getViewModel();
  if (!app) {
    app = new App(mapStatus.MAP_LOAD_FAILURE, AUTH_ERROR_TEXT);
    ko.applyBindings(app, $('body').get(0));
  } else {
    app.setMapLoadError(AUTH_ERROR_TEXT);
  }
}
