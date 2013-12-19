
angular.module('askApp')
    .directive('printButton', function() {
        return {
            template: '<button id="print_button" class="btn btn-warning" ng-click="print()"><i class="icon-print"></i> Print</button>',
            restrict: 'EA',
            transclude: true,
            replace: true,
            link: function(scope) {
                scope.print = function() { window.print(); };
            }
        }
    }
);
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
