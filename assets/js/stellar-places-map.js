'use strict';

(function ($, win, doc, undefined) {

    var app = win.stellarPlaces || {};

    var EventDispatcher = _.extend({}, Backbone.Events);

    app.getCoordinates = function (lat, lng) {
        return new google.maps.LatLng(Number(lat), Number(lng));
    };

    app.models = {
        Place: Backbone.Model.extend({})
    };

    app.collections = {
        Places: Backbone.Collection.extend(
            {
                model: app.models.Place
            }
        )
    };

    app.views = {
        Map: Backbone.View.extend(
            {
                render: function () {

                    var $el = this.$el;
                    var width = $el.width();
                    var mapOptions = $.parseJSON($el.attr('data-stellar-places-map-options'));

                    mapOptions.center = app.getCoordinates(
                        $el.attr('data-stellar-places-map-lat'),
                        $el.attr('data-stellar-places-map-lng')
                    );

                    if (mapOptions.mapTypeId) {
                        mapOptions.mapTypeId = google.maps.MapTypeId[mapOptions.mapTypeId];
                    }

                    var map = new google.maps.Map(this.el, mapOptions);
                    var mapBounds = new google.maps.LatLngBounds();

                    $el.data('map', map);
                    $el.data('mapBounds', mapBounds);

                    var locations = $.parseJSON($el.attr('data-stellar-places-map-locations'));
                    this.collection = new app.collections.Places(locations);

                    var autoZoom = 'true' === $el.attr('data-stellar-places-map-auto-zoom');
                    var displayInfoWindows = 'true' === $el.attr('data-stellar-places-map-info-windows');

                    this.collection.each(
                        function (model) {

                            var position = app.getCoordinates(model.get('latitude'), model.get('longitude'));
                            mapBounds.extend(position);

                            var markerOptions = {
                                map: map,
                                title: model.get('name'),
                                position: position,
                                icon: model.get('icon')
                            };

                            if (!displayInfoWindows) {
                                markerOptions.cursor = 'default';
                            }

                            var marker = new google.maps.Marker(markerOptions);

                            model.set('marker', marker);

                            if (displayInfoWindows) {
                                var content = _.template($('#stellar-places-info-window-template').html())(model.toJSON());

                                marker.infoWindow = new google.maps.InfoWindow({
                                    content: content,
                                    maxWidth: width - 140
                                });

                                google.maps.event.addListener(
                                    marker, 'click', function (e) {
                                        EventDispatcher.trigger('closeAllInfoWindows');
                                        marker.infoWindow.open(map, marker);
                                    }
                                );

                                EventDispatcher.on('closeAllInfoWindows', function () {
                                    marker.infoWindow.close();
                                });

                            }

                        }
                    );

                    $el.data('stellarPlacesMapLocations', this.collection.map(function (model) {
                        return model.toJSON();
                    }));

                    if (this.collection.length) {
                        if (autoZoom) {
                            map.fitBounds(mapBounds);
                        }
                        map.setCenter(mapBounds.getCenter());
                        google.maps.event.addListener(
                            map, 'resize', function () {
                                map.setCenter(mapBounds.getCenter());
                            }
                        );
                    }

                    google.maps.event.addDomListener(
                        win, 'resize', function () {
                            var center = map.getCenter();
                            google.maps.event.trigger(map, 'resize');
                            map.setCenter(center);
                        }
                    );

                    google.maps.event.addListener(
                        map, 'resize', function () {
                            var infoWindow = new google.maps.InfoWindow();
                            width = $el.width();
                            infoWindow.close();
                        }
                    );

                    return this;
                }
            }
        )
    };

    app.initialize = function () {
        $.each(
            $('.stellar-places-map-canvas'), function () {
                new app.views.Map({el: $(this)}).render();
            }
        );
    };

    $(doc).ready(
        function () {
            app.initialize();
        }
    );

})(jQuery, window, document);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzdGVsbGFyLXBsYWNlcy1tYXAuanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xyXG5cclxuKGZ1bmN0aW9uICgkLCB3aW4sIGRvYywgdW5kZWZpbmVkKSB7XHJcblxyXG4gICAgdmFyIGFwcCA9IHdpbi5zdGVsbGFyUGxhY2VzIHx8IHt9O1xyXG5cclxuICAgIHZhciBFdmVudERpc3BhdGNoZXIgPSBfLmV4dGVuZCh7fSwgQmFja2JvbmUuRXZlbnRzKTtcclxuXHJcbiAgICBhcHAuZ2V0Q29vcmRpbmF0ZXMgPSBmdW5jdGlvbiAobGF0LCBsbmcpIHtcclxuICAgICAgICByZXR1cm4gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhOdW1iZXIobGF0KSwgTnVtYmVyKGxuZykpO1xyXG4gICAgfTtcclxuXHJcbiAgICBhcHAubW9kZWxzID0ge1xyXG4gICAgICAgIFBsYWNlOiBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe30pXHJcbiAgICB9O1xyXG5cclxuICAgIGFwcC5jb2xsZWN0aW9ucyA9IHtcclxuICAgICAgICBQbGFjZXM6IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBtb2RlbDogYXBwLm1vZGVscy5QbGFjZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgKVxyXG4gICAgfTtcclxuXHJcbiAgICBhcHAudmlld3MgPSB7XHJcbiAgICAgICAgTWFwOiBCYWNrYm9uZS5WaWV3LmV4dGVuZChcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgcmVuZGVyOiBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciAkZWwgPSB0aGlzLiRlbDtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgd2lkdGggPSAkZWwud2lkdGgoKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgbWFwT3B0aW9ucyA9ICQucGFyc2VKU09OKCRlbC5hdHRyKCdkYXRhLXN0ZWxsYXItcGxhY2VzLW1hcC1vcHRpb25zJykpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBtYXBPcHRpb25zLmNlbnRlciA9IGFwcC5nZXRDb29yZGluYXRlcyhcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGVsLmF0dHIoJ2RhdGEtc3RlbGxhci1wbGFjZXMtbWFwLWxhdCcpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZWwuYXR0cignZGF0YS1zdGVsbGFyLXBsYWNlcy1tYXAtbG5nJylcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobWFwT3B0aW9ucy5tYXBUeXBlSWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFwT3B0aW9ucy5tYXBUeXBlSWQgPSBnb29nbGUubWFwcy5NYXBUeXBlSWRbbWFwT3B0aW9ucy5tYXBUeXBlSWRdO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1hcCA9IG5ldyBnb29nbGUubWFwcy5NYXAodGhpcy5lbCwgbWFwT3B0aW9ucyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1hcEJvdW5kcyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmdCb3VuZHMoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgJGVsLmRhdGEoJ21hcCcsIG1hcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgJGVsLmRhdGEoJ21hcEJvdW5kcycsIG1hcEJvdW5kcyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBsb2NhdGlvbnMgPSAkLnBhcnNlSlNPTigkZWwuYXR0cignZGF0YS1zdGVsbGFyLXBsYWNlcy1tYXAtbG9jYXRpb25zJykpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGVjdGlvbiA9IG5ldyBhcHAuY29sbGVjdGlvbnMuUGxhY2VzKGxvY2F0aW9ucyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBhdXRvWm9vbSA9ICd0cnVlJyA9PT0gJGVsLmF0dHIoJ2RhdGEtc3RlbGxhci1wbGFjZXMtbWFwLWF1dG8tem9vbScpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkaXNwbGF5SW5mb1dpbmRvd3MgPSAndHJ1ZScgPT09ICRlbC5hdHRyKCdkYXRhLXN0ZWxsYXItcGxhY2VzLW1hcC1pbmZvLXdpbmRvd3MnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsZWN0aW9uLmVhY2goXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChtb2RlbCkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwb3NpdGlvbiA9IGFwcC5nZXRDb29yZGluYXRlcyhtb2RlbC5nZXQoJ2xhdGl0dWRlJyksIG1vZGVsLmdldCgnbG9uZ2l0dWRlJykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFwQm91bmRzLmV4dGVuZChwb3NpdGlvbik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1hcmtlck9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFwOiBtYXAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IG1vZGVsLmdldCgnbmFtZScpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpY29uOiBtb2RlbC5nZXQoJ2ljb24nKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRpc3BsYXlJbmZvV2luZG93cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmtlck9wdGlvbnMuY3Vyc29yID0gJ2RlZmF1bHQnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKG1hcmtlck9wdGlvbnMpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGVsLnNldCgnbWFya2VyJywgbWFya2VyKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGlzcGxheUluZm9XaW5kb3dzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnRlbnQgPSBfLnRlbXBsYXRlKCQoJyNzdGVsbGFyLXBsYWNlcy1pbmZvLXdpbmRvdy10ZW1wbGF0ZScpLmh0bWwoKSkobW9kZWwudG9KU09OKCkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJrZXIuaW5mb1dpbmRvdyA9IG5ldyBnb29nbGUubWFwcy5JbmZvV2luZG93KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDogY29udGVudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4V2lkdGg6IHdpZHRoIC0gMTQwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJrZXIsICdjbGljaycsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBFdmVudERpc3BhdGNoZXIudHJpZ2dlcignY2xvc2VBbGxJbmZvV2luZG93cycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFya2VyLmluZm9XaW5kb3cub3BlbihtYXAsIG1hcmtlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBFdmVudERpc3BhdGNoZXIub24oJ2Nsb3NlQWxsSW5mb1dpbmRvd3MnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmtlci5pbmZvV2luZG93LmNsb3NlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICRlbC5kYXRhKCdzdGVsbGFyUGxhY2VzTWFwTG9jYXRpb25zJywgdGhpcy5jb2xsZWN0aW9uLm1hcChmdW5jdGlvbiAobW9kZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1vZGVsLnRvSlNPTigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGVjdGlvbi5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF1dG9ab29tKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXAuZml0Qm91bmRzKG1hcEJvdW5kcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFwLnNldENlbnRlcihtYXBCb3VuZHMuZ2V0Q2VudGVyKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcihcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcCwgJ3Jlc2l6ZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXAuc2V0Q2VudGVyKG1hcEJvdW5kcy5nZXRDZW50ZXIoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBnb29nbGUubWFwcy5ldmVudC5hZGREb21MaXN0ZW5lcihcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2luLCAncmVzaXplJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNlbnRlciA9IG1hcC5nZXRDZW50ZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdvb2dsZS5tYXBzLmV2ZW50LnRyaWdnZXIobWFwLCAncmVzaXplJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXAuc2V0Q2VudGVyKGNlbnRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcihcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFwLCAncmVzaXplJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGluZm9XaW5kb3cgPSBuZXcgZ29vZ2xlLm1hcHMuSW5mb1dpbmRvdygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGggPSAkZWwud2lkdGgoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZm9XaW5kb3cuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgKVxyXG4gICAgfTtcclxuXHJcbiAgICBhcHAuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAkLmVhY2goXHJcbiAgICAgICAgICAgICQoJy5zdGVsbGFyLXBsYWNlcy1tYXAtY2FudmFzJyksIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIG5ldyBhcHAudmlld3MuTWFwKHtlbDogJCh0aGlzKX0pLnJlbmRlcigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgKTtcclxuICAgIH07XHJcblxyXG4gICAgJChkb2MpLnJlYWR5KFxyXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgYXBwLmluaXRpYWxpemUoKTtcclxuICAgICAgICB9XHJcbiAgICApO1xyXG5cclxufSkoalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50KTsiXSwiZmlsZSI6InN0ZWxsYXItcGxhY2VzLW1hcC5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
