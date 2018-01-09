// import ko from 'js/knockout-3.4.2';

/*
global
ko
*/

(function () {
  const script = document.createElement('script');
  script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBOPYXNAFOVDoakdOLtdqpI71E3erG-RkQ&callback=init&v=3';
  script.defer = true;
  document.head.appendChild(script);
  script.onerror = function (event) {
    console.log('onerror', event);
  };
})();

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
  console.log('init');
}

function mapError (message, source, lineno, colno, error) { //eslint-disable-line no-unused-vars
  console.log(message);
  const app = new App(App.mapStatus().MAP_LOAD_FAILURE);
  ko.applyBindings(app);
}

function gm_authFailure (error) { console.log('Auth error');}
