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

/**
 * ViewModel class for KnockoutJS framework
 */
class App {
  /**
   * constructor
   * @param {object} mapLoadStatus  - the map load result
   * @param {string} errorText      - error text if error occurred
   */
  constructor (mapLoadStatus, errorText) {
    /*Attributes*/
    this.map = null;
    this.infoWindow = null;
    this.routeDisplay = null;
    this.alertText = ko.observable('');       //error text shown in an alert block
    this.alertVisible = ko.observable(false); //if an alert block visible
    this.searchVisible = ko.observable(false);//if a search field visible
    this.searchString = ko.observable();      //the search string value (a search criterion)
    this.venueName = ko.observable();         //venue name in the info window
    this.venueAddress = ko.observable();      //venue address in the info window
    this.venuePhoto = ko.observable();        //venue photo in the info window
    this.photoAuthor = ko.observable();       //venue photo author in the info window
    this.hideInfo = ko.observable(true);      //if the info window is hidden
    this.locations = ko.observableArray();    //an array with locations (markers and list items)
    this.listLength = 20;                     //maximum number of locations
    this.zoom = 15;                           //initial zoom for the area where locations are to be found
    this.center = {lat: 53.344938, lng: -6.267473}; //place to search locations (Temple Bar, Dublin, Ireland)
    this.bounds = null;                       //bounds to center the map when a route is drawn
    this.defaultIcon = null;                  //save default icon to replace a selected icon (a star)

    /*Initialization*/
    //create dependency to react on search string input
    //have to use the trick since knockoutjs doesn't seem to work with oninput event
    this.searchString.subscribe(this.searchList, this);
    if (!mapLoadStatus) {
      this.setMapLoadError(errorText);
    } else {
      this.loadStatus = mapLoadStatus;
    }
  }

  // noinspection JSMethodCanBeStatic
  /**
   * handle click on hamburger button - show/hide a list with locations on the sidebar
   */
  showList () {
    const list = $('.list');
    //there is the only way to find out if the media-query condition is fulfilled
    //z-index for the list is set only in media-query
    //we cannot take width property as a criterion since jQuery returns it in pixels while z-index is easier to compare
    if (list.css('z-index') === '1') { //show the list
      list.css('z-index', 2); //change z-index to indicate that width was changed too
      list.css('width', '25%');
    } else {                            //hide the list
      list.css('z-index', 1);
      list.css('width', '0');
    }
  }

  /**
   * hide/show markers on the map (when the route is drawn) - process only those ones which were selected via filtering
   * @param {boolean} hideMarkers - hide or shoe markers
   */
  clearMap (hideMarkers = true) {
    this.locations()
      .filter((elem) => elem.visible())
      .forEach((elem) => {
        elem.disabled(hideMarkers);
        elem.marker.setVisible(!hideMarkers);
      });
  }

  /**
   * draw the route through the locations selected via filtering
   */
  clickRoute () {
    //prepare the map
    this.showAlert(undefined, false); //hide an alert block if shown
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

    //find locations to be connected
    const visibleLocations = this.locations().filter((elem) => elem.visible());
    if (!visibleLocations.length) {
      this.showAlert(NO_ROUTE_ERROR_TEXT);
      return;
    }

    //clear the map
    this.clearMap();
    this.map.fitBounds(this.bounds);

    //find locations to be used as waypoints
    const waypoints = visibleLocations //position of all visible locations except the first(origin) and last(destination) ones
      .slice(1, visibleLocations.length - 1) //except the first and the last ones
      .map((elem) => {
        return {
          location: elem.marker.getPosition()
        };
      });

    //draw the route
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

  /**
   * erase the route from the map
   */
  clickClearRoute () {
    if (!this.routeDisplay) {
      return;
    }

    this.showAlert(undefined, false);
    this.routeDisplay.setMap(null);
    this.clearMap(false);
  }

  // noinspection JSMethodCanBeStatic
  /**
   * item click handler
   * @param {object} location - clicked list item
   */
  clickListItem (location) {
    if (!location.disabled()) {
      App.getViewModel().clickLocation(location);
    }
  }

  /**
   * process click on a location - either on a list item or a marker
   * @param {object} location - clicked location
   */
  clickLocation (location) {
    this.showAlert(undefined, false);
    if (this.infoWindow) {
      this.infoWindow.close();
    }
    this.animateMarker(location);
    let venueInfo = null;
    App.searchFoursquareVenue(location) //ajax call
      .then((venue) => {
        venueInfo = venue;
        return App.getFoursquareVenuePhoto(venue.id); //ajax call
      })
      .then((photo) => { //show the info only after two consecutive successful ajax calls
        this.showInfo(venueInfo, photo, location.marker);
      })
      .catch((error) => {
        this.resetActiveMarker();
        this.showAlert(FOURSQUARE_ERROR_TEXT + error.message);
      });
  }

  /**
   * get ViewModel instance
   * @returns {object} - ViewModel instance
   */
  static getViewModel () {
    return ko.dataFor($('body').get(0));
  }

  /**
   * search Foursquare for a venue by name and LanLng position
   * @param {object} location - clicked location (a member of locations array)
   * @returns {Promise} - to chain with another ajax call
   */
  static searchFoursquareVenue (location) {
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
        '&client_id=NTHMHUF3XOETEGPBBXQZNWAEDPW2CNMSAYFN2SNXVUSPLRU5' +
        '&client_secret=Z51XRJPKOWS1IQVJ3DXOZY5Y2415HXTW0PFDCR02ZQAZKP04' +
        '&v=20180101', //date by which api finds an actual version
      }).done((data) => {
        if (data.meta.code === 200 && data.response.venues.length) {
          resolve(data.response.venues[0]);
        } else {
          err.message = `Foursquare cannot find the venue, code ${data.meta.code}`;
          reject(err);
        }
      })
        .fail((error) => { //error can be returned either by api or ajax (net error)
          err.message = error.responseJSON ? error.responseJSON.meta.errorDetail : NET_ERROR_TEXT;
          reject(err);
        });
    });
  }

  /**
   * find a photo on Foursquare by venue id
   * @param {string} venueID - venue id
   * @returns {Promise} to show info asynchronously
   */
  static getFoursquareVenuePhoto (venueID) {
    let err = new Error();
    err.name = fourSquareError.GET_PHOTO_ERROR;
    return new Promise((resolve, reject) => {
      $.ajax({
        url: `https://api.foursquare.com/v2/venues/${venueID}/photos?` +
        'limit=1' +
        '&client_id=NTHMHUF3XOETEGPBBXQZNWAEDPW2CNMSAYFN2SNXVUSPLRU5' +
        '&client_secret=Z51XRJPKOWS1IQVJ3DXOZY5Y2415HXTW0PFDCR02ZQAZKP04' +
        '&v=20180101',
      }).done((data) => {
        if (data.meta.code === 200 && data.response.photos.count) {
          resolve(data.response.photos.items[0]);
        } else {
          err.message = `Foursquare cannot a venue's photo, code ${data.meta.code}`;
          reject(err);
        }
      })
        .fail((error) => { //error can be returned either by api or ajax (net error)
          err.message = error.responseJSON ? error.responseJSON.meta.errorDetail : NET_ERROR_TEXT;
          reject(err);
        });
    });
  }

  /**
   * reset a clicked (active) marker, which has a star shape, to a default icont
   */
  resetActiveMarker () {
    const activeLocation = this.locations().filter((elem) => elem.active())[0];
    if (activeLocation) {
      activeLocation.marker.setIcon(this.defaultIcon);
      activeLocation.active(false);
    }
  }

  /**
   * transform a clicked marker into a star and bounce
   * @param {object} location - clicked location
   */
  animateMarker (location) {
    this.resetActiveMarker();
    location.active(true); //indicate that the marker is clicked (active)
    location.marker.setAnimation(google.maps.Animation.DROP);
    location.marker.setIcon({
      path: 'M 125,5 155,90 245,90 175,145 200,230 125,180 50,230 75,145 5,90 95,90 z', //the star shape is taken from Google reference
      fillColor: 'yellow',
      fillOpacity: 1,
      scale: 0.1,
      strokeColor: 'goldenrod',
      strokeWeight: 1
    });
  }

  /**
   * show an info window with a photo, an address and a photo author's name
   * @param {object} venue - venue data from Foursquare
   * @param {object} photo - photo data from Foursquare
   * @param {object} marker - the marker to attach the info window to
   */
  showInfo (venue, photo, marker) {
    const firstName = photo.user.firstName || ''; //in case the name is missing
    const lastName = photo.user.lastName || '';
    if (!this.infoWindow) {
      this.infoWindow = new google.maps.InfoWindow();
      this.infoWindow.setContent($('.panel').get(0));
      this.hideInfo(false);
    }
    this.infoWindow.open(this.map, marker);
    this.venueName(venue.name);
    this.venuePhoto(photo.prefix + 'height300' + photo.suffix);
    this.venueAddress(venue.location.address);
    this.photoAuthor(firstName + ' ' + lastName);
    google.maps.event.addListener(this.infoWindow, 'closeclick', () => {
      this.resetActiveMarker();
    });
  }

  /**
   * filter the list of locations and hide markers on the map
   * this function is a subscription to the change of search string field
   */
  searchList () {
    this.showAlert(undefined, false); //hide alert box if shown
    this.clickClearRoute();
    if (this.searchString().indexOf('\\') >= 0) { //symbol \ cannot be used in regexp
      this.showAlert(SEARCH_ERROR_TEXT + '\\');
    } else {
      const regex = new RegExp(this.searchString(), 'i'); //use regexp to ignore register in a search string
      const locations = this.locations();
      for (let i = 0; i < locations.length; i++) {
        let nameMatch = regex.test(locations[i].name);
        locations[i].visible(nameMatch);
        locations[i].marker.setVisible(nameMatch);
      }
    }
  }

  /**
   * process load map errors
   * @param {string} errorText - text to show inside the alert box
   */
  setMapLoadError (errorText) {
    this.loadStatus = mapStatus.MAP_LOAD_FAILURE;
    this.showAlert(errorText);
  }

  /**
   * show the alert box
   * @param {string} errorText - text to shwow in the alert box
   * @param {boolean} show - show/hide the alert box
   */
  showAlert (errorText, show = true) {
    this.alertText(errorText);
    this.alertVisible(show);
  }

  /**
   * show the map when fully loaded
   * @returns {Promise} have to use asynchronous processing since we wait until event bounds_changed occurs
   */
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
          new google.maps.places.PlacesService(this.map).textSearch( //find locations to show
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

  /**
   * collect locations into an array "locations"
   * @param {object} place - location to show
   */
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
/**
 * function called asynchronously after Google API loaded successfully
 * the function is passed as a callback parameter in Google API URL
 */
function init () { //eslint-disable-line no-unused-vars
  let app = App.getViewModel();
  if (!app) { //in case app has been already created asynchronously by other callback function
    app = new App(mapStatus.MAP_LOAD_SUCCESS);
    ko.applyBindings(app, $('body').get(0));
  }
  //Before show the search field wait until the map is loaded without errors
  app.showMap()
    .then(() => {app.searchVisible(true);})
    .catch((status) => {app.setMapLoadError(API_ERROR_TEXT + status);});
}

// noinspection JSUnusedGlobalSymbols
/**
 * function called asynchronously when an error occurs during Google API loading
 * the function is passed as an attribute in <script> tag loading Google API
 */
function mapError () { //eslint-disable-line no-unused-vars
  let app = App.getViewModel();
  if (!app) { //in case app has been already created asynchronously by other callback function
    app = new App(mapStatus.MAP_LOAD_FAILURE, NET_ERROR_TEXT);
    ko.applyBindings(app, $('body').get(0));
  } else {
    app.setMapLoadError(NET_ERROR_TEXT);
  }
}

// noinspection JSUnusedGlobalSymbols
/**
 * function called when there is a problem with Google API key
 */
function gm_authFailure () { //eslint-disable-line no-unused-vars
  let app = App.getViewModel();
  if (!app) { //in case app has been already created asynchronously by other callback function
    app = new App(mapStatus.MAP_LOAD_FAILURE, AUTH_ERROR_TEXT);
    ko.applyBindings(app, $('body').get(0));
  } else {
    app.setMapLoadError(AUTH_ERROR_TEXT);
  }
}
