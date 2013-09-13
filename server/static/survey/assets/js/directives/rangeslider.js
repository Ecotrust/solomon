
angular.module('askApp')
    .directive('rangeSlider', function() {

    return {
        template: '<div class="range-slider"></div>',
        restrict: 'EA',
        replace: true,
        transclude: true,
        scope: {
            start: "=start",
            end: "=end"
        },
        link: function (scope, element, attrs) {            
            // initialize slider
            scope.initializeSlider = _.once(function () {
                element.dateRangeSlider({
                    bounds:{
                        min: scope.start,
                        max: scope.end
                    },
                    set: {
                        days: 1
                    }
                });
            });
            

            // listen from updates for the controller
            if (attrs.start) {
                scope.$watch('start', function (newStart) {
                    if (newStart) {
                        scope.initializeSlider();
                        element.dateRangeSlider("min", newStart);    
                    }
                    
                });
            }
            if (attrs.end) {
                scope.$watch('end', function (newEnd) {
                    if (newEnd) {
                        scope.initializeSlider();
                        element.dateRangeSlider("max", newEnd);      
                    }
                    
                });
                
            }

            // bind change event
            element.bind("userValuesChanged", function(e, data){
                scope.$apply(function(s) {
                    if (attrs.start) {
                        s.start = data.values.min.clearTime();
                    }
                    if (attrs.end) {                    
                        s.end = data.values.max.clearTime();
                    }
                });
            });
        }
    }
});