# Pub Crawling Guide

## Application

### How to start
#### Online
Click on the [link](https://sapville.github.io/udacity-neighborhood-map/).
#### Locally
1. Clone the project from [GitHub](https://github.com/sapville/udacity-neighborhood-map.git)
2. Open file index.html in your browser.
### Layout
The application contains three areas:
- Map
- Locations list
- Header
#### Map
The map depicts Temple Bar district in Dublin, Ireland and 20 markers indicating the most popular bars of the district according to Google.
#### Location list
The list with locations is situated at the left side of the screen. It consists of the names of locations displayed on the map. In mobile mode the list is hidden. A user can show and hide the list by clicking on a button with hamburger icon.
#### Header
The header area includes the field where a user types in a search string and two buttons controlling route rendering. When the application is run on a mobile device the header is hidden. A user can show and hide the header by clicking on a button with hamburger icon.
### How to use
By default the application shows on the map 20 markers pointing to pubs. Each marker is represented by a list item which shows the name of the pub.

When a marker or a respective list item is clicked on, the following takes place:
- the marker bounces;
- the marker changes the shape;
- the list item turns blue;
- the info window is displayed.

The info window contains the following information about the pub provided by [Foursquare](foursquare.com):
- the name of the pub;
- the photo of the pub posted by a Foursquare user;
- the name of the photo's author.

If the information cannot be found on Foursquare, error message is shown. It disappears when any action is taken by a user.

While a user is entering a search string in a field, the list items are being filtered by their shown names. The application searching names containing the search string regardless of its register. The respective markers on the map are filtered as well.

When a user presses button "Plan your trip" the map returns to its original zoom and a shortest route is drawn through the shown markers. The markers are changed to green ones with letters on them indicating their order. When clicked on, these markers do not show the information window with Foursquare data. Instead the address is displayed. The list items are unable to be clicked.

When a user presses button "Clear the route" the route is erased from the map and markers along with list items return to their original state.

Also the route is cleared when a user starts typing in a search string in the filter field.
## Development
### Libraries
The application uses the following libraries:
- Bootstrap v.3.3.7
- jQuery v.3.2.1
- KnockoutJS v.3.4.2
- Google API Maps
- Google API Places
- Foursquare API
### Supported browsers
The application was tested in the following browsers:
- Google Chrome v.63
- Internet Explorer v.11
- Edge v.41
- Mozilla Firefox v.59
- Google Chrome for Android v.63
### Transpiling
To support older browsers (such as IE) javascript code was transpiled from the ECMAScript6 source to ECMAScript5.1 production code by means of Babel transpiler.

The source is placed in file "js/app.js", the production code is placed in folder "dist/app.js".
