'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*globals
ko,
google
*/


var mapStatus = {
  MAP_LOAD_FAILURE: false,
  MAP_LOAD_SUCCESS: true
};

var fourSquareError = {
  GET_VENUE_ERROR: 'Get venue error',
  GET_PHOTO_ERROR: 'Get photo error'
};

var NET_ERROR_TEXT = 'Data cannot be loaded (check the network)';
var AUTH_ERROR_TEXT = 'Map cannot be loaded (check API credentials)';
var API_ERROR_TEXT = 'An API error occurred with status ';
var FOURSQUARE_ERROR_TEXT = 'Foursquare API returned an error: ';
var SEARCH_ERROR_TEXT = 'You cannot use this symbol as a search pattern: ';
var NO_ROUTE_ERROR_TEXT = 'There is no places to go on the map';

var INFO_WINDOW_CONTENT = '\n    <div class="panel panel-primary">\n      <div class="panel-heading">\n        <h3 class="panel-title" id="info-header"></h3>\n        <p id="address"></p>\n      </div>\n      <div class="panel-body">\n        <img id="info-img" src="" class="img-responsive center-block img-rounded" alt="Venue\'s Photo">\n      </div>\n      <div class="panel-footer text-right">\n        <p>the photo was posted by <span id="author"></span></p>\n        <p>on <a href="https://foursquare.com" target="_blank">foursquare</a></p>\n      </div>\n    </div>\n';

var App = function () {
  function App(mapLoadStatus, errorText) {
    _classCallCheck(this, App);

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
    this.center = { lat: 53.344938, lng: -6.267473 };
    this.defaultIcon = null;
    if (!mapLoadStatus) {
      this.setMapLoadError(errorText);
    } else {
      this.loadStatus = mapLoadStatus;
    }
  }

  // noinspection JSUnusedGlobalSymbols


  _createClass(App, [{
    key: 'showList',
    value: function showList() {
      var list = $('.list');
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
  }, {
    key: 'clearMap',
    value: function clearMap() {
      var hideMarkers = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

      this.locations().filter(function (elem) {
        return elem.visible();
      }).forEach(function (elem) {
        elem.disabled(hideMarkers);
        elem.marker.setVisible(!hideMarkers);
      });
    }
  }, {
    key: 'clickRoute',
    value: function clickRoute() {
      var _this = this;

      this.showAlert(undefined, false);
      if (this.infoWindow) {
        this.resetActiveMarker();
        this.infoWindow.close();
        this.map.setCenter(this.center);
      }
      if (!this.routeDisplay) {
        this.routeDisplay = new google.maps.DirectionsRenderer({
          preserveViewport: true
        });
      } else {
        this.routeDisplay.setMap(null);
      }

      var visibleLocations = this.locations().filter(function (elem) {
        return elem.visible();
      });
      if (!visibleLocations.length) {
        this.showAlert(NO_ROUTE_ERROR_TEXT);
        return;
      }

      this.clearMap();

      var waypoints = visibleLocations //position of all visible locations except the first(origin) and last(destination) ones
      .slice(1, visibleLocations.length - 1).map(function (elem) {
        return {
          location: elem.marker.getPosition()
        };
      });
      new google.maps.DirectionsService().route({
        origin: visibleLocations[0].marker.getPosition(),
        destination: visibleLocations[visibleLocations.length - 1].marker.getPosition(),
        travelMode: google.maps.TravelMode.WALKING,
        waypoints: waypoints,
        optimizeWaypoints: true
      }, function (result, status) {
        if (status !== google.maps.DirectionsStatus.OK) {
          _this.showAlert(API_ERROR_TEXT);
        } else {
          _this.routeDisplay.setMap(_this.map);
          _this.routeDisplay.setDirections(result);
        }
      });
    }
  }, {
    key: 'clickClearRoute',
    value: function clickClearRoute() {
      if (!this.routeDisplay) {
        return;
      }

      this.showAlert(undefined, false);
      this.routeDisplay.setMap(null);
      this.clearMap(false);
    }
  }, {
    key: 'clickListItem',
    value: function clickListItem(location) {
      if (!location.disabled()) {
        App.getViewModel().clickLocation(location);
      }
    }
  }, {
    key: 'clickLocation',
    value: function clickLocation(location) {
      var _this2 = this;

      this.showAlert(undefined, false);
      if (this.infoWindow) {
        this.infoWindow.close();
      }
      this.animateMarker(location);
      var venueInfo = null;
      App.getVenueDetails(location).then(function (venue) {
        venueInfo = venue;
        return App.getVenuePhoto(venue.id);
      }).then(function (photo) {
        _this2.showInfo(venueInfo, photo, location.marker);
      }).catch(function (error) {
        _this2.resetActiveMarker();
        _this2.showAlert(FOURSQUARE_ERROR_TEXT + error.message);
      });
    }
  }, {
    key: 'resetActiveMarker',
    value: function resetActiveMarker() {
      var activeLocation = this.locations().filter(function (elem) {
        return elem.active();
      })[0];
      if (activeLocation) {
        activeLocation.marker.setIcon(this.defaultIcon);
        activeLocation.active(false);
      }
    }
  }, {
    key: 'animateMarker',
    value: function animateMarker(location) {
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
  }, {
    key: 'showInfo',
    value: function showInfo(venue, photo, marker) {
      var _this3 = this;

      var firstName = photo.user.firstName || '';
      var lastName = photo.user.lastName || '';
      if (!this.infoWindow) {
        this.infoWindow = new google.maps.InfoWindow();
      }
      this.infoWindow.setContent(INFO_WINDOW_CONTENT); //reset the content to prevent ugly rendering
      this.infoWindow.open(this.map, marker);
      google.maps.event.addListener(this.infoWindow, 'domready', function () {
        $('#info-header').text(venue.name);
        $('#info-img').attr('src', photo.prefix + 'height300' + photo.suffix);
        $('#address').text(venue.location.address);
        $('#author').text(firstName + ' ' + lastName);
      });
      google.maps.event.addListener(this.infoWindow, 'closeclick', function () {
        _this3.resetActiveMarker();
        _this3.map.setCenter(_this3.center);
      });
    }
  }, {
    key: 'searchList',
    value: function searchList() {
      this.showAlert(undefined, false);
      this.clickClearRoute();
      if (this.searchString().indexOf('\\') >= 0) {
        this.showAlert(SEARCH_ERROR_TEXT + '\\');
      } else {
        var regex = new RegExp(this.searchString(), 'i');
        var locations = this.locations();
        for (var i = 0; i < locations.length; i++) {
          var nameMatch = regex.test(locations[i].name);
          locations[i].visible(nameMatch);
          locations[i].marker.setVisible(nameMatch);
        }
      }
    }
  }, {
    key: 'setMapLoadError',
    value: function setMapLoadError(errorText) {
      this.loadStatus = mapStatus.MAP_LOAD_FAILURE;
      this.showAlert(errorText);
    }
  }, {
    key: 'showAlert',
    value: function showAlert(errorText) {
      var show = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

      this.alertText(errorText);
      this.alertVisible(show);
    }
  }, {
    key: 'showMap',
    value: function showMap() {
      var _this4 = this;

      return new Promise(function (resolve, reject) {
        if (!_this4.loadStatus) {
          reject();
        } else {
          _this4.map = new google.maps.Map($('#map').get(0), {
            center: _this4.center,
            zoom: _this4.zoom
          });
          //Since bounds are not calculated immediately, searching places
          // within bounds should be wrapped inside an event handler
          google.maps.event.addListener(_this4.map, 'bounds_changed', function () {
            google.maps.event.clearListeners(_this4.map, 'bounds_changed');
            var bounds = _this4.map.getBounds();
            new google.maps.places.PlacesService(_this4.map).textSearch({
              bounds: bounds,
              query: 'pub'
            }, function (results, status) {
              if (status === google.maps.places.PlacesServiceStatus.OK) {
                for (var i = 0; i < results.length && i < _this4.listLength; i++) {
                  var place = results[i];
                  _this4.addLocation(place);
                  //adjust to the viewport
                  if (place.geometry.viewport) {
                    bounds.union(place.geometry.viewport);
                  } else {
                    bounds.extend(place.geometry.location);
                  }
                  _this4.map.fitBounds(bounds);
                }
                //save a default icon to restore when clicked on another item(marker)
                _this4.defaultIcon = _this4.locations()[0].marker.getIcon();
                resolve();
              } else {
                reject(status);
              }
            });
          });
        }
      });
    }
  }, {
    key: 'addLocation',
    value: function addLocation(place) {
      var _this5 = this;

      var marker = new google.maps.Marker({
        map: this.map,
        position: place.geometry.location
      });
      var location = {
        visible: ko.observable(true),
        active: ko.observable(false),
        disabled: ko.observable(false),
        name: place.name,
        position: place.geometry.location,
        marker: marker
      };
      google.maps.event.addListener(marker, 'click', function () {
        _this5.clickLocation(location);
      });
      this.locations.push(location);
    }
  }], [{
    key: 'getViewModel',
    value: function getViewModel() {
      return ko.dataFor($('body').get(0));
    }
  }, {
    key: 'getVenueDetails',
    value: function getVenueDetails(location) {
      var position = location.position.toJSON();
      var err = new Error();
      err.name = fourSquareError.GET_VENUE_ERROR;
      return new Promise(function (resolve, reject) {
        $.ajax({
          url: 'https://api.foursquare.com/v2/venues/search?' + ('ll=' + position.lat + ',' + position.lng) + ('&query=' + location.name) + '&limit=1' + '&radius=100' + '&categoryID:4d4b7105d754a06374d81259,4bf58dd8d48988d116941735' + //cafes and restaurants, bars
          '&client_id=1MTN4O1BQ1OHRBQKO2NPNHYRXZZEBG5QSSEND0L41NDMW51E' + '&client_secret=POG3FQJYCMUH4Z24UG5GIRWXBVG5JIU1SL31QQMLUHFB2LUT' + '&v=20180101'
        }).done(function (data) {
          if (data.meta.code === 200 && data.response.venues.length) {
            resolve(data.response.venues[0]);
          } else {
            err.message = 'Foursquare cannot find the venue, code ' + data.meta.code;
            reject(err);
          }
        }).fail(function (error) {
          err.message = error.responseJSON ? error.responseJSON.meta.errorDetail : NET_ERROR_TEXT;
          reject(err);
        });
      });
    }
  }, {
    key: 'getVenuePhoto',
    value: function getVenuePhoto(venueID) {
      var err = new Error();
      err.name = fourSquareError.GET_PHOTO_ERROR;
      return new Promise(function (resolve, reject) {
        $.ajax({
          url: 'https://api.foursquare.com/v2/venues/' + venueID + '/photos?' + 'limit=1' + '&client_id=1MTN4O1BQ1OHRBQKO2NPNHYRXZZEBG5QSSEND0L41NDMW51E' + '&client_secret=POG3FQJYCMUH4Z24UG5GIRWXBVG5JIU1SL31QQMLUHFB2LUT' + '&v=20180101'
        }).done(function (data) {
          if (data.meta.code === 200 && data.response.photos.count) {
            resolve(data.response.photos.items[0]);
          } else {
            err.message = 'Foursquare cannot a venue\'s photo, code ' + data.meta.code;
            reject(err);
          }
        }).fail(function (error) {
          err.message = error.responseJSON ? error.responseJSON.meta.errorDetail : NET_ERROR_TEXT;
          reject(err);
        });
      });
    }
  }]);

  return App;
}();

// noinspection JSUnusedGlobalSymbols


function init() {
  //eslint-disable-line no-unused-vars
  var app = App.getViewModel();
  if (!app) {
    app = new App(mapStatus.MAP_LOAD_SUCCESS);
    ko.applyBindings(app, $('body').get(0));
  }
  //Before show the search field wait until the map is loaded without errors
  app.showMap().then(function () {
    app.searchVisible(true);
  }).catch(function (status) {
    app.setMapLoadError(API_ERROR_TEXT + status);
  });
}

function mapError() {
  //eslint-disable-line no-unused-vars
  var app = App.getViewModel();
  if (!app) {
    app = new App(mapStatus.MAP_LOAD_FAILURE, NET_ERROR_TEXT);
    ko.applyBindings(app, $('body').get(0));
  } else {
    app.setMapLoadError(NET_ERROR_TEXT);
  }
}

// noinspection JSUnusedGlobalSymbols
function gm_authFailure() {
  //eslint-disable-line no-unused-vars
  var app = App.getViewModel();
  if (!app) {
    app = new App(mapStatus.MAP_LOAD_FAILURE, AUTH_ERROR_TEXT);
    ko.applyBindings(app, $('body').get(0));
  } else {
    app.setMapLoadError(AUTH_ERROR_TEXT);
  }
}