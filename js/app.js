class App {
  constructor (param) {
    this.param = param;
  }

  inColor (elem) {
    $(elem).toggleClass(this.param);
  }

}

function main () { //eslint-disable-line no-unused-vars
  const app = new App('blue');
  $('h1').click(() => {app.inColor('h1');}) ;
}
