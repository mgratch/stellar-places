/**
 * jQuery Geocoding and Places Autocomplete Plugin - V 1.5.0
 *
 * @author Martin Kleppe <kleppe@ubilabs.net>, 2012
 * @author Ubilabs http://ubilabs.net, 2012
 * @license MIT License <http://www.opensource.org/licenses/mit-license.php>
 */

// # $.geocomplete()
// ## jQuery Geocoding and Places Autocomplete Plugin - V 1.5.0
//
// * https://github.com/ubilabs/geocomplete/
// * by Martin Kleppe <kleppe@ubilabs.net>

(function($, window, document, undefined){

  // ## Options
  // The default options for this plugin.
  //
  // * `map` - Might be a selector, an jQuery object or a DOM element. Default is `false` which shows no map.
  // * `details` - The container that should be populated with data. Defaults to `false` which ignores the setting.
  // * `location` - Location to initialize the map on. Might be an address `string` or an `array` with [latitude, longitude] or a `google.maps.LatLng`object. Default is `false` which shows a blank map.
  // * `bounds` - Whether to snap geocode search to map bounds. Default: `true` if false search globally. Alternatively pass a custom `LatLngBounds object.
  // * `autoselect` - Automatically selects the highlighted item or the first item from the suggestions list on Enter.
  // * `detailsAttribute` - The attribute's name to use as an indicator. Default: `"name"`
  // * `mapOptions` - Options to pass to the `google.maps.Map` constructor. See the full list [here](http://code.google.com/apis/maps/documentation/javascript/reference.html#MapOptions).
  // * `mapOptions.zoom` - The inital zoom level. Default: `14`
  // * `mapOptions.scrollwheel` - Whether to enable the scrollwheel to zoom the map. Default: `false`
  // * `mapOptions.mapTypeId` - The map type. Default: `"roadmap"`
  // * `markerOptions` - The options to pass to the `google.maps.Marker` constructor. See the full list [here](http://code.google.com/apis/maps/documentation/javascript/reference.html#MarkerOptions).
  // * `markerOptions.draggable` - If the marker is draggable. Default: `false`. Set to true to enable dragging.
  // * `markerOptions.disabled` - Do not show marker. Default: `false`. Set to true to disable marker.
  // * `maxZoom` - The maximum zoom level too zoom in after a geocoding response. Default: `16`
  // * `types` - An array containing one or more of the supported types for the places request. Default: `['geocode']` See the full list [here](http://code.google.com/apis/maps/documentation/javascript/places.html#place_search_requests).

  var defaults = {
    bounds: true,
    country: null,
    map: false,
    details: false,
    detailsAttribute: "name",
    autoselect: true,
    location: false,

    mapOptions: {
      zoom: 14,
      scrollwheel: false,
      mapTypeId: "roadmap"
    },

    markerOptions: {
      draggable: false
    },

    maxZoom: 16,
    types: ['geocode'],
    blur: false
  };

  // See: [Geocoding Types](https://developers.google.com/maps/documentation/geocoding/#Types)
  // on Google Developers.
  var componentTypes = ("street_address route intersection political " +
    "country administrative_area_level_1 administrative_area_level_2 " +
    "administrative_area_level_3 colloquial_area locality sublocality " +
    "neighborhood premise subpremise postal_code natural_feature airport " +
    "park point_of_interest post_box street_number floor room " +
    "lat lng viewport location " +
    "formatted_address location_type bounds").split(" ");

  // See: [Places Details Responses](https://developers.google.com/maps/documentation/javascript/places#place_details_responses)
  // on Google Developers.
  var placesDetails = ("id url website vicinity reference name rating " +
    "international_phone_number icon formatted_phone_number").split(" ");

  // The actual plugin constructor.
  function GeoComplete(input, options) {

    this.options = $.extend(true, {}, defaults, options);

    this.input = input;
    this.$input = $(input);

    this._defaults = defaults;
    this._name = 'geocomplete';

    this.init();
  }

  // Initialize all parts of the plugin.
  $.extend(GeoComplete.prototype, {
    init: function(){
      this.initMap();
      this.initMarker();
      this.initGeocoder();
      this.initDetails();
      this.initLocation();
    },

    // Initialize the map but only if the option `map` was set.
    // This will create a `map` within the given container
    // using the provided `mapOptions` or link to the existing map instance.
    initMap: function(){
      if (!this.options.map){ return; }

      if (typeof this.options.map.setCenter == "function"){
        this.map = this.options.map;
        return;
      }

      this.map = new google.maps.Map(
        $(this.options.map)[0],
        this.options.mapOptions
      );

      // add click event listener on the map
      google.maps.event.addListener(
        this.map,
        'click',
        $.proxy(this.mapClicked, this)
      );

      google.maps.event.addListener(
        this.map,
        'zoom_changed',
        $.proxy(this.mapZoomed, this)
      );
    },

    // Add a marker with the provided `markerOptions` but only
    // if the option was set. Additionally it listens for the `dragend` event
    // to notify the plugin about changes.
    initMarker: function(){
      if (!this.map){ return; }
      var options = $.extend(this.options.markerOptions, { map: this.map });

      if (options.disabled){ return; }

      this.marker = new google.maps.Marker(options);

      google.maps.event.addListener(
        this.marker,
        'dragend',
        $.proxy(this.markerDragged, this)
      );
    },

    // Associate the input with the autocompleter and create a geocoder
    // to fall back when the autocompleter does not return a value.
    initGeocoder: function(){

      var options = {
        types: this.options.types,
        bounds: this.options.bounds === true ? null : this.options.bounds,
        componentRestrictions: this.options.componentRestrictions
      };

      if (this.options.country){
        options.componentRestrictions = {country: this.options.country};
      }

      this.autocomplete = new google.maps.places.Autocomplete(
        this.input, options
      );

      this.geocoder = new google.maps.Geocoder();

      // Bind autocomplete to map bounds but only if there is a map
      // and `options.bindToMap` is set to true.
      if (this.map && this.options.bounds === true){
        this.autocomplete.bindTo('bounds', this.map);
      }

      // Watch `place_changed` events on the autocomplete input field.
      google.maps.event.addListener(
        this.autocomplete,
        'place_changed',
        $.proxy(this.placeChanged, this)
      );

      // Prevent parent form from being submitted if user hit enter.
      this.$input.keypress(function(event){
        if (event.keyCode === 13){ return false; }
      });

      // Listen for "geocode" events and trigger find action.
      this.$input.bind("geocode", $.proxy(function(){
        this.find();
      }, this));

      // Trigger find action when input element is blured out.
      // (Usefull for typing partial location and tabing to the next field
      // or clicking somewhere else.)
      if (this.options.blur === true){
        this.$input.blur($.proxy(function(){
          this.find();
        }, this));
      }
    },

    // Prepare a given DOM structure to be populated when we got some data.
    // This will cycle through the list of component types and map the
    // corresponding elements.
    initDetails: function(){
      if (!this.options.details){ return; }

      var $details = $(this.options.details),
        attribute = this.options.detailsAttribute,
        details = {};

      function setDetail(value){
        details[value] = $details.find("[" +  attribute + "=" + value + "]");
      }

      $.each(componentTypes, function(index, key){
        setDetail(key);
        setDetail(key + "_short");
      });

      $.each(placesDetails, function(index, key){
        setDetail(key);
      });

      this.$details = $details;
      this.details = details;
    },

    // Set the initial location of the plugin if the `location` options was set.
    // This method will care about converting the value into the right format.
    initLocation: function() {

      var location = this.options.location, latLng;

      if (!location) { return; }

      if (typeof location == 'string') {
        this.find(location);
        return;
      }

      if (location instanceof Array) {
        latLng = new google.maps.LatLng(location[0], location[1]);
      }

      if (location instanceof google.maps.LatLng){
        latLng = location;
      }

      if (latLng){
        if (this.map){ this.map.setCenter(latLng); }
        if (this.marker){ this.marker.setPosition(latLng); }
      }
    },

    // Look up a given address. If no `address` was specified it uses
    // the current value of the input.
    find: function(address){
      this.geocode({
        address: address || this.$input.val()
      });
    },

    // Requests details about a given location.
    // Additionally it will bias the requests to the provided bounds.
    geocode: function(request){
      if (this.options.bounds && !request.bounds){
        if (this.options.bounds === true){
          request.bounds = this.map && this.map.getBounds();
        } else {
          request.bounds = this.options.bounds;
        }
      }

      if (this.options.country){
        request.region = this.options.country;
      }

      this.geocoder.geocode(request, $.proxy(this.handleGeocode, this));
    },

    // Get the selected result. If no result is selected on the list, then get
    // the first result from the list.
    selectFirstResult: function() {
      //$(".pac-container").hide();

      var selected = '';
      // Check if any result is selected.
      if ($(".pac-item-selected")['0']) {
        selected = '-selected';
      }

      // Get the first suggestion's text.
      var $span1 = $(".pac-container .pac-item" + selected + ":first span:nth-child(2)").text();
      var $span2 = $(".pac-container .pac-item" + selected + ":first span:nth-child(3)").text();

      // Adds the additional information, if available.
      var firstResult = $span1;
      if ($span2) {
        firstResult += " - " + $span2;
      }

      this.$input.val(firstResult);

      return firstResult;
    },

    // Handles the geocode response. If more than one results was found
    // it triggers the "geocode:multiple" events. If there was an error
    // the "geocode:error" event is fired.
    handleGeocode: function(results, status){
      if (status === google.maps.GeocoderStatus.OK) {
        var result = results[0];
        this.$input.val(result.formatted_address);
        this.update(result);

        if (results.length > 1){
          this.trigger("geocode:multiple", results);
        }

      } else {
        this.trigger("geocode:error", status);
      }
    },

    // Triggers a given `event` with optional `arguments` on the input.
    trigger: function(event, argument){
      this.$input.trigger(event, [argument]);
    },

    // Set the map to a new center by passing a `geometry`.
    // If the geometry has a viewport, the map zooms out to fit the bounds.
    // Additionally it updates the marker position.
    center: function(geometry){

      if (geometry.viewport){
        this.map.fitBounds(geometry.viewport);
        if (this.map.getZoom() > this.options.maxZoom){
          this.map.setZoom(this.options.maxZoom);
        }
      } else {
        this.map.setZoom(this.options.maxZoom);
        this.map.setCenter(geometry.location);
      }

      if (this.marker){
        this.marker.setPosition(geometry.location);
        this.marker.setAnimation(this.options.markerOptions.animation);
      }
    },

    // Update the elements based on a single places or geoocoding response
    // and trigger the "geocode:result" event on the input.
    update: function(result){

      if (this.map){
        this.center(result.geometry);
      }

      if (this.$details){
        this.fillDetails(result);
      }

      this.trigger("geocode:result", result);
    },

    // Populate the provided elements with new `result` data.
    // This will lookup all elements that has an attribute with the given
    // component type.
    fillDetails: function(result){

      var data = {},
        geometry = result.geometry,
        viewport = geometry.viewport,
        bounds = geometry.bounds;

      // Create a simplified version of the address components.
      $.each(result.address_components, function(index, object){
        var name = object.types[0];
        data[name] = object.long_name;
        data[name + "_short"] = object.short_name;
      });

      // Add properties of the places details.
      $.each(placesDetails, function(index, key){
        data[key] = result[key];
      });

      // Add infos about the address and geometry.
      $.extend(data, {
        formatted_address: result.formatted_address,
	      street_address: [data.street_number, data.route]
		      .filter(function ( val ) {return 'string' === typeof val;}).join(' '),
        location_type: geometry.location_type || "PLACES",
        viewport: viewport,
        bounds: bounds,
        location: geometry.location,
        lat: geometry.location.lat(),
        lng: geometry.location.lng()
      });

      // Set the values for all details.
      $.each(this.details, $.proxy(function(key, $detail){
        var value = data[key];
        this.setDetail($detail, value);
      }, this));

      this.data = data;
    },

    // Assign a given `value` to a single `$element`.
    // If the element is an input, the value is set, otherwise it updates
    // the text content.
    setDetail: function($element, value){

      if (value === undefined){
        value = "";
      } else if (typeof value.toUrlValue == "function"){
        value = value.toUrlValue();
      }

      if ($element.is(":input")){
        $element.val(value);
      } else {
        $element.text(value);
      }
    },

    // Fire the "geocode:dragged" event and pass the new position.
    markerDragged: function(event){
      this.trigger("geocode:dragged", event.latLng);
    },

    mapClicked: function(event) {
        this.trigger("geocode:click", event.latLng);
    },

    mapZoomed: function(event) {
      this.trigger("geocode:zoom", this.map.getZoom());
    },

    // Restore the old position of the marker to the last now location.
    resetMarker: function(){
      this.marker.setPosition(this.data.location);
      this.setDetail(this.details.lat, this.data.location.lat());
      this.setDetail(this.details.lng, this.data.location.lng());
    },

    // Update the plugin after the user has selected an autocomplete entry.
    // If the place has no geometry it passes it to the geocoder.
    placeChanged: function(){
      var place = this.autocomplete.getPlace();

      if (!place || !place.geometry){
        if (this.options.autoselect) {
          // Automatically selects the highlighted item or the first item from the
          // suggestions list.
          var autoSelection = this.selectFirstResult();
          this.find(autoSelection);
        }
      } else {
        // Use the input text if it already gives geometry.
        this.update(place);
      }
    }
  });

  // A plugin wrapper around the constructor.
  // Pass `options` with all settings that are different from the default.
  // The attribute is used to prevent multiple instantiations of the plugin.
  $.fn.geocomplete = function(options) {

    var attribute = 'plugin_geocomplete';

    // If you call `.geocomplete()` with a string as the first parameter
    // it returns the corresponding property or calls the method with the
    // following arguments.
    if (typeof options == "string"){

      var instance = $(this).data(attribute) || $(this).geocomplete().data(attribute),
        prop = instance[options];

      if (typeof prop == "function"){
        prop.apply(instance, Array.prototype.slice.call(arguments, 1));
        return $(this);
      } else {
        if (arguments.length == 2){
          prop = arguments[1];
        }
        return prop;
      }
    } else {
      return this.each(function() {
        // Prevent against multiple instantiations.
        var instance = $.data(this, attribute);
        if (!instance) {
          instance = new GeoComplete( this, options );
          $.data(this, attribute, instance);
        }
      });
    }
  };

})( jQuery, window, document );

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJqcXVlcnkuZ2VvY29tcGxldGUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIGpRdWVyeSBHZW9jb2RpbmcgYW5kIFBsYWNlcyBBdXRvY29tcGxldGUgUGx1Z2luIC0gViAxLjUuMFxyXG4gKlxyXG4gKiBAYXV0aG9yIE1hcnRpbiBLbGVwcGUgPGtsZXBwZUB1YmlsYWJzLm5ldD4sIDIwMTJcclxuICogQGF1dGhvciBVYmlsYWJzIGh0dHA6Ly91YmlsYWJzLm5ldCwgMjAxMlxyXG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZSA8aHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5waHA+XHJcbiAqL1xyXG5cclxuLy8gIyAkLmdlb2NvbXBsZXRlKClcclxuLy8gIyMgalF1ZXJ5IEdlb2NvZGluZyBhbmQgUGxhY2VzIEF1dG9jb21wbGV0ZSBQbHVnaW4gLSBWIDEuNS4wXHJcbi8vXHJcbi8vICogaHR0cHM6Ly9naXRodWIuY29tL3ViaWxhYnMvZ2VvY29tcGxldGUvXHJcbi8vICogYnkgTWFydGluIEtsZXBwZSA8a2xlcHBlQHViaWxhYnMubmV0PlxyXG5cclxuKGZ1bmN0aW9uKCQsIHdpbmRvdywgZG9jdW1lbnQsIHVuZGVmaW5lZCl7XHJcblxyXG4gIC8vICMjIE9wdGlvbnNcclxuICAvLyBUaGUgZGVmYXVsdCBvcHRpb25zIGZvciB0aGlzIHBsdWdpbi5cclxuICAvL1xyXG4gIC8vICogYG1hcGAgLSBNaWdodCBiZSBhIHNlbGVjdG9yLCBhbiBqUXVlcnkgb2JqZWN0IG9yIGEgRE9NIGVsZW1lbnQuIERlZmF1bHQgaXMgYGZhbHNlYCB3aGljaCBzaG93cyBubyBtYXAuXHJcbiAgLy8gKiBgZGV0YWlsc2AgLSBUaGUgY29udGFpbmVyIHRoYXQgc2hvdWxkIGJlIHBvcHVsYXRlZCB3aXRoIGRhdGEuIERlZmF1bHRzIHRvIGBmYWxzZWAgd2hpY2ggaWdub3JlcyB0aGUgc2V0dGluZy5cclxuICAvLyAqIGBsb2NhdGlvbmAgLSBMb2NhdGlvbiB0byBpbml0aWFsaXplIHRoZSBtYXAgb24uIE1pZ2h0IGJlIGFuIGFkZHJlc3MgYHN0cmluZ2Agb3IgYW4gYGFycmF5YCB3aXRoIFtsYXRpdHVkZSwgbG9uZ2l0dWRlXSBvciBhIGBnb29nbGUubWFwcy5MYXRMbmdgb2JqZWN0LiBEZWZhdWx0IGlzIGBmYWxzZWAgd2hpY2ggc2hvd3MgYSBibGFuayBtYXAuXHJcbiAgLy8gKiBgYm91bmRzYCAtIFdoZXRoZXIgdG8gc25hcCBnZW9jb2RlIHNlYXJjaCB0byBtYXAgYm91bmRzLiBEZWZhdWx0OiBgdHJ1ZWAgaWYgZmFsc2Ugc2VhcmNoIGdsb2JhbGx5LiBBbHRlcm5hdGl2ZWx5IHBhc3MgYSBjdXN0b20gYExhdExuZ0JvdW5kcyBvYmplY3QuXHJcbiAgLy8gKiBgYXV0b3NlbGVjdGAgLSBBdXRvbWF0aWNhbGx5IHNlbGVjdHMgdGhlIGhpZ2hsaWdodGVkIGl0ZW0gb3IgdGhlIGZpcnN0IGl0ZW0gZnJvbSB0aGUgc3VnZ2VzdGlvbnMgbGlzdCBvbiBFbnRlci5cclxuICAvLyAqIGBkZXRhaWxzQXR0cmlidXRlYCAtIFRoZSBhdHRyaWJ1dGUncyBuYW1lIHRvIHVzZSBhcyBhbiBpbmRpY2F0b3IuIERlZmF1bHQ6IGBcIm5hbWVcImBcclxuICAvLyAqIGBtYXBPcHRpb25zYCAtIE9wdGlvbnMgdG8gcGFzcyB0byB0aGUgYGdvb2dsZS5tYXBzLk1hcGAgY29uc3RydWN0b3IuIFNlZSB0aGUgZnVsbCBsaXN0IFtoZXJlXShodHRwOi8vY29kZS5nb29nbGUuY29tL2FwaXMvbWFwcy9kb2N1bWVudGF0aW9uL2phdmFzY3JpcHQvcmVmZXJlbmNlLmh0bWwjTWFwT3B0aW9ucykuXHJcbiAgLy8gKiBgbWFwT3B0aW9ucy56b29tYCAtIFRoZSBpbml0YWwgem9vbSBsZXZlbC4gRGVmYXVsdDogYDE0YFxyXG4gIC8vICogYG1hcE9wdGlvbnMuc2Nyb2xsd2hlZWxgIC0gV2hldGhlciB0byBlbmFibGUgdGhlIHNjcm9sbHdoZWVsIHRvIHpvb20gdGhlIG1hcC4gRGVmYXVsdDogYGZhbHNlYFxyXG4gIC8vICogYG1hcE9wdGlvbnMubWFwVHlwZUlkYCAtIFRoZSBtYXAgdHlwZS4gRGVmYXVsdDogYFwicm9hZG1hcFwiYFxyXG4gIC8vICogYG1hcmtlck9wdGlvbnNgIC0gVGhlIG9wdGlvbnMgdG8gcGFzcyB0byB0aGUgYGdvb2dsZS5tYXBzLk1hcmtlcmAgY29uc3RydWN0b3IuIFNlZSB0aGUgZnVsbCBsaXN0IFtoZXJlXShodHRwOi8vY29kZS5nb29nbGUuY29tL2FwaXMvbWFwcy9kb2N1bWVudGF0aW9uL2phdmFzY3JpcHQvcmVmZXJlbmNlLmh0bWwjTWFya2VyT3B0aW9ucykuXHJcbiAgLy8gKiBgbWFya2VyT3B0aW9ucy5kcmFnZ2FibGVgIC0gSWYgdGhlIG1hcmtlciBpcyBkcmFnZ2FibGUuIERlZmF1bHQ6IGBmYWxzZWAuIFNldCB0byB0cnVlIHRvIGVuYWJsZSBkcmFnZ2luZy5cclxuICAvLyAqIGBtYXJrZXJPcHRpb25zLmRpc2FibGVkYCAtIERvIG5vdCBzaG93IG1hcmtlci4gRGVmYXVsdDogYGZhbHNlYC4gU2V0IHRvIHRydWUgdG8gZGlzYWJsZSBtYXJrZXIuXHJcbiAgLy8gKiBgbWF4Wm9vbWAgLSBUaGUgbWF4aW11bSB6b29tIGxldmVsIHRvbyB6b29tIGluIGFmdGVyIGEgZ2VvY29kaW5nIHJlc3BvbnNlLiBEZWZhdWx0OiBgMTZgXHJcbiAgLy8gKiBgdHlwZXNgIC0gQW4gYXJyYXkgY29udGFpbmluZyBvbmUgb3IgbW9yZSBvZiB0aGUgc3VwcG9ydGVkIHR5cGVzIGZvciB0aGUgcGxhY2VzIHJlcXVlc3QuIERlZmF1bHQ6IGBbJ2dlb2NvZGUnXWAgU2VlIHRoZSBmdWxsIGxpc3QgW2hlcmVdKGh0dHA6Ly9jb2RlLmdvb2dsZS5jb20vYXBpcy9tYXBzL2RvY3VtZW50YXRpb24vamF2YXNjcmlwdC9wbGFjZXMuaHRtbCNwbGFjZV9zZWFyY2hfcmVxdWVzdHMpLlxyXG5cclxuICB2YXIgZGVmYXVsdHMgPSB7XHJcbiAgICBib3VuZHM6IHRydWUsXHJcbiAgICBjb3VudHJ5OiBudWxsLFxyXG4gICAgbWFwOiBmYWxzZSxcclxuICAgIGRldGFpbHM6IGZhbHNlLFxyXG4gICAgZGV0YWlsc0F0dHJpYnV0ZTogXCJuYW1lXCIsXHJcbiAgICBhdXRvc2VsZWN0OiB0cnVlLFxyXG4gICAgbG9jYXRpb246IGZhbHNlLFxyXG5cclxuICAgIG1hcE9wdGlvbnM6IHtcclxuICAgICAgem9vbTogMTQsXHJcbiAgICAgIHNjcm9sbHdoZWVsOiBmYWxzZSxcclxuICAgICAgbWFwVHlwZUlkOiBcInJvYWRtYXBcIlxyXG4gICAgfSxcclxuXHJcbiAgICBtYXJrZXJPcHRpb25zOiB7XHJcbiAgICAgIGRyYWdnYWJsZTogZmFsc2VcclxuICAgIH0sXHJcblxyXG4gICAgbWF4Wm9vbTogMTYsXHJcbiAgICB0eXBlczogWydnZW9jb2RlJ10sXHJcbiAgICBibHVyOiBmYWxzZVxyXG4gIH07XHJcblxyXG4gIC8vIFNlZTogW0dlb2NvZGluZyBUeXBlc10oaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20vbWFwcy9kb2N1bWVudGF0aW9uL2dlb2NvZGluZy8jVHlwZXMpXHJcbiAgLy8gb24gR29vZ2xlIERldmVsb3BlcnMuXHJcbiAgdmFyIGNvbXBvbmVudFR5cGVzID0gKFwic3RyZWV0X2FkZHJlc3Mgcm91dGUgaW50ZXJzZWN0aW9uIHBvbGl0aWNhbCBcIiArXHJcbiAgICBcImNvdW50cnkgYWRtaW5pc3RyYXRpdmVfYXJlYV9sZXZlbF8xIGFkbWluaXN0cmF0aXZlX2FyZWFfbGV2ZWxfMiBcIiArXHJcbiAgICBcImFkbWluaXN0cmF0aXZlX2FyZWFfbGV2ZWxfMyBjb2xsb3F1aWFsX2FyZWEgbG9jYWxpdHkgc3VibG9jYWxpdHkgXCIgK1xyXG4gICAgXCJuZWlnaGJvcmhvb2QgcHJlbWlzZSBzdWJwcmVtaXNlIHBvc3RhbF9jb2RlIG5hdHVyYWxfZmVhdHVyZSBhaXJwb3J0IFwiICtcclxuICAgIFwicGFyayBwb2ludF9vZl9pbnRlcmVzdCBwb3N0X2JveCBzdHJlZXRfbnVtYmVyIGZsb29yIHJvb20gXCIgK1xyXG4gICAgXCJsYXQgbG5nIHZpZXdwb3J0IGxvY2F0aW9uIFwiICtcclxuICAgIFwiZm9ybWF0dGVkX2FkZHJlc3MgbG9jYXRpb25fdHlwZSBib3VuZHNcIikuc3BsaXQoXCIgXCIpO1xyXG5cclxuICAvLyBTZWU6IFtQbGFjZXMgRGV0YWlscyBSZXNwb25zZXNdKGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL21hcHMvZG9jdW1lbnRhdGlvbi9qYXZhc2NyaXB0L3BsYWNlcyNwbGFjZV9kZXRhaWxzX3Jlc3BvbnNlcylcclxuICAvLyBvbiBHb29nbGUgRGV2ZWxvcGVycy5cclxuICB2YXIgcGxhY2VzRGV0YWlscyA9IChcImlkIHVybCB3ZWJzaXRlIHZpY2luaXR5IHJlZmVyZW5jZSBuYW1lIHJhdGluZyBcIiArXHJcbiAgICBcImludGVybmF0aW9uYWxfcGhvbmVfbnVtYmVyIGljb24gZm9ybWF0dGVkX3Bob25lX251bWJlclwiKS5zcGxpdChcIiBcIik7XHJcblxyXG4gIC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yLlxyXG4gIGZ1bmN0aW9uIEdlb0NvbXBsZXRlKGlucHV0LCBvcHRpb25zKSB7XHJcblxyXG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRpb25zKTtcclxuXHJcbiAgICB0aGlzLmlucHV0ID0gaW5wdXQ7XHJcbiAgICB0aGlzLiRpbnB1dCA9ICQoaW5wdXQpO1xyXG5cclxuICAgIHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XHJcbiAgICB0aGlzLl9uYW1lID0gJ2dlb2NvbXBsZXRlJztcclxuXHJcbiAgICB0aGlzLmluaXQoKTtcclxuICB9XHJcblxyXG4gIC8vIEluaXRpYWxpemUgYWxsIHBhcnRzIG9mIHRoZSBwbHVnaW4uXHJcbiAgJC5leHRlbmQoR2VvQ29tcGxldGUucHJvdG90eXBlLCB7XHJcbiAgICBpbml0OiBmdW5jdGlvbigpe1xyXG4gICAgICB0aGlzLmluaXRNYXAoKTtcclxuICAgICAgdGhpcy5pbml0TWFya2VyKCk7XHJcbiAgICAgIHRoaXMuaW5pdEdlb2NvZGVyKCk7XHJcbiAgICAgIHRoaXMuaW5pdERldGFpbHMoKTtcclxuICAgICAgdGhpcy5pbml0TG9jYXRpb24oKTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gSW5pdGlhbGl6ZSB0aGUgbWFwIGJ1dCBvbmx5IGlmIHRoZSBvcHRpb24gYG1hcGAgd2FzIHNldC5cclxuICAgIC8vIFRoaXMgd2lsbCBjcmVhdGUgYSBgbWFwYCB3aXRoaW4gdGhlIGdpdmVuIGNvbnRhaW5lclxyXG4gICAgLy8gdXNpbmcgdGhlIHByb3ZpZGVkIGBtYXBPcHRpb25zYCBvciBsaW5rIHRvIHRoZSBleGlzdGluZyBtYXAgaW5zdGFuY2UuXHJcbiAgICBpbml0TWFwOiBmdW5jdGlvbigpe1xyXG4gICAgICBpZiAoIXRoaXMub3B0aW9ucy5tYXApeyByZXR1cm47IH1cclxuXHJcbiAgICAgIGlmICh0eXBlb2YgdGhpcy5vcHRpb25zLm1hcC5zZXRDZW50ZXIgPT0gXCJmdW5jdGlvblwiKXtcclxuICAgICAgICB0aGlzLm1hcCA9IHRoaXMub3B0aW9ucy5tYXA7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLm1hcCA9IG5ldyBnb29nbGUubWFwcy5NYXAoXHJcbiAgICAgICAgJCh0aGlzLm9wdGlvbnMubWFwKVswXSxcclxuICAgICAgICB0aGlzLm9wdGlvbnMubWFwT3B0aW9uc1xyXG4gICAgICApO1xyXG5cclxuICAgICAgLy8gYWRkIGNsaWNrIGV2ZW50IGxpc3RlbmVyIG9uIHRoZSBtYXBcclxuICAgICAgZ29vZ2xlLm1hcHMuZXZlbnQuYWRkTGlzdGVuZXIoXHJcbiAgICAgICAgdGhpcy5tYXAsXHJcbiAgICAgICAgJ2NsaWNrJyxcclxuICAgICAgICAkLnByb3h5KHRoaXMubWFwQ2xpY2tlZCwgdGhpcylcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKFxyXG4gICAgICAgIHRoaXMubWFwLFxyXG4gICAgICAgICd6b29tX2NoYW5nZWQnLFxyXG4gICAgICAgICQucHJveHkodGhpcy5tYXBab29tZWQsIHRoaXMpXHJcbiAgICAgICk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIEFkZCBhIG1hcmtlciB3aXRoIHRoZSBwcm92aWRlZCBgbWFya2VyT3B0aW9uc2AgYnV0IG9ubHlcclxuICAgIC8vIGlmIHRoZSBvcHRpb24gd2FzIHNldC4gQWRkaXRpb25hbGx5IGl0IGxpc3RlbnMgZm9yIHRoZSBgZHJhZ2VuZGAgZXZlbnRcclxuICAgIC8vIHRvIG5vdGlmeSB0aGUgcGx1Z2luIGFib3V0IGNoYW5nZXMuXHJcbiAgICBpbml0TWFya2VyOiBmdW5jdGlvbigpe1xyXG4gICAgICBpZiAoIXRoaXMubWFwKXsgcmV0dXJuOyB9XHJcbiAgICAgIHZhciBvcHRpb25zID0gJC5leHRlbmQodGhpcy5vcHRpb25zLm1hcmtlck9wdGlvbnMsIHsgbWFwOiB0aGlzLm1hcCB9KTtcclxuXHJcbiAgICAgIGlmIChvcHRpb25zLmRpc2FibGVkKXsgcmV0dXJuOyB9XHJcblxyXG4gICAgICB0aGlzLm1hcmtlciA9IG5ldyBnb29nbGUubWFwcy5NYXJrZXIob3B0aW9ucyk7XHJcblxyXG4gICAgICBnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcihcclxuICAgICAgICB0aGlzLm1hcmtlcixcclxuICAgICAgICAnZHJhZ2VuZCcsXHJcbiAgICAgICAgJC5wcm94eSh0aGlzLm1hcmtlckRyYWdnZWQsIHRoaXMpXHJcbiAgICAgICk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIEFzc29jaWF0ZSB0aGUgaW5wdXQgd2l0aCB0aGUgYXV0b2NvbXBsZXRlciBhbmQgY3JlYXRlIGEgZ2VvY29kZXJcclxuICAgIC8vIHRvIGZhbGwgYmFjayB3aGVuIHRoZSBhdXRvY29tcGxldGVyIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxyXG4gICAgaW5pdEdlb2NvZGVyOiBmdW5jdGlvbigpe1xyXG5cclxuICAgICAgdmFyIG9wdGlvbnMgPSB7XHJcbiAgICAgICAgdHlwZXM6IHRoaXMub3B0aW9ucy50eXBlcyxcclxuICAgICAgICBib3VuZHM6IHRoaXMub3B0aW9ucy5ib3VuZHMgPT09IHRydWUgPyBudWxsIDogdGhpcy5vcHRpb25zLmJvdW5kcyxcclxuICAgICAgICBjb21wb25lbnRSZXN0cmljdGlvbnM6IHRoaXMub3B0aW9ucy5jb21wb25lbnRSZXN0cmljdGlvbnNcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuY291bnRyeSl7XHJcbiAgICAgICAgb3B0aW9ucy5jb21wb25lbnRSZXN0cmljdGlvbnMgPSB7Y291bnRyeTogdGhpcy5vcHRpb25zLmNvdW50cnl9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLmF1dG9jb21wbGV0ZSA9IG5ldyBnb29nbGUubWFwcy5wbGFjZXMuQXV0b2NvbXBsZXRlKFxyXG4gICAgICAgIHRoaXMuaW5wdXQsIG9wdGlvbnNcclxuICAgICAgKTtcclxuXHJcbiAgICAgIHRoaXMuZ2VvY29kZXIgPSBuZXcgZ29vZ2xlLm1hcHMuR2VvY29kZXIoKTtcclxuXHJcbiAgICAgIC8vIEJpbmQgYXV0b2NvbXBsZXRlIHRvIG1hcCBib3VuZHMgYnV0IG9ubHkgaWYgdGhlcmUgaXMgYSBtYXBcclxuICAgICAgLy8gYW5kIGBvcHRpb25zLmJpbmRUb01hcGAgaXMgc2V0IHRvIHRydWUuXHJcbiAgICAgIGlmICh0aGlzLm1hcCAmJiB0aGlzLm9wdGlvbnMuYm91bmRzID09PSB0cnVlKXtcclxuICAgICAgICB0aGlzLmF1dG9jb21wbGV0ZS5iaW5kVG8oJ2JvdW5kcycsIHRoaXMubWFwKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gV2F0Y2ggYHBsYWNlX2NoYW5nZWRgIGV2ZW50cyBvbiB0aGUgYXV0b2NvbXBsZXRlIGlucHV0IGZpZWxkLlxyXG4gICAgICBnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcihcclxuICAgICAgICB0aGlzLmF1dG9jb21wbGV0ZSxcclxuICAgICAgICAncGxhY2VfY2hhbmdlZCcsXHJcbiAgICAgICAgJC5wcm94eSh0aGlzLnBsYWNlQ2hhbmdlZCwgdGhpcylcclxuICAgICAgKTtcclxuXHJcbiAgICAgIC8vIFByZXZlbnQgcGFyZW50IGZvcm0gZnJvbSBiZWluZyBzdWJtaXR0ZWQgaWYgdXNlciBoaXQgZW50ZXIuXHJcbiAgICAgIHRoaXMuJGlucHV0LmtleXByZXNzKGZ1bmN0aW9uKGV2ZW50KXtcclxuICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpeyByZXR1cm4gZmFsc2U7IH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBMaXN0ZW4gZm9yIFwiZ2VvY29kZVwiIGV2ZW50cyBhbmQgdHJpZ2dlciBmaW5kIGFjdGlvbi5cclxuICAgICAgdGhpcy4kaW5wdXQuYmluZChcImdlb2NvZGVcIiwgJC5wcm94eShmdW5jdGlvbigpe1xyXG4gICAgICAgIHRoaXMuZmluZCgpO1xyXG4gICAgICB9LCB0aGlzKSk7XHJcblxyXG4gICAgICAvLyBUcmlnZ2VyIGZpbmQgYWN0aW9uIHdoZW4gaW5wdXQgZWxlbWVudCBpcyBibHVyZWQgb3V0LlxyXG4gICAgICAvLyAoVXNlZnVsbCBmb3IgdHlwaW5nIHBhcnRpYWwgbG9jYXRpb24gYW5kIHRhYmluZyB0byB0aGUgbmV4dCBmaWVsZFxyXG4gICAgICAvLyBvciBjbGlja2luZyBzb21ld2hlcmUgZWxzZS4pXHJcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYmx1ciA9PT0gdHJ1ZSl7XHJcbiAgICAgICAgdGhpcy4kaW5wdXQuYmx1cigkLnByb3h5KGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICB0aGlzLmZpbmQoKTtcclxuICAgICAgICB9LCB0aGlzKSk7XHJcbiAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLy8gUHJlcGFyZSBhIGdpdmVuIERPTSBzdHJ1Y3R1cmUgdG8gYmUgcG9wdWxhdGVkIHdoZW4gd2UgZ290IHNvbWUgZGF0YS5cclxuICAgIC8vIFRoaXMgd2lsbCBjeWNsZSB0aHJvdWdoIHRoZSBsaXN0IG9mIGNvbXBvbmVudCB0eXBlcyBhbmQgbWFwIHRoZVxyXG4gICAgLy8gY29ycmVzcG9uZGluZyBlbGVtZW50cy5cclxuICAgIGluaXREZXRhaWxzOiBmdW5jdGlvbigpe1xyXG4gICAgICBpZiAoIXRoaXMub3B0aW9ucy5kZXRhaWxzKXsgcmV0dXJuOyB9XHJcblxyXG4gICAgICB2YXIgJGRldGFpbHMgPSAkKHRoaXMub3B0aW9ucy5kZXRhaWxzKSxcclxuICAgICAgICBhdHRyaWJ1dGUgPSB0aGlzLm9wdGlvbnMuZGV0YWlsc0F0dHJpYnV0ZSxcclxuICAgICAgICBkZXRhaWxzID0ge307XHJcblxyXG4gICAgICBmdW5jdGlvbiBzZXREZXRhaWwodmFsdWUpe1xyXG4gICAgICAgIGRldGFpbHNbdmFsdWVdID0gJGRldGFpbHMuZmluZChcIltcIiArICBhdHRyaWJ1dGUgKyBcIj1cIiArIHZhbHVlICsgXCJdXCIpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAkLmVhY2goY29tcG9uZW50VHlwZXMsIGZ1bmN0aW9uKGluZGV4LCBrZXkpe1xyXG4gICAgICAgIHNldERldGFpbChrZXkpO1xyXG4gICAgICAgIHNldERldGFpbChrZXkgKyBcIl9zaG9ydFwiKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAkLmVhY2gocGxhY2VzRGV0YWlscywgZnVuY3Rpb24oaW5kZXgsIGtleSl7XHJcbiAgICAgICAgc2V0RGV0YWlsKGtleSk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgdGhpcy4kZGV0YWlscyA9ICRkZXRhaWxzO1xyXG4gICAgICB0aGlzLmRldGFpbHMgPSBkZXRhaWxzO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBTZXQgdGhlIGluaXRpYWwgbG9jYXRpb24gb2YgdGhlIHBsdWdpbiBpZiB0aGUgYGxvY2F0aW9uYCBvcHRpb25zIHdhcyBzZXQuXHJcbiAgICAvLyBUaGlzIG1ldGhvZCB3aWxsIGNhcmUgYWJvdXQgY29udmVydGluZyB0aGUgdmFsdWUgaW50byB0aGUgcmlnaHQgZm9ybWF0LlxyXG4gICAgaW5pdExvY2F0aW9uOiBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgIHZhciBsb2NhdGlvbiA9IHRoaXMub3B0aW9ucy5sb2NhdGlvbiwgbGF0TG5nO1xyXG5cclxuICAgICAgaWYgKCFsb2NhdGlvbikgeyByZXR1cm47IH1cclxuXHJcbiAgICAgIGlmICh0eXBlb2YgbG9jYXRpb24gPT0gJ3N0cmluZycpIHtcclxuICAgICAgICB0aGlzLmZpbmQobG9jYXRpb24pO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGxvY2F0aW9uIGluc3RhbmNlb2YgQXJyYXkpIHtcclxuICAgICAgICBsYXRMbmcgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGxvY2F0aW9uWzBdLCBsb2NhdGlvblsxXSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChsb2NhdGlvbiBpbnN0YW5jZW9mIGdvb2dsZS5tYXBzLkxhdExuZyl7XHJcbiAgICAgICAgbGF0TG5nID0gbG9jYXRpb247XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChsYXRMbmcpe1xyXG4gICAgICAgIGlmICh0aGlzLm1hcCl7IHRoaXMubWFwLnNldENlbnRlcihsYXRMbmcpOyB9XHJcbiAgICAgICAgaWYgKHRoaXMubWFya2VyKXsgdGhpcy5tYXJrZXIuc2V0UG9zaXRpb24obGF0TG5nKTsgfVxyXG4gICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIExvb2sgdXAgYSBnaXZlbiBhZGRyZXNzLiBJZiBubyBgYWRkcmVzc2Agd2FzIHNwZWNpZmllZCBpdCB1c2VzXHJcbiAgICAvLyB0aGUgY3VycmVudCB2YWx1ZSBvZiB0aGUgaW5wdXQuXHJcbiAgICBmaW5kOiBmdW5jdGlvbihhZGRyZXNzKXtcclxuICAgICAgdGhpcy5nZW9jb2RlKHtcclxuICAgICAgICBhZGRyZXNzOiBhZGRyZXNzIHx8IHRoaXMuJGlucHV0LnZhbCgpXHJcbiAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBSZXF1ZXN0cyBkZXRhaWxzIGFib3V0IGEgZ2l2ZW4gbG9jYXRpb24uXHJcbiAgICAvLyBBZGRpdGlvbmFsbHkgaXQgd2lsbCBiaWFzIHRoZSByZXF1ZXN0cyB0byB0aGUgcHJvdmlkZWQgYm91bmRzLlxyXG4gICAgZ2VvY29kZTogZnVuY3Rpb24ocmVxdWVzdCl7XHJcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYm91bmRzICYmICFyZXF1ZXN0LmJvdW5kcyl7XHJcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5ib3VuZHMgPT09IHRydWUpe1xyXG4gICAgICAgICAgcmVxdWVzdC5ib3VuZHMgPSB0aGlzLm1hcCAmJiB0aGlzLm1hcC5nZXRCb3VuZHMoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgcmVxdWVzdC5ib3VuZHMgPSB0aGlzLm9wdGlvbnMuYm91bmRzO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5jb3VudHJ5KXtcclxuICAgICAgICByZXF1ZXN0LnJlZ2lvbiA9IHRoaXMub3B0aW9ucy5jb3VudHJ5O1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLmdlb2NvZGVyLmdlb2NvZGUocmVxdWVzdCwgJC5wcm94eSh0aGlzLmhhbmRsZUdlb2NvZGUsIHRoaXMpKTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gR2V0IHRoZSBzZWxlY3RlZCByZXN1bHQuIElmIG5vIHJlc3VsdCBpcyBzZWxlY3RlZCBvbiB0aGUgbGlzdCwgdGhlbiBnZXRcclxuICAgIC8vIHRoZSBmaXJzdCByZXN1bHQgZnJvbSB0aGUgbGlzdC5cclxuICAgIHNlbGVjdEZpcnN0UmVzdWx0OiBmdW5jdGlvbigpIHtcclxuICAgICAgLy8kKFwiLnBhYy1jb250YWluZXJcIikuaGlkZSgpO1xyXG5cclxuICAgICAgdmFyIHNlbGVjdGVkID0gJyc7XHJcbiAgICAgIC8vIENoZWNrIGlmIGFueSByZXN1bHQgaXMgc2VsZWN0ZWQuXHJcbiAgICAgIGlmICgkKFwiLnBhYy1pdGVtLXNlbGVjdGVkXCIpWycwJ10pIHtcclxuICAgICAgICBzZWxlY3RlZCA9ICctc2VsZWN0ZWQnO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBHZXQgdGhlIGZpcnN0IHN1Z2dlc3Rpb24ncyB0ZXh0LlxyXG4gICAgICB2YXIgJHNwYW4xID0gJChcIi5wYWMtY29udGFpbmVyIC5wYWMtaXRlbVwiICsgc2VsZWN0ZWQgKyBcIjpmaXJzdCBzcGFuOm50aC1jaGlsZCgyKVwiKS50ZXh0KCk7XHJcbiAgICAgIHZhciAkc3BhbjIgPSAkKFwiLnBhYy1jb250YWluZXIgLnBhYy1pdGVtXCIgKyBzZWxlY3RlZCArIFwiOmZpcnN0IHNwYW46bnRoLWNoaWxkKDMpXCIpLnRleHQoKTtcclxuXHJcbiAgICAgIC8vIEFkZHMgdGhlIGFkZGl0aW9uYWwgaW5mb3JtYXRpb24sIGlmIGF2YWlsYWJsZS5cclxuICAgICAgdmFyIGZpcnN0UmVzdWx0ID0gJHNwYW4xO1xyXG4gICAgICBpZiAoJHNwYW4yKSB7XHJcbiAgICAgICAgZmlyc3RSZXN1bHQgKz0gXCIgLSBcIiArICRzcGFuMjtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy4kaW5wdXQudmFsKGZpcnN0UmVzdWx0KTtcclxuXHJcbiAgICAgIHJldHVybiBmaXJzdFJlc3VsdDtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gSGFuZGxlcyB0aGUgZ2VvY29kZSByZXNwb25zZS4gSWYgbW9yZSB0aGFuIG9uZSByZXN1bHRzIHdhcyBmb3VuZFxyXG4gICAgLy8gaXQgdHJpZ2dlcnMgdGhlIFwiZ2VvY29kZTptdWx0aXBsZVwiIGV2ZW50cy4gSWYgdGhlcmUgd2FzIGFuIGVycm9yXHJcbiAgICAvLyB0aGUgXCJnZW9jb2RlOmVycm9yXCIgZXZlbnQgaXMgZmlyZWQuXHJcbiAgICBoYW5kbGVHZW9jb2RlOiBmdW5jdGlvbihyZXN1bHRzLCBzdGF0dXMpe1xyXG4gICAgICBpZiAoc3RhdHVzID09PSBnb29nbGUubWFwcy5HZW9jb2RlclN0YXR1cy5PSykge1xyXG4gICAgICAgIHZhciByZXN1bHQgPSByZXN1bHRzWzBdO1xyXG4gICAgICAgIHRoaXMuJGlucHV0LnZhbChyZXN1bHQuZm9ybWF0dGVkX2FkZHJlc3MpO1xyXG4gICAgICAgIHRoaXMudXBkYXRlKHJlc3VsdCk7XHJcblxyXG4gICAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA+IDEpe1xyXG4gICAgICAgICAgdGhpcy50cmlnZ2VyKFwiZ2VvY29kZTptdWx0aXBsZVwiLCByZXN1bHRzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMudHJpZ2dlcihcImdlb2NvZGU6ZXJyb3JcIiwgc3RhdHVzKTtcclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvLyBUcmlnZ2VycyBhIGdpdmVuIGBldmVudGAgd2l0aCBvcHRpb25hbCBgYXJndW1lbnRzYCBvbiB0aGUgaW5wdXQuXHJcbiAgICB0cmlnZ2VyOiBmdW5jdGlvbihldmVudCwgYXJndW1lbnQpe1xyXG4gICAgICB0aGlzLiRpbnB1dC50cmlnZ2VyKGV2ZW50LCBbYXJndW1lbnRdKTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gU2V0IHRoZSBtYXAgdG8gYSBuZXcgY2VudGVyIGJ5IHBhc3NpbmcgYSBgZ2VvbWV0cnlgLlxyXG4gICAgLy8gSWYgdGhlIGdlb21ldHJ5IGhhcyBhIHZpZXdwb3J0LCB0aGUgbWFwIHpvb21zIG91dCB0byBmaXQgdGhlIGJvdW5kcy5cclxuICAgIC8vIEFkZGl0aW9uYWxseSBpdCB1cGRhdGVzIHRoZSBtYXJrZXIgcG9zaXRpb24uXHJcbiAgICBjZW50ZXI6IGZ1bmN0aW9uKGdlb21ldHJ5KXtcclxuXHJcbiAgICAgIGlmIChnZW9tZXRyeS52aWV3cG9ydCl7XHJcbiAgICAgICAgdGhpcy5tYXAuZml0Qm91bmRzKGdlb21ldHJ5LnZpZXdwb3J0KTtcclxuICAgICAgICBpZiAodGhpcy5tYXAuZ2V0Wm9vbSgpID4gdGhpcy5vcHRpb25zLm1heFpvb20pe1xyXG4gICAgICAgICAgdGhpcy5tYXAuc2V0Wm9vbSh0aGlzLm9wdGlvbnMubWF4Wm9vbSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMubWFwLnNldFpvb20odGhpcy5vcHRpb25zLm1heFpvb20pO1xyXG4gICAgICAgIHRoaXMubWFwLnNldENlbnRlcihnZW9tZXRyeS5sb2NhdGlvbik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh0aGlzLm1hcmtlcil7XHJcbiAgICAgICAgdGhpcy5tYXJrZXIuc2V0UG9zaXRpb24oZ2VvbWV0cnkubG9jYXRpb24pO1xyXG4gICAgICAgIHRoaXMubWFya2VyLnNldEFuaW1hdGlvbih0aGlzLm9wdGlvbnMubWFya2VyT3B0aW9ucy5hbmltYXRpb24pO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFVwZGF0ZSB0aGUgZWxlbWVudHMgYmFzZWQgb24gYSBzaW5nbGUgcGxhY2VzIG9yIGdlb29jb2RpbmcgcmVzcG9uc2VcclxuICAgIC8vIGFuZCB0cmlnZ2VyIHRoZSBcImdlb2NvZGU6cmVzdWx0XCIgZXZlbnQgb24gdGhlIGlucHV0LlxyXG4gICAgdXBkYXRlOiBmdW5jdGlvbihyZXN1bHQpe1xyXG5cclxuICAgICAgaWYgKHRoaXMubWFwKXtcclxuICAgICAgICB0aGlzLmNlbnRlcihyZXN1bHQuZ2VvbWV0cnkpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAodGhpcy4kZGV0YWlscyl7XHJcbiAgICAgICAgdGhpcy5maWxsRGV0YWlscyhyZXN1bHQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLnRyaWdnZXIoXCJnZW9jb2RlOnJlc3VsdFwiLCByZXN1bHQpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBQb3B1bGF0ZSB0aGUgcHJvdmlkZWQgZWxlbWVudHMgd2l0aCBuZXcgYHJlc3VsdGAgZGF0YS5cclxuICAgIC8vIFRoaXMgd2lsbCBsb29rdXAgYWxsIGVsZW1lbnRzIHRoYXQgaGFzIGFuIGF0dHJpYnV0ZSB3aXRoIHRoZSBnaXZlblxyXG4gICAgLy8gY29tcG9uZW50IHR5cGUuXHJcbiAgICBmaWxsRGV0YWlsczogZnVuY3Rpb24ocmVzdWx0KXtcclxuXHJcbiAgICAgIHZhciBkYXRhID0ge30sXHJcbiAgICAgICAgZ2VvbWV0cnkgPSByZXN1bHQuZ2VvbWV0cnksXHJcbiAgICAgICAgdmlld3BvcnQgPSBnZW9tZXRyeS52aWV3cG9ydCxcclxuICAgICAgICBib3VuZHMgPSBnZW9tZXRyeS5ib3VuZHM7XHJcblxyXG4gICAgICAvLyBDcmVhdGUgYSBzaW1wbGlmaWVkIHZlcnNpb24gb2YgdGhlIGFkZHJlc3MgY29tcG9uZW50cy5cclxuICAgICAgJC5lYWNoKHJlc3VsdC5hZGRyZXNzX2NvbXBvbmVudHMsIGZ1bmN0aW9uKGluZGV4LCBvYmplY3Qpe1xyXG4gICAgICAgIHZhciBuYW1lID0gb2JqZWN0LnR5cGVzWzBdO1xyXG4gICAgICAgIGRhdGFbbmFtZV0gPSBvYmplY3QubG9uZ19uYW1lO1xyXG4gICAgICAgIGRhdGFbbmFtZSArIFwiX3Nob3J0XCJdID0gb2JqZWN0LnNob3J0X25hbWU7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQWRkIHByb3BlcnRpZXMgb2YgdGhlIHBsYWNlcyBkZXRhaWxzLlxyXG4gICAgICAkLmVhY2gocGxhY2VzRGV0YWlscywgZnVuY3Rpb24oaW5kZXgsIGtleSl7XHJcbiAgICAgICAgZGF0YVtrZXldID0gcmVzdWx0W2tleV07XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQWRkIGluZm9zIGFib3V0IHRoZSBhZGRyZXNzIGFuZCBnZW9tZXRyeS5cclxuICAgICAgJC5leHRlbmQoZGF0YSwge1xyXG4gICAgICAgIGZvcm1hdHRlZF9hZGRyZXNzOiByZXN1bHQuZm9ybWF0dGVkX2FkZHJlc3MsXHJcblx0ICAgICAgc3RyZWV0X2FkZHJlc3M6IFtkYXRhLnN0cmVldF9udW1iZXIsIGRhdGEucm91dGVdXHJcblx0XHQgICAgICAuZmlsdGVyKGZ1bmN0aW9uICggdmFsICkge3JldHVybiAnc3RyaW5nJyA9PT0gdHlwZW9mIHZhbDt9KS5qb2luKCcgJyksXHJcbiAgICAgICAgbG9jYXRpb25fdHlwZTogZ2VvbWV0cnkubG9jYXRpb25fdHlwZSB8fCBcIlBMQUNFU1wiLFxyXG4gICAgICAgIHZpZXdwb3J0OiB2aWV3cG9ydCxcclxuICAgICAgICBib3VuZHM6IGJvdW5kcyxcclxuICAgICAgICBsb2NhdGlvbjogZ2VvbWV0cnkubG9jYXRpb24sXHJcbiAgICAgICAgbGF0OiBnZW9tZXRyeS5sb2NhdGlvbi5sYXQoKSxcclxuICAgICAgICBsbmc6IGdlb21ldHJ5LmxvY2F0aW9uLmxuZygpXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gU2V0IHRoZSB2YWx1ZXMgZm9yIGFsbCBkZXRhaWxzLlxyXG4gICAgICAkLmVhY2godGhpcy5kZXRhaWxzLCAkLnByb3h5KGZ1bmN0aW9uKGtleSwgJGRldGFpbCl7XHJcbiAgICAgICAgdmFyIHZhbHVlID0gZGF0YVtrZXldO1xyXG4gICAgICAgIHRoaXMuc2V0RGV0YWlsKCRkZXRhaWwsIHZhbHVlKTtcclxuICAgICAgfSwgdGhpcykpO1xyXG5cclxuICAgICAgdGhpcy5kYXRhID0gZGF0YTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gQXNzaWduIGEgZ2l2ZW4gYHZhbHVlYCB0byBhIHNpbmdsZSBgJGVsZW1lbnRgLlxyXG4gICAgLy8gSWYgdGhlIGVsZW1lbnQgaXMgYW4gaW5wdXQsIHRoZSB2YWx1ZSBpcyBzZXQsIG90aGVyd2lzZSBpdCB1cGRhdGVzXHJcbiAgICAvLyB0aGUgdGV4dCBjb250ZW50LlxyXG4gICAgc2V0RGV0YWlsOiBmdW5jdGlvbigkZWxlbWVudCwgdmFsdWUpe1xyXG5cclxuICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpe1xyXG4gICAgICAgIHZhbHVlID0gXCJcIjtcclxuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUudG9VcmxWYWx1ZSA9PSBcImZ1bmN0aW9uXCIpe1xyXG4gICAgICAgIHZhbHVlID0gdmFsdWUudG9VcmxWYWx1ZSgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoJGVsZW1lbnQuaXMoXCI6aW5wdXRcIikpe1xyXG4gICAgICAgICRlbGVtZW50LnZhbCh2YWx1ZSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgJGVsZW1lbnQudGV4dCh2YWx1ZSk7XHJcbiAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLy8gRmlyZSB0aGUgXCJnZW9jb2RlOmRyYWdnZWRcIiBldmVudCBhbmQgcGFzcyB0aGUgbmV3IHBvc2l0aW9uLlxyXG4gICAgbWFya2VyRHJhZ2dlZDogZnVuY3Rpb24oZXZlbnQpe1xyXG4gICAgICB0aGlzLnRyaWdnZXIoXCJnZW9jb2RlOmRyYWdnZWRcIiwgZXZlbnQubGF0TG5nKTtcclxuICAgIH0sXHJcblxyXG4gICAgbWFwQ2xpY2tlZDogZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICB0aGlzLnRyaWdnZXIoXCJnZW9jb2RlOmNsaWNrXCIsIGV2ZW50LmxhdExuZyk7XHJcbiAgICB9LFxyXG5cclxuICAgIG1hcFpvb21lZDogZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgdGhpcy50cmlnZ2VyKFwiZ2VvY29kZTp6b29tXCIsIHRoaXMubWFwLmdldFpvb20oKSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFJlc3RvcmUgdGhlIG9sZCBwb3NpdGlvbiBvZiB0aGUgbWFya2VyIHRvIHRoZSBsYXN0IG5vdyBsb2NhdGlvbi5cclxuICAgIHJlc2V0TWFya2VyOiBmdW5jdGlvbigpe1xyXG4gICAgICB0aGlzLm1hcmtlci5zZXRQb3NpdGlvbih0aGlzLmRhdGEubG9jYXRpb24pO1xyXG4gICAgICB0aGlzLnNldERldGFpbCh0aGlzLmRldGFpbHMubGF0LCB0aGlzLmRhdGEubG9jYXRpb24ubGF0KCkpO1xyXG4gICAgICB0aGlzLnNldERldGFpbCh0aGlzLmRldGFpbHMubG5nLCB0aGlzLmRhdGEubG9jYXRpb24ubG5nKCkpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBVcGRhdGUgdGhlIHBsdWdpbiBhZnRlciB0aGUgdXNlciBoYXMgc2VsZWN0ZWQgYW4gYXV0b2NvbXBsZXRlIGVudHJ5LlxyXG4gICAgLy8gSWYgdGhlIHBsYWNlIGhhcyBubyBnZW9tZXRyeSBpdCBwYXNzZXMgaXQgdG8gdGhlIGdlb2NvZGVyLlxyXG4gICAgcGxhY2VDaGFuZ2VkOiBmdW5jdGlvbigpe1xyXG4gICAgICB2YXIgcGxhY2UgPSB0aGlzLmF1dG9jb21wbGV0ZS5nZXRQbGFjZSgpO1xyXG5cclxuICAgICAgaWYgKCFwbGFjZSB8fCAhcGxhY2UuZ2VvbWV0cnkpe1xyXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuYXV0b3NlbGVjdCkge1xyXG4gICAgICAgICAgLy8gQXV0b21hdGljYWxseSBzZWxlY3RzIHRoZSBoaWdobGlnaHRlZCBpdGVtIG9yIHRoZSBmaXJzdCBpdGVtIGZyb20gdGhlXHJcbiAgICAgICAgICAvLyBzdWdnZXN0aW9ucyBsaXN0LlxyXG4gICAgICAgICAgdmFyIGF1dG9TZWxlY3Rpb24gPSB0aGlzLnNlbGVjdEZpcnN0UmVzdWx0KCk7XHJcbiAgICAgICAgICB0aGlzLmZpbmQoYXV0b1NlbGVjdGlvbik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIFVzZSB0aGUgaW5wdXQgdGV4dCBpZiBpdCBhbHJlYWR5IGdpdmVzIGdlb21ldHJ5LlxyXG4gICAgICAgIHRoaXMudXBkYXRlKHBsYWNlKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICAvLyBBIHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IuXHJcbiAgLy8gUGFzcyBgb3B0aW9uc2Agd2l0aCBhbGwgc2V0dGluZ3MgdGhhdCBhcmUgZGlmZmVyZW50IGZyb20gdGhlIGRlZmF1bHQuXHJcbiAgLy8gVGhlIGF0dHJpYnV0ZSBpcyB1c2VkIHRvIHByZXZlbnQgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnMgb2YgdGhlIHBsdWdpbi5cclxuICAkLmZuLmdlb2NvbXBsZXRlID0gZnVuY3Rpb24ob3B0aW9ucykge1xyXG5cclxuICAgIHZhciBhdHRyaWJ1dGUgPSAncGx1Z2luX2dlb2NvbXBsZXRlJztcclxuXHJcbiAgICAvLyBJZiB5b3UgY2FsbCBgLmdlb2NvbXBsZXRlKClgIHdpdGggYSBzdHJpbmcgYXMgdGhlIGZpcnN0IHBhcmFtZXRlclxyXG4gICAgLy8gaXQgcmV0dXJucyB0aGUgY29ycmVzcG9uZGluZyBwcm9wZXJ0eSBvciBjYWxscyB0aGUgbWV0aG9kIHdpdGggdGhlXHJcbiAgICAvLyBmb2xsb3dpbmcgYXJndW1lbnRzLlxyXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09IFwic3RyaW5nXCIpe1xyXG5cclxuICAgICAgdmFyIGluc3RhbmNlID0gJCh0aGlzKS5kYXRhKGF0dHJpYnV0ZSkgfHwgJCh0aGlzKS5nZW9jb21wbGV0ZSgpLmRhdGEoYXR0cmlidXRlKSxcclxuICAgICAgICBwcm9wID0gaW5zdGFuY2Vbb3B0aW9uc107XHJcblxyXG4gICAgICBpZiAodHlwZW9mIHByb3AgPT0gXCJmdW5jdGlvblwiKXtcclxuICAgICAgICBwcm9wLmFwcGx5KGluc3RhbmNlLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcclxuICAgICAgICByZXR1cm4gJCh0aGlzKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAyKXtcclxuICAgICAgICAgIHByb3AgPSBhcmd1bWVudHNbMV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBwcm9wO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIFByZXZlbnQgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9ucy5cclxuICAgICAgICB2YXIgaW5zdGFuY2UgPSAkLmRhdGEodGhpcywgYXR0cmlidXRlKTtcclxuICAgICAgICBpZiAoIWluc3RhbmNlKSB7XHJcbiAgICAgICAgICBpbnN0YW5jZSA9IG5ldyBHZW9Db21wbGV0ZSggdGhpcywgb3B0aW9ucyApO1xyXG4gICAgICAgICAgJC5kYXRhKHRoaXMsIGF0dHJpYnV0ZSwgaW5zdGFuY2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQgKTtcclxuIl0sImZpbGUiOiJqcXVlcnkuZ2VvY29tcGxldGUuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
