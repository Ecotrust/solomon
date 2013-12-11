
angular.module('askApp')
    .directive('datePicker', function() {

    return {
        template: '<input class="datepicker" ng-model="answer">',
        restrict: 'EA',
        transclude: true,
        replace: true,
        scope: {
            answer: '=answer'
        },
        link: function (scope, element, attrs) {
            var scroller = element.scroller({
                preset: 'date',
                mode: 'clickpick',
                // theme: 'android-ics light',
                dateFormat : "dd/mm/yy",
                onSelect: function (date) {
                     scope.$apply(function (s) {
                        s.answer = date;    
                    });
                }
            });

            if (scope.answer) {
                console.log(scope.answer);
                scroller.scroller('setValue', scope.answer, true);
            }
        }
    }
});


angular.module('askApp')
    .directive('timePicker', function() {

    return {
        template: '<input class="timepicker">',
        restrict: 'EA',
        transclude: true,
        replace: true,
        scope: {
            answer: '=answer'
        },
        link: function (scope, element, attrs) {
            var scroller = element.scroller({
                preset: 'time',
                mode: 'clickpick',
                // theme: 'android-ics light',
                onSelect: function (date) {
                     scope.$apply(function (s) {
                        s.answer = date;    
                    });
                }
            });

            if (scope.answer) {
                console.log(scope.answer);
                scroller.scroller('setValue', scope.answer, true);
            }

        }
    }
});